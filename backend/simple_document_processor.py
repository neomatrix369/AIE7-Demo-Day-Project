# -*- coding: utf-8 -*-
import os
import logging
import csv
from typing import List, Dict, Any
from pathlib import Path
import gc
from logging_config import setup_logging
from joblib import Memory

from qdrant_client.http.models import Distance, VectorParams
from qdrant_client import QdrantClient, models
from langchain_community.vectorstores import Qdrant
from langchain_qdrant import QdrantVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import DirectoryLoader, PyMuPDFLoader
from langchain_community.document_loaders import CSVLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Set up logging
logger = setup_logging(__name__)

# Set up caching
CACHE_FOLDER = os.getenv("CACHE_FOLDER", "./cache")
cache_memory = Memory(location=CACHE_FOLDER, verbose=0)
logger.info(f"💾 Cache location: {CACHE_FOLDER}")

DEFAULT_FOLDER_LOCATION = "../data/"
TEXT_EMBEDDINGS_MODEL = "text-embedding-3-small"
TEXT_EMBEDDINGS_MODEL_PROVIDER = "OpenAI"

@cache_memory.cache
def get_cached_corpus_stats(data_folder: str) -> Dict[str, Any]:
    """
    Cached method to compute corpus statistics without recreating vector store.
    This is cached to avoid expensive recomputation on every API call.
    """
    logger.info("🧮 Computing corpus statistics (cached)")
    
    # Load documents for stats only - no vector store creation
    from langchain_community.document_loaders import CSVLoader, DirectoryLoader, PyMuPDFLoader
    
    # Load CSV data
    csv_path = os.path.join(data_folder, "complaints.csv")
    csv_docs = []
    if os.path.exists(csv_path):
        try:
            loader = CSVLoader(
                file_path=csv_path,
                metadata_columns=[
                    "Date received", "Product", "Sub-product", "Issue", "Sub-issue",
                    "Consumer complaint narrative", "Company", "State", "ZIP code", "Complaint ID"
                ]
            )
            csv_data = loader.load()
            
            # Apply same filtering as main method
            for doc in csv_data:
                narrative = doc.metadata.get("Consumer complaint narrative", "").strip()
                if len(narrative) >= 100 and narrative.count("XXXX") <= 5 and narrative not in ["", "None", "N/A"]:
                    csv_docs.append(doc)
        except Exception as e:
            logger.warning(f"Could not load CSV for stats: {e}")
    
    # Load PDF data
    pdf_docs = []
    if os.path.exists(data_folder):
        try:
            loader = DirectoryLoader(data_folder, glob="*.pdf", loader_cls=PyMuPDFLoader)
            pdf_docs = loader.load()
        except Exception as e:
            logger.warning(f"Could not load PDFs for stats: {e}")
    
    total_docs = len(pdf_docs) + len(csv_docs)
    
    if total_docs == 0:
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
    
    # Calculate statistics without creating vector store
    total_content_length = sum(len(getattr(doc, 'page_content', '')) for doc in csv_docs + pdf_docs)
    total_size_mb = total_content_length / (1024 * 1024)
    avg_doc_length = total_content_length // total_docs if total_docs > 0 else 0
    estimated_chunks = max(total_docs, total_content_length // 750)
    
    logger.info(f"📊 Stats computed: {total_docs} docs, {estimated_chunks} chunks")
    
    return {
        "corpus_loaded": True,
        "document_count": total_docs,
        "chunk_count": estimated_chunks,
        "embedding_model": f"{TEXT_EMBEDDINGS_MODEL} ({TEXT_EMBEDDINGS_MODEL_PROVIDER})",
        "corpus_metadata": {
            "total_size_mb": round(total_size_mb, 2),
            "document_types": {"pdf": len(pdf_docs), "csv": len(csv_docs)},
            "avg_doc_length": avg_doc_length
        }
    }

class SimpleDocumentProcessor:
    """Simple document processor for corpus quality assessment without heavy dependencies."""

    def __init__(self):
        self.embedding = embeddings = OpenAIEmbeddings(model=TEXT_EMBEDDINGS_MODEL)
        self.data_folder = os.getenv("DATA_FOLDER")

        if not os.path.exists(self.data_folder):
            self.data_folder = "../" + DEFAULT_FOLDER_LOCATION

        if not os.path.exists(self.data_folder):
            self.data_folder = os.path.join(os.path.dirname(__file__), "../data/")
        
        logger.info(f"📁 Data folder: {self.data_folder}")

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
            loader = CSVLoader(
                file_path=f"{csv_path}",
                metadata_columns=[
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
                ],
            )

            logger.info(f"📊 Loading student loan complaints from: {csv_path}")

            # STEP 1: Load raw data
            loan_complaint_data = loader.load()
            initial_count = len(loan_complaint_data)
            logger.info(f"📋 STEP 1 - Raw CSV loaded: {initial_count:,} records")

            # STEP 2: Set page content from narrative
            for doc in loan_complaint_data:
                doc.page_content = doc.metadata["Consumer complaint narrative"]

            logger.info(
                f"📝 STEP 2 - Page content set: {len(loan_complaint_data):,} records (no change)"
            )

            # STEP 3: Apply quality filters with detailed tracking
            logger.info(f"🔍 STEP 3 - Applying quality filters...")

            filter_stats = {
                "too_short": 0,
                "too_many_xxxx": 0,
                "empty_or_na": 0,
                "multiple_issues": 0,
                "valid": 0,
            }

            filtered_docs = []

            for i, doc in enumerate(loan_complaint_data):
                narrative = doc.metadata.get("Consumer complaint narrative", "")
                issues = []

                # Check each filter condition
                if len(narrative.strip()) < 100:
                    filter_stats["too_short"] += 1
                    issues.append("length")

                if narrative.count("XXXX") > 5:
                    filter_stats["too_many_xxxx"] += 1
                    issues.append("redaction")

                if narrative.strip() in ["", "None", "N/A"]:
                    filter_stats["empty_or_na"] += 1
                    issues.append("empty")

                # Track records with multiple issues
                if len(issues) > 1:
                    filter_stats["multiple_issues"] += 1

                # Keep valid records
                if not issues:
                    filter_stats["valid"] += 1
                    doc.page_content = (
                        f"Customer Issue: {doc.metadata.get('Issue', 'Unknown')}\n"
                    )
                    doc.page_content += f"Product: {doc.metadata.get('Product', 'Unknown')}\n"
                    doc.page_content += f"Complaint Details: {narrative}"
                    filtered_docs.append(doc)

            # Log detailed filter results
            logger.info(f"📊 FILTER RESULTS:")
            logger.info(f"   ❌ Too short (< 100 chars): {filter_stats['too_short']:,}")
            logger.info(f"   ❌ Too many XXXX (> 5): {filter_stats['too_many_xxxx']:,}")
            logger.info(f"   ❌ Empty/None/N/A: {filter_stats['empty_or_na']:,}")
            logger.info(f"   ⚠️  Multiple issues: {filter_stats['multiple_issues']:,}")

            total_filtered = initial_count - len(filtered_docs)
            retention_rate = (len(filtered_docs) / initial_count) * 100

            logger.info(f"📈 SUMMARY:")
            logger.info(f"   ✅ Valid records kept: {len(filtered_docs):,}")
            logger.info(f"   🗑️  Total filtered out: {total_filtered:,}")
            logger.info(f"   📊 Retention rate: {retention_rate:.1f}%")

            gc.collect()
    
            logger.info(f"✅ Loaded {len(filtered_docs)} valid complaint records from CSV")
            return filtered_docs.copy()
        except Exception as e:
            logger.error(f"❌ Error loading CSV: {str(e)}")
            return []

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
        Generate corpus statistics using cached computation to avoid expensive recomputation.
        
        Returns:
            Dictionary with corpus statistics
        """
        logger.info("📊 Getting corpus statistics from cache")
        
        try:
            # Use cached function to avoid expensive document loading and processing
            return get_cached_corpus_stats(self.data_folder)
        except Exception as e:
            logger.error(f"❌ Error getting cached corpus stats: {e}")
            
            # Fallback to basic stats if cache fails
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
        Example:
            >>> chunks = split_documents(combined_docs)
            >>> vector_store = get_vector_store(chunks)
            >>> retriever = vector_store.as_retriever(search_kwargs={"k": 5})
            >>> results = retriever.get_relevant_documents("What is FAFSA?")
            >>> print(f"Found {len(results)} relevant documents")
        """
        logger.info(f"🗃️ Starting Qdrant in-memory database")
        client = QdrantClient(":memory:")

        collection_name = 'student_loan_data'
        logger.info(f"📦 Creating Qdrant collection '{collection_name}'")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
        )

        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        vector_store = QdrantVectorStore(
            client=client,
            collection_name=collection_name,
            embedding=embeddings,
        )

        logger.info(f"⬆️ Adding {len(split_documents)} documents to Qdrant collection")
        # We can now add our documents to our vector store.
        vector_store.add_documents(documents=split_documents)
        logger.info(f"✅ Qdrant vector store ready with {len(split_documents)} documents")
        return vector_store