# -*- coding: utf-8 -*-
import os
import logging
from typing import List, Dict, Any
from datetime import datetime
from managers.document_selection_manager import DocumentSelectionManager
from managers.enhanced_qdrant_manager import EnhancedQdrantManager
from managers.data_manager import DataManager
from managers.chunking_manager import ChunkingStrategyManager
from langchain_openai import OpenAIEmbeddings
from config.settings import (
    CHUNK_STRATEGY, CHUNK_SIZE, CHUNK_OVERLAP, 
    COLLECTION_NAMES, ENV_DEFAULTS
)
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)

class EnhancedDocumentProcessor:
    """Enhanced document processor with selection management and smart ingestion."""

    def __init__(self, data_folder: str = None):
        """Initialize the enhanced document processor."""
        self.data_folder = data_folder or os.getenv("DATA_FOLDER", "./data/")
        self.collection_name = COLLECTION_NAMES['DEFAULT_COLLECTION']
        
        # Initialize managers
        self.qdrant_manager = EnhancedQdrantManager(self.collection_name)
        self.selection_manager = DocumentSelectionManager(self.data_folder, qdrant_manager=self.qdrant_manager)
        self.data_manager = DataManager(self.data_folder)
        self.chunking_manager = ChunkingStrategyManager(
            strategy="recursive",
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )
        
        # Initialize embedding lazily to avoid API key issues at import time
        self._embedding = None
        
        logger.info(f"🚀 Initialized Enhanced Document Processor for folder: {self.data_folder}")

    @property
    def embedding(self):
        """Lazy initialization of OpenAI embeddings."""
        if self._embedding is None:
            try:
                self._embedding = OpenAIEmbeddings(model="text-embedding-3-small")
                logger.info("✅ OpenAI embeddings initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize OpenAI embeddings: {e}")
                raise
        return self._embedding

    def scan_and_update_documents(self) -> Dict[str, Any]:
        """Scan data folder and add new documents to the tracked list."""
        try:
            logger.info("📁 Scanning data folder for new documents...")
            
            # Get current tracked documents
            tracked_docs = set(self.selection_manager.selection_config.get("documents", {}).keys())
            
            # Scan all files in the data folder
            new_documents = []
            for file_path in Path(self.data_folder).rglob("*"):
                if file_path.is_file() and file_path.suffix.lower() in ['.pdf', '.csv', '.txt', '.json']:
                    relative_path = str(file_path.relative_to(self.data_folder))
                    
                    # Skip system files
                    if relative_path in ['document_selection.json', '.DS_Store', 'Thumbs.db', '.gitignore', '.env', 'config.json']:
                        continue
                    
                    # Check if this document is already tracked
                    if relative_path not in tracked_docs:
                        # New document found - add to tracked list
                        success = self.selection_manager.add_document_to_tracking(relative_path)
                        if success:
                            new_documents.append(relative_path)
                            logger.info(f"📄 New document added to tracking: {relative_path}")
            
            summary = self.selection_manager.get_selection_summary()
            logger.info(f"📊 Document load complete: {len(new_documents)} new documents added, {summary}")
            
            return {
                "new_documents_added": len(new_documents),
                "new_document_names": new_documents,
                "summary": summary
            }
        except Exception as e:
            logger.error(f"❌ Failed to load documents: {e}")
            return {}

    def get_document_status(self) -> Dict[str, Any]:
        """Get comprehensive document status information."""
        try:
            # Get selection summary
            selection_summary = self.selection_manager.get_selection_summary()
            
            # Get Qdrant statistics
            qdrant_stats = self.qdrant_manager.get_document_statistics()
            
            # Get detailed document list
            documents = self.selection_manager.scan_data_folder()
            
            return {
                "selection_summary": selection_summary,
                "qdrant_statistics": qdrant_stats,
                "documents": documents,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"❌ Failed to get document status: {e}")
            return {}

    def select_document(self, filename: str) -> bool:
        """Select a document for ingestion."""
        try:
            success = self.selection_manager.select_document(filename)
            if success:
                logger.info(f"✅ Document selected: {filename}")
                # Trigger ingestion if needed
                self._ingest_pending_documents()
            return success
        except Exception as e:
            logger.error(f"❌ Failed to select document {filename}: {e}")
            return False

    def deselect_document(self, filename: str) -> bool:
        """Deselect a document (retain vectors but exclude from search)."""
        try:
            success = self.selection_manager.deselect_document(filename)
            if success:
                # Update Qdrant to mark chunks as deselected
                self.qdrant_manager.update_document_selection_status(filename, False)
                logger.info(f"✅ Document deselected: {filename} (vectors retained)")
            return success
        except Exception as e:
            logger.error(f"❌ Failed to deselect document {filename}: {e}")
            return False

    def ingest_document(self, filename: str) -> bool:
        """Ingest a specific document into the vector store."""
        try:
            logger.info(f"🔄 Starting ingestion for: {filename}")
            
            # Load and process the document
            documents = self._load_document(filename)
            if not documents:
                logger.error(f"❌ Failed to load document: {filename}")
                return False
            
            # Split into chunks
            chunks = self._split_documents(documents)
            if not chunks:
                logger.error(f"❌ Failed to split document: {filename}")
                return False
            
            # Add embeddings
            embedded_chunks = self._add_embeddings(chunks, filename)
            if not embedded_chunks:
                logger.error(f"❌ Failed to embed document: {filename}")
                return False
            
            # Add to Qdrant with selection status
            is_selected = self.selection_manager.selection_config.get("documents", {}).get(filename, {}).get("is_selected", True)
            success = self.qdrant_manager.add_documents_with_selection_status(
                embedded_chunks, filename, is_selected
            )
            
            if success:
                # Mark as ingested in selection config
                self.selection_manager.mark_document_ingested(filename, len(embedded_chunks))
                logger.info(f"✅ Successfully ingested document: {filename} ({len(embedded_chunks)} chunks)")
                return True
            else:
                logger.error(f"❌ Failed to add document to Qdrant: {filename}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to ingest document {filename}: {e}")
            return False

    def _load_document(self, filename: str) -> List[Dict[str, Any]]:
        """Load a specific document based on its type."""
        try:
            file_path = os.path.join(self.data_folder, filename)
            file_extension = filename.lower().split('.')[-1]
            
            if file_extension == 'csv':
                return self.data_manager.load_csv_data(filename)
            elif file_extension == 'pdf':
                # Load PDF using data manager's PDF loading method
                return self.data_manager.load_pdf_data()
            elif file_extension in ['txt', 'json']:
                # Add support for text and JSON files
                return self._load_text_file(file_path)
            else:
                logger.warning(f"⚠️ Unsupported file type: {file_extension}")
                return []
        except Exception as e:
            logger.error(f"❌ Failed to load document {filename}: {e}")
            return []

    def _load_text_file(self, file_path: str) -> List[Dict[str, Any]]:
        """Load a text file as a document."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return [{
                "page_content": content,
                "metadata": {
                    "source": os.path.basename(file_path),
                    "file_type": "text",
                    "ingested_at": datetime.now().isoformat()
                }
            }]
        except Exception as e:
            logger.error(f"❌ Failed to load text file {file_path}: {e}")
            return []

    def _split_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Split documents into chunks."""
        try:
            return self.chunking_manager.split_documents(documents, CHUNK_SIZE, CHUNK_OVERLAP)
        except Exception as e:
            logger.error(f"❌ Failed to split documents: {e}")
            return []

    def _add_embeddings(self, chunks: List[Dict[str, Any]], source_filename: str) -> List[Dict[str, Any]]:
        """Add embeddings to document chunks."""
        try:
            embedded_chunks = []
            for i, chunk in enumerate(chunks):
                # Add embedding
                embedding = self.embedding.embed_query(chunk["page_content"])
                
                # Enhance metadata
                enhanced_chunk = {
                    **chunk,
                    "embedding": embedding,
                    "metadata": {
                        **chunk.get("metadata", {}),
                        "chunk_id": f"{source_filename}_chunk_{i}",
                        "ingested_at": datetime.now().isoformat(),
                        "source": source_filename
                    }
                }
                embedded_chunks.append(enhanced_chunk)
            
            logger.info(f"✅ Added embeddings to {len(embedded_chunks)} chunks")
            return embedded_chunks
        except Exception as e:
            logger.error(f"❌ Failed to add embeddings: {e}")
            return []

    def _ingest_pending_documents(self) -> bool:
        """Ingest all documents that need ingestion."""
        try:
            pending_docs = self.selection_manager.get_documents_needing_ingestion()
            if not pending_docs:
                logger.info("✅ No documents pending ingestion")
                return True
            
            logger.info(f"🔄 Ingesting {len(pending_docs)} pending documents...")
            
            success_count = 0
            for filename in pending_docs:
                if self.ingest_document(filename):
                    success_count += 1
            
            logger.info(f"✅ Successfully ingested {success_count}/{len(pending_docs)} documents")
            return success_count == len(pending_docs)
        except Exception as e:
            logger.error(f"❌ Failed to ingest pending documents: {e}")
            return False

    def reingest_changed_documents(self) -> bool:
        """Re-ingest documents that have changed."""
        try:
            changed_docs = self.selection_manager.get_documents_needing_reingestion()
            if not changed_docs:
                logger.info("✅ No documents need re-ingestion")
                return True
            
            logger.info(f"🔄 Re-ingesting {len(changed_docs)} changed documents...")
            
            success_count = 0
            for filename in changed_docs:
                # Delete existing chunks first
                self.qdrant_manager.delete_document_chunks(filename)
                
                # Re-ingest
                if self.ingest_document(filename):
                    success_count += 1
            
            logger.info(f"✅ Successfully re-ingested {success_count}/{len(changed_docs)} documents")
            return success_count == len(changed_docs)
        except Exception as e:
            logger.error(f"❌ Failed to re-ingest changed documents: {e}")
            return False

    def search_documents(self, query: str, limit: int = 10, 
                        filter_selected: bool = True) -> List[Dict[str, Any]]:
        """Search documents with optional selection filter."""
        try:
            # Get query embedding
            query_embedding = self.embedding.embed_query(query)
            
            # Search with selection filter
            results = self.qdrant_manager.search_with_selection_filter(
                query_embedding, limit, filter_selected
            )
            
            logger.info(f"🔍 Search returned {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"❌ Search failed: {e}")
            return []

    def get_active_documents(self) -> List[Dict[str, Any]]:
        """Get all currently active (selected) documents."""
        try:
            return self.qdrant_manager.get_active_documents(filter_selected=True)
        except Exception as e:
            logger.error(f"❌ Failed to get active documents: {e}")
            return []


    def force_rebuild_collection(self) -> bool:
        """Force rebuild the entire collection."""
        try:
            logger.warning("⚠️ Force rebuilding collection - this will delete all existing data")
            
            # Delete and recreate collection
            self.qdrant_manager.delete_collection_chunks()
            self.qdrant_manager._ensure_collection_exists()
            
            # Reset all documents as not ingested
            for filename in self.selection_manager.selection_config.get("documents", {}):
                self.selection_manager.selection_config["documents"][filename]["is_ingested"] = False
            
            # Ingest all selected documents
            return self._ingest_pending_documents()
        except Exception as e:
            logger.error(f"❌ Failed to force rebuild collection: {e}")
            return False
