# -*- coding: utf-8 -*-
import os
import logging
import csv
from typing import List, Dict, Any
from pathlib import Path
import gc
from logging_config import setup_logging

from qdrant_client.http.models import Distance, VectorParams
from qdrant_client import QdrantClient, models
from langchain_community.vectorstores import Qdrant
from langchain_qdrant import QdrantVectorStore
from langchain_openai import OpenAIEmbeddings

from langchain_community.document_loaders import CSVLoader, DirectoryLoader, PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Set up logging
logger = setup_logging(__name__)

DEFAULT_FOLDER_LOCATION = "../data/"
TEXT_EMBEDDINGS_MODEL = "text-embedding-3-small"
TEXT_EMBEDDINGS_MODEL_PROVIDER = "OpenAI"

# Qdrant configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)  # Optional for local instances
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "student_loan_corpus")
VECTOR_SIZE = 1536  # OpenAI text-embedding-3-small dimensions

def get_qdrant_client() -> QdrantClient:
    """
    Create and return a Qdrant client instance.
    
    Returns:
        QdrantClient: Connected Qdrant client
    """
    logger.info(f"🔗 Connecting to Qdrant server at {QDRANT_URL}")
    
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=30  # 30 second timeout for operations
    )
    
    # Test connection
    try:
        collections = client.get_collections()
        logger.info(f"✅ Successfully connected to Qdrant server")
        logger.info(f"📊 Found {len(collections.collections)} existing collections")
    except Exception as e:
        logger.error(f"❌ Failed to connect to Qdrant server: {e}")
        raise
    
    return client

def ensure_collection_exists(client: QdrantClient, collection_name: str) -> bool:
    """
    Ensure the collection exists, create it if it doesn't.
    
    Args:
        client: Qdrant client instance
        collection_name: Name of the collection
        
    Returns:
        bool: True if collection exists or was created successfully
    """
    try:
        # Check if collection exists
        collections = client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        if collection_name in collection_names:
            collection_info = client.get_collection(collection_name)
            logger.info(f"📦 Collection '{collection_name}' exists with {collection_info.points_count} points")
            return True
        
        # Create collection if it doesn't exist
        logger.info(f"📦 Creating new Qdrant collection '{collection_name}'")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        logger.info(f"✅ Successfully created collection '{collection_name}'")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to ensure collection exists: {e}")
        return False

def check_collection_has_documents(client: QdrantClient, collection_name: str, expected_doc_count: int) -> bool:
    """
    Check if the collection already has the expected number of documents.

    Args:
        client: Qdrant client instance
        collection_name: Name of the collection
        expected_doc_count: Expected number of documents/chunks

    Returns:
        bool: True if collection has sufficient documents
    """
    try:
        collection_info = client.get_collection(collection_name)
        existing_count = collection_info.points_count

        # Consider collection populated if it has at least 80% of expected documents
        # This accounts for potential variations in chunking
        threshold = max(1, int(expected_doc_count * 0.8))

        if existing_count >= threshold:
            logger.info(f"✅ Collection '{collection_name}' has {existing_count} documents (expected: {expected_doc_count})")
            return True
        else:
            logger.info(f"📊 Collection '{collection_name}' has {existing_count} documents, need at least {threshold}")
            return False

    except Exception as e:
        logger.warning(f"⚠️ Could not check collection document count: {e}")
        return False

class SimpleDocumentProcessor:
    """Simple document processor for corpus quality assessment with persistent Qdrant storage."""

    def __init__(self):
        self.embedding = OpenAIEmbeddings(model=TEXT_EMBEDDINGS_MODEL)
        self.data_folder = os.getenv("DATA_FOLDER")
        self._vector_store = None
        self._corpus_stats_cache = None  # Cache for corpus statistics
        self._documents_loaded = False   # Track if documents have been loaded

        if not self.data_folder or not os.path.exists(self.data_folder):
            self.data_folder = "../" + DEFAULT_FOLDER_LOCATION

        if not os.path.exists(self.data_folder):
            self.data_folder = os.path.join(os.path.dirname(__file__), "../data/")
        
        logger.info(f"📁 Data folder: {self.data_folder}")
        logger.info(f"🔗 Qdrant server: {QDRANT_URL}")
        logger.info(f"📦 Collection name: {QDRANT_COLLECTION_NAME}")

    def load_csv_data(self, filename: str = "complaints.csv") -> List[Dict[str, Any]]:
        """
        Load CSV data and return as list of dictionaries.
        
        Args:
            filename: CSV file name
            
        Returns:
            List of document dictionaries
        """
        csv_path = os.path.join(self.data_folder, filename)

        if not os.path.exists(csv_path):
            logger.warning(f"⚠️ CSV file not found: {filename}")
            return []

        try:
            raw_documents = self._load_raw_csv_documents(csv_path)
            if not raw_documents:
                return []
            
            self._set_page_content_from_narrative(raw_documents)
            filtered_documents = self._apply_quality_filters(raw_documents)
            
            gc.collect()
            logger.info(f"✅ Loaded {len(filtered_documents)} valid complaint records from CSV")
            return filtered_documents.copy()
        except Exception as e:
            logger.error(f"❌ Error loading CSV: {str(e)}")
            return []
    
    def _get_csv_metadata_columns(self) -> List[str]:
        """
        Get the list of metadata columns for CSV loading.
        
        Returns:
            List of column names to include as metadata
        """
        return [
            "Date received",
            "Product",
            "Sub-product",
            "Issue",
            "Sub-issue",
            "Consumer complaint narrative",
            "Company public response",
            "Company",
            "State",
            "ZIP code",
            "Tags",
            "Consumer consent provided?",
            "Submitted via",
            "Date sent to company",
            "Company response to consumer",
            "Timely response?",
            "Consumer disputed?",
            "Complaint ID",
        ]
    
    def _load_raw_csv_documents(self, csv_path: str) -> List[Dict[str, Any]]:
        """
        Load raw CSV documents using LangChain CSVLoader.
        
        Args:
            csv_path: Path to the CSV file
            
        Returns:
            List of raw document objects
        """
        loader = CSVLoader(
            file_path=csv_path,
            metadata_columns=self._get_csv_metadata_columns()
        )

        logger.info(f"📊 Loading student loan complaints from: {csv_path}")
        loan_complaint_data = loader.load()
        initial_count = len(loan_complaint_data)
        logger.info(f"📋 STEP 1 - Raw CSV loaded: {initial_count:,} records")
        
        return loan_complaint_data
    
    def _set_page_content_from_narrative(self, documents: List[Dict[str, Any]]) -> None:
        """
        Set the page content for each document from the complaint narrative.
        
        Args:
            documents: List of document objects to modify
        """
        for doc in documents:
            doc.page_content = doc.metadata["Consumer complaint narrative"]

        logger.info(
            f"📝 STEP 2 - Page content set: {len(documents):,} records (no change)"
        )
    
    def _validate_complaint_quality(self, narrative: str) -> List[str]:
        """
        Validate the quality of a complaint narrative.
        
        Args:
            narrative: The complaint narrative text
            
        Returns:
            List of quality issues found (empty list if valid)
        """
        issues = []
        
        if len(narrative.strip()) < 100:
            issues.append("length")
        
        if narrative.count("XXXX") > 5:
            issues.append("redaction")
        
        if narrative.strip() in ["", "None", "N/A"]:
            issues.append("empty")
        
        return issues
    
    def _format_valid_document_content(self, doc: Dict[str, Any], narrative: str) -> None:
        """
        Format the page content for a valid document.
        
        Args:
            doc: Document object to format
            narrative: The complaint narrative text
        """
        doc.page_content = (
            f"Customer Issue: {doc.metadata.get('Issue', 'Unknown')}\n"
            f"Product: {doc.metadata.get('Product', 'Unknown')}\n"
            f"Complaint Details: {narrative}"
        )
    
    def _log_filter_results(self, filter_stats: Dict[str, int], initial_count: int, final_count: int) -> None:
        """
        Log detailed filter results and statistics.
        
        Args:
            filter_stats: Dictionary with filter statistics
            initial_count: Initial number of documents
            final_count: Final number of documents after filtering
        """
        logger.info(f"📊 FILTER RESULTS:")
        logger.info(f"   ❌ Too short (< 100 chars): {filter_stats['too_short']:,}")
        logger.info(f"   ❌ Too many XXXX (> 5): {filter_stats['too_many_xxxx']:,}")
        logger.info(f"   ❌ Empty/None/N/A: {filter_stats['empty_or_na']:,}")
        logger.info(f"   ⚠️  Multiple issues: {filter_stats['multiple_issues']:,}")

        total_filtered = initial_count - final_count
        retention_rate = (final_count / initial_count) * 100

        logger.info(f"📈 SUMMARY:")
        logger.info(f"   ✅ Valid records kept: {final_count:,}")
        logger.info(f"   🗑️  Total filtered out: {total_filtered:,}")
        logger.info(f"   📊 Retention rate: {retention_rate:.1f}%")
    
    def _apply_quality_filters(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply quality filters to documents and return valid ones.
        
        Args:
            documents: List of raw documents to filter
            
        Returns:
            List of documents that pass quality filters
        """
        logger.info(f"🔍 STEP 3 - Applying quality filters...")

        filter_stats = {
            "too_short": 0,
            "too_many_xxxx": 0,
            "empty_or_na": 0,
            "multiple_issues": 0,
            "valid": 0,
        }

        filtered_docs = []

        for doc in documents:
            narrative = doc.metadata.get("Consumer complaint narrative", "")
            issues = self._validate_complaint_quality(narrative)

            # Update filter statistics
            if "length" in issues:
                filter_stats["too_short"] += 1
            if "redaction" in issues:
                filter_stats["too_many_xxxx"] += 1
            if "empty" in issues:
                filter_stats["empty_or_na"] += 1
            
            # Track records with multiple issues
            if len(issues) > 1:
                filter_stats["multiple_issues"] += 1

            # Keep valid records
            if not issues:
                filter_stats["valid"] += 1
                self._format_valid_document_content(doc, narrative)
                filtered_docs.append(doc)

        self._log_filter_results(filter_stats, len(documents), len(filtered_docs))
        return filtered_docs

    def load_pdf_data(self) -> List[Dict[str, Any]]:
        """
        Load PDF file metadata (without actual content processing).
        
        Returns:
            List of PDF metadata dictionaries
        """
        pdf_folder = self.data_folder

        if not os.path.exists(pdf_folder):
            logger.warning(f"⚠️ Folder for PDF file(s) not found: {pdf_folder}")
            return []

        logger.info(f"📄 Loading student loan PDFs from: {pdf_folder}")
        loader = DirectoryLoader(pdf_folder, glob="*.pdf", loader_cls=PyMuPDFLoader)
        pdf_files = list(Path(pdf_folder).glob("*.pdf"))
        docs = loader.load()
        gc.collect()
        logger.info(f"✅ Loaded {len(docs)} from {len(pdf_files)} PDF files")
        return docs

    def split_documents(self, documents):
        """
        Split hybrid dataset documents into optimal chunks for vector embedding.

        Args:
            documents (list): List of LangChain Document objects from PDF/CSV loading
                            Typically ~1,100 documents from hybrid dataset

        Returns:
            list: List of chunked Document objects ready for vector embedding
                Typically ~3,000-5,000 chunks depending on source content length

        Example:
            >>> pdf_docs = load_and_prepare_pdf_loan_docs()
            >>> csv_docs = load_and_prepare_csv_loan_docs()
            >>> all_docs = pdf_docs + csv_docs
            >>> chunks = split_documents(all_docs)
            >>> print(f"Split {len(all_docs)} docs into {len(chunks)} chunks")
            >>> print(f"Average chunk size: {sum(len(c.page_content) for c in chunks) / len(chunks):.0f} chars")
        """
        logger.info(
            f"📄 Splitting {len(documents)} documents into chunks (size=750, overlap=100)"
        )
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=750, chunk_overlap=100)
        logger.info(
            f"text_splitter: Chunk Size: {text_splitter._chunk_size} | Chunk Overlap: {text_splitter._chunk_overlap}"
        )
        split_docs = text_splitter.split_documents(documents)
        logger.info(f"✅ Created {len(split_docs)} document chunks")
        return split_docs

    def get_corpus_stats(self) -> Dict[str, Any]:
        """
        Generate corpus statistics with caching to avoid expensive recomputation.
        
        Returns:
            Dictionary with corpus statistics
        """
        # Return cached stats if available
        if self._corpus_stats_cache is not None:
            logger.info("📋 Returning cached corpus statistics")
            return self._corpus_stats_cache

        logger.info("🧮 Computing corpus statistics for the first time")
        
        # Load and process documents
        csv_docs = self.load_csv_data()
        pdf_docs = self.load_pdf_data()
        combined_docs = csv_docs + pdf_docs
        
        # Handle empty corpus case
        if not combined_docs:
            self._corpus_stats_cache = self._create_empty_corpus_stats()
            return self._corpus_stats_cache
        
        # Calculate basic statistics
        stats = self._calculate_corpus_statistics(csv_docs, pdf_docs, combined_docs)
        
        # Initialize vector store if needed
        self._initialize_vector_store_if_needed(combined_docs)
        
        # Cache and return the computed statistics
        self._corpus_stats_cache = self._create_corpus_stats_response(stats, csv_docs, pdf_docs)
        return self._corpus_stats_cache
    
    def _create_empty_corpus_stats(self) -> Dict[str, Any]:
        """
        Create statistics response for empty corpus.
        
        Returns:
            Dictionary with empty corpus statistics
        """
        return {
            "corpus_loaded": False,
            "document_count": 0,
            "chunk_count": 0,
            "embedding_model": "none",
            "corpus_metadata": {
                "total_size_mb": 0.0,
                "document_types": {"pdf": 0, "csv": 0},
                "avg_doc_length": 0
            }
        }
    
    def _calculate_corpus_statistics(self, csv_docs: List[Dict[str, Any]], 
                                   pdf_docs: List[Dict[str, Any]], 
                                   combined_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate basic corpus statistics.
        
        Args:
            csv_docs: List of CSV documents
            pdf_docs: List of PDF documents
            combined_docs: Combined list of all documents
            
        Returns:
            Dictionary with calculated statistics
        """
        total_docs = len(combined_docs)
        total_content_length = sum(len(getattr(doc, 'page_content', '')) for doc in combined_docs)
        total_size_mb = total_content_length / (1024 * 1024)
        avg_doc_length = total_content_length // total_docs if total_docs > 0 else 0
        estimated_chunks = max(total_docs, total_content_length // 750)
        
        logger.info(f"📊 Stats computed: {total_docs} docs, {estimated_chunks} chunks")
        
        return {
            "total_docs": total_docs,
            "total_content_length": total_content_length,
            "total_size_mb": total_size_mb,
            "avg_doc_length": avg_doc_length,
            "estimated_chunks": estimated_chunks
        }
    
    def _initialize_vector_store_if_needed(self, combined_docs: List[Dict[str, Any]]) -> None:
        """
        Initialize vector store if documents haven't been loaded yet.
        
        Args:
            combined_docs: Combined list of all documents
        """
        if self._documents_loaded:
            logger.info("📚 Documents already loaded, skipping vector store initialization")
            return
        
        try:
            client = get_qdrant_client()
            if not ensure_collection_exists(client, QDRANT_COLLECTION_NAME):
                logger.error("❌ Could not ensure collection exists")
                return
            
            # Estimate expected chunk count
            chunks = self.split_documents(combined_docs)
            expected_chunk_count = len(chunks)

            # Check if collection already has sufficient documents
            if check_collection_has_documents(client, QDRANT_COLLECTION_NAME, expected_chunk_count):
                self._connect_to_existing_collection(client)
            else:
                self._load_documents_to_collection(chunks)

            self._documents_loaded = True
            logger.info("✅ Vector store initialized")
            
        except Exception as e:
            logger.error(f"❌ Error initializing vector store: {e}")
    
    def _connect_to_existing_collection(self, client: QdrantClient) -> None:
        """
        Connect to existing Qdrant collection without adding documents.
        
        Args:
            client: Qdrant client instance
        """
        logger.info("🚀 Collection already populated, skipping document loading")
        embeddings = OpenAIEmbeddings(model=TEXT_EMBEDDINGS_MODEL)
        self.vector_store = QdrantVectorStore(
            client=client,
            collection_name=QDRANT_COLLECTION_NAME,
            embedding=embeddings,
        )
    
    def _load_documents_to_collection(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Load documents into the Qdrant collection.
        
        Args:
            chunks: Document chunks to load
        """
        logger.info("📥 Loading documents into vector store")
        self.vector_store = self.get_vector_store(chunks)
    
    def _create_corpus_stats_response(self, stats: Dict[str, Any], 
                                    csv_docs: List[Dict[str, Any]], 
                                    pdf_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create the final corpus statistics response.
        
        Args:
            stats: Calculated statistics
            csv_docs: List of CSV documents
            pdf_docs: List of PDF documents
            
        Returns:
            Complete corpus statistics dictionary
        """
        return {
            "corpus_loaded": True,
            "document_count": stats["total_docs"],
            "chunk_count": stats["estimated_chunks"],
            "embedding_model": f"{TEXT_EMBEDDINGS_MODEL} ({TEXT_EMBEDDINGS_MODEL_PROVIDER})",
            "corpus_metadata": {
                "total_size_mb": round(stats["total_size_mb"], 2),
                "document_types": {"pdf": len(pdf_docs), "csv": len(csv_docs)},
                "avg_doc_length": stats["avg_doc_length"]
            }
        }

    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Simple keyword-based document search.
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of matching documents with scores
        """
        csv_docs = self.load_csv_data()
        pdf_docs = self.load_pdf_metadata()
        all_docs = csv_docs + pdf_docs
        
        if not all_docs:
            return []
        
        query_lower = query.lower()
        query_words = query_lower.split()
        
        # Simple keyword matching with scoring
        results = []
        for doc in all_docs:
            content_lower = doc["content"].lower()
            score = 0
            
            # Count keyword matches
            for word in query_words:
                score += content_lower.count(word)
            
            # Boost score for exact phrase matches
            if query_lower in content_lower:
                score += 5
            
            if score > 0:
                results.append({
                    "content": doc["content"][:500] + "..." if len(doc["content"]) > 500 else doc["content"],
                    "score": score / max(1, len(query_words)),  # Normalize score
                    "metadata": doc["metadata"]
                })
        
        # Sort by score and return top_k
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def get_vector_store(self, split_documents):
        """    
        Create or connect to persistent Qdrant vector store.
        
        Args:
            split_documents: List of chunked documents to add to the store
            
        Returns:
            QdrantVectorStore: Connected vector store instance
            
        Example:
            >>> chunks = split_documents(combined_docs)
            >>> vector_store = get_vector_store(chunks)
            >>> retriever = vector_store.as_retriever(search_kwargs={"k": 5})
            >>> results = retriever.get_relevant_documents("What is FAFSA?")
            >>> print(f"Found {len(results)} relevant documents")
        """
        logger.info(f"🗃️ Connecting to persistent Qdrant server")
        
        # Setup Qdrant client and collection
        client = self._setup_qdrant_client_and_collection()
        
        # Create vector store instance
        vector_store = self._create_vector_store_instance(client)
        
        # Handle document addition if needed
        self._handle_document_addition(client, vector_store, split_documents)
        
        return vector_store
    
    def _setup_qdrant_client_and_collection(self) -> QdrantClient:
        """
        Setup Qdrant client and ensure collection exists.
        
        Returns:
            QdrantClient: Connected Qdrant client
            
        Raises:
            RuntimeError: If collection setup fails
        """
        client = get_qdrant_client()
        
        collection_name = QDRANT_COLLECTION_NAME
        if not ensure_collection_exists(client, collection_name):
            raise RuntimeError(f"Failed to ensure collection '{collection_name}' exists")
        
        return client
    
    def _create_vector_store_instance(self, client: QdrantClient) -> QdrantVectorStore:
        """
        Create a QdrantVectorStore instance.
        
        Args:
            client: Qdrant client instance
            
        Returns:
            QdrantVectorStore: Vector store instance
        """
        embeddings = OpenAIEmbeddings(model=TEXT_EMBEDDINGS_MODEL)
        
        return QdrantVectorStore(
            client=client,
            collection_name=QDRANT_COLLECTION_NAME,
            embedding=embeddings,
        )
    
    def _check_existing_documents(self, client: QdrantClient, split_documents_count: int) -> bool:
        """
        Check if collection already has sufficient documents.
        
        Args:
            client: Qdrant client instance
            split_documents_count: Number of documents to be added
            
        Returns:
            bool: True if collection is already sufficiently populated
        """
        collection_name = QDRANT_COLLECTION_NAME
        collection_info = client.get_collection(collection_name)
        existing_count = collection_info.points_count
        
        if existing_count > 0:
            logger.info(f"📚 Collection '{collection_name}' already contains {existing_count} documents")
            logger.info(f"🔄 Checking if we need to add new documents...")
            
            # For simplicity, if we have documents, assume the collection is populated
            # In a production system, you might want to check document IDs or use versioning
            if existing_count >= split_documents_count:
                logger.info(f"✅ Collection appears to be fully populated, skipping document addition")
                return True
        
        return False
    
    def _add_documents_to_collection(self, client: QdrantClient, vector_store: QdrantVectorStore, 
                                   split_documents: List[Dict[str, Any]]) -> None:
        """
        Add documents to the Qdrant collection.
        
        Args:
            client: Qdrant client instance
            vector_store: Vector store instance
            split_documents: Documents to add
        """
        collection_name = QDRANT_COLLECTION_NAME
        logger.info(f"⬆️ Adding {len(split_documents)} documents to Qdrant collection '{collection_name}'")
        
        vector_store.add_documents(documents=split_documents)
        
        # Verify documents were added
        updated_info = client.get_collection(collection_name)
        logger.info(f"✅ Qdrant vector store ready with {updated_info.points_count} total documents")
    
    def _handle_document_addition(self, client: QdrantClient, vector_store: QdrantVectorStore, 
                                split_documents: List[Dict[str, Any]]) -> None:
        """
        Handle the logic for adding documents to the collection if needed.
        
        Args:
            client: Qdrant client instance
            vector_store: Vector store instance
            split_documents: Documents to potentially add
        """
        if not split_documents:
            logger.warning(f"⚠️ No documents provided to add to vector store")
            return
        
        # Check if we need to add documents
        if self._check_existing_documents(client, len(split_documents)):
            return
        
        # Add documents to the collection
        self._add_documents_to_collection(client, vector_store, split_documents)
