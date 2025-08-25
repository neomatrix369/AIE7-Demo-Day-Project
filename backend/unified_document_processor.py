# -*- coding: utf-8 -*-
import os
import logging
from typing import List, Dict, Any
from datetime import datetime
from pathlib import Path

# Import managers from both processors
from managers.document_selection_manager import DocumentSelectionManager
from managers.enhanced_qdrant_manager import EnhancedQdrantManager
from managers.data_manager import DataManager
from managers.chunking_manager import ChunkingStrategyManager
from managers.corpus_statistics_manager import CorpusStatisticsManager
from managers.vector_store_manager import VectorStoreManager
from managers.search_manager import SearchManager

# Import embeddings and config
from langchain_openai import OpenAIEmbeddings
from config.settings import (
    CHUNK_STRATEGY, CHUNK_SIZE, CHUNK_OVERLAP, 
    COLLECTION_NAMES, ENV_DEFAULTS
)

# Set up logging
logger = logging.getLogger(__name__)

class UnifiedDocumentProcessor:
    """
    Unified document processor that combines functionality from both 
    SimpleDocumentProcessor and EnhancedDocumentProcessor.
    
    This provides:
    - Document selection and management (from EnhancedDocumentProcessor)
    - Corpus statistics and caching (from SimpleDocumentProcessor)
    - Unified search and vector operations
    - Backward compatibility with existing APIs
    """

    def __init__(self, data_folder: str = None):
        """Initialize the unified document processor."""
        self.data_folder = data_folder or os.getenv("DATA_FOLDER", "./data/")
        self.collection_name = COLLECTION_NAMES['DEFAULT_COLLECTION']
        
        # Initialize enhanced managers (from EnhancedDocumentProcessor)
        self.qdrant_manager = EnhancedQdrantManager(self.collection_name)
        self.selection_manager = DocumentSelectionManager(self.data_folder, qdrant_manager=self.qdrant_manager)
        self.data_manager = DataManager(self.data_folder)
        self.chunking_manager = ChunkingStrategyManager(
            strategy="recursive",
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )
        
        # Initialize legacy managers (from SimpleDocumentProcessor) for backward compatibility
        self.corpus_stats_manager = CorpusStatisticsManager()
        # Initialize these lazily to avoid API key issues at import time
        self._vector_store_manager = None
        self._search_manager = None
        
        # State tracking
        self._documents_loaded = False
        self._embedding = None
        
        logger.info(f"🚀 Initialized Unified Document Processor for folder: {self.data_folder}")

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

    @property
    def vector_store_manager(self):
        """Lazy initialization of vector store manager."""
        if self._vector_store_manager is None:
            try:
                self._vector_store_manager = VectorStoreManager(self.qdrant_manager, self.data_manager)
                logger.info("✅ Vector store manager initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize vector store manager: {e}")
                raise
        return self._vector_store_manager

    @property
    def search_manager(self):
        """Lazy initialization of search manager."""
        if self._search_manager is None:
            try:
                self._search_manager = SearchManager(self.data_manager, self.qdrant_manager)
                logger.info("✅ Search manager initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize search manager: {e}")
                raise
        return self._search_manager

    # ============================================================================
    # UNIFIED STATUS METHODS (Combines both processors)
    # ============================================================================

    def get_unified_status(self) -> Dict[str, Any]:
        """
        Get comprehensive unified status including both corpus and selection information.
        This replaces both get_corpus_stats() and get_document_status().
        """
        try:
            # Check database connectivity first
            database_connected = self._check_database_connectivity()
            
            if not database_connected:
                logger.warning("⚠️ Database not connected, returning empty status")
                return {
                    "corpus_loaded": False,
                    "document_count": 0,
                    "chunk_count": 0,
                    "embedding_model": "unknown",
                    "corpus_metadata": {},
                    "selected_chunks": 0,
                    "deselected_chunks": 0,
                    "selection_summary": {},
                    "qdrant_statistics": {},
                    "documents": [],
                    "database_connected": False,
                    "last_updated": datetime.now().isoformat()
                }
            
            # Ensure chunks have selection field before getting statistics
            try:
                self._ensure_chunks_have_selection_field()
            except Exception as e:
                logger.warning(f"⚠️ Could not ensure chunks have selection field: {e}")
            
            # Get Qdrant statistics (this is fast and doesn't load documents)
            qdrant_stats = self.qdrant_manager.get_document_statistics()
            
            # Get selection summary (this is also fast)
            selection_summary = self.selection_manager.get_selection_summary()
            
            # Get basic corpus metadata (this is fast)
            corpus_metadata = self._get_corpus_metadata()
            
            # Get detailed document list (this is fast)
            documents = self.selection_manager.scan_data_folder()
            
            # Determine if corpus is loaded based on chunk count
            corpus_loaded = qdrant_stats.get("total_chunks", 0) > 0
            
            return {
                # Corpus statistics (from SimpleDocumentProcessor) - only selected documents
                "corpus_loaded": corpus_loaded,
                "document_count": selection_summary.get("selected_documents", 0),  # Only selected documents
                "chunk_count": qdrant_stats.get("selected_chunks", 0),  # Only active chunks
                "embedding_model": "text-embedding-3-small (OpenAI)",
                "corpus_metadata": corpus_metadata,
                
                # Selection-aware statistics (from EnhancedDocumentProcessor)
                "selected_chunks": qdrant_stats.get("selected_chunks", 0),
                "deselected_chunks": qdrant_stats.get("deselected_chunks", 0),
                "selection_summary": selection_summary,
                "qdrant_statistics": qdrant_stats,
                
                # Document details
                "documents": documents,
                
                # Database connectivity
                "database_connected": database_connected,
                "last_updated": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"❌ Failed to get unified status: {e}")
            return {
                "corpus_loaded": False,
                "document_count": 0,
                "chunk_count": 0,
                "embedding_model": "unknown",
                "corpus_metadata": {},
                "selected_chunks": 0,
                "deselected_chunks": 0,
                "selection_summary": {},
                "qdrant_statistics": {},
                "documents": [],
                "database_connected": False,
                "last_updated": datetime.now().isoformat()
            }

    def get_corpus_stats(self) -> Dict[str, Any]:
        """
        Legacy method for backward compatibility.
        Returns corpus statistics in the format expected by existing code.
        """
        try:
            # Get unified status
            unified_status = self.get_unified_status()
            
            # Return in legacy format
            return {
                "corpus_loaded": unified_status.get("corpus_loaded", False),
                "document_count": unified_status.get("document_count", 0),
                "chunk_count": unified_status.get("chunk_count", 0),
                "embedding_model": unified_status.get("embedding_model", ""),
                "corpus_metadata": unified_status.get("corpus_metadata", {})
            }
        except Exception as e:
            logger.error(f"❌ Failed to get corpus stats: {e}")
            return {}

    def get_document_status(self) -> Dict[str, Any]:
        """
        Legacy method for backward compatibility.
        Returns document status in the format expected by existing code.
        """
        try:
            # Get unified status
            unified_status = self.get_unified_status()
            
            # Return in legacy format
            return {
                "selection_summary": unified_status.get("selection_summary", {}),
                "qdrant_statistics": unified_status.get("qdrant_statistics", {}),
                "documents": unified_status.get("documents", []),
                "last_updated": unified_status.get("last_updated", "")
            }
        except Exception as e:
            logger.error(f"❌ Failed to get document status: {e}")
            return {}

    # ============================================================================
    # DOCUMENT MANAGEMENT METHODS (from EnhancedDocumentProcessor)
    # ============================================================================

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
            logger.info(f"🔄 Starting deselection process for: {filename}")
            
            # Step 1: Update selection manager
            success = self.selection_manager.deselect_document(filename)
            if not success:
                logger.error(f"❌ Failed to deselect document in selection manager: {filename}")
                return False
            
            logger.info(f"✅ Document deselected in selection manager: {filename}")
            
            # Step 2: Update Qdrant chunks
            update_success = self.qdrant_manager.update_document_selection_status(filename, False)
            if update_success:
                logger.info(f"✅ Document chunks deselected in Qdrant: {filename}")
            else:
                logger.warning(f"⚠️ Document deselected in config but Qdrant update failed: {filename}")
            
            # Step 3: Force refresh chunk selection status to ensure consistency
            logger.info(f"🔄 Refreshing chunk selection status...")
            self._ensure_chunks_have_selection_field()
            
            logger.info(f"✅ Deselection process completed for: {filename}")
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

    def ingest_pending_documents(self) -> bool:
        """Ingest all pending documents."""
        try:
            return self._ingest_pending_documents()
        except Exception as e:
            logger.error(f"❌ Failed to ingest pending documents: {e}")
            return False

    def reingest_changed_documents(self) -> bool:
        """Re-ingest documents that have changed."""
        try:
            return self._reingest_changed_documents()
        except Exception as e:
            logger.error(f"❌ Failed to re-ingest changed documents: {e}")
            return False

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

    def search_documents(self, query: str, limit: int = 10, filter_selected: bool = True) -> List[Dict[str, Any]]:
        """Search documents with optional selection filter."""
        try:
            # Get query embedding
            query_embedding = self.embedding.embed_query(query)
            
            # Search with selection filter
            raw_results = self.qdrant_manager.search_with_selection_filter(
                query_embedding, limit, filter_selected
            )
            
            # Transform results to expected format
            results = []
            for result in raw_results:
                # Convert score to similarity (Qdrant returns cosine similarity as score)
                similarity = result.get("score", 0.0)
                
                # Get document source for title
                document_source = result.get("document_source", "")
                title = document_source if document_source else "Unknown Document"
                
                transformed_result = {
                    "doc_id": result.get("id", ""),
                    "chunk_id": result.get("chunk_id", ""),
                    "content": result.get("content", ""),
                    "similarity": similarity,
                    "title": title,
                    "metadata": result.get("metadata", {}),
                    "document_source": document_source
                }
                results.append(transformed_result)
            
            logger.info(f"🔍 Search returned {len(results)} results")
            return results
        except Exception as e:
            logger.error(f"❌ Search failed: {e}")
            return []

    # ============================================================================
    # LEGACY METHODS (from SimpleDocumentProcessor) for backward compatibility
    # ============================================================================

    def _has_vector_store_data(self) -> bool:
        """Check if the vector store has data without expensive operations."""
        try:
            collection_info = self.qdrant_manager.client.get_collection(self.qdrant_manager.collection_name)
            points_count = collection_info.points_count
            logger.debug(f"📊 Vector store has {points_count} points")
            return points_count > 0
        except Exception as e:
            logger.debug(f"Could not check vector store: {e}")
            return False

    # ============================================================================
    # PRIVATE HELPER METHODS
    # ============================================================================

    def _get_corpus_metadata(self) -> Dict[str, Any]:
        """Get corpus metadata for unified status (only selected documents)."""
        try:
            # Get document types from SELECTED documents only
            document_types = {}
            total_size_mb = 0.0
            selected_doc_count = 0
            
            # Track document types by selection status
            selected_by_type = {}
            deselected_by_type = {}
            
            tracked_documents = self.selection_manager.selection_config.get("documents", {})
            for filename, doc_info in tracked_documents.items():
                file_extension = filename.lower().split('.')[-1]
                is_selected = doc_info.get("is_selected", False)
                
                if is_selected:
                    selected_doc_count += 1
                    document_types[file_extension] = document_types.get(file_extension, 0) + 1
                    selected_by_type[file_extension] = selected_by_type.get(file_extension, 0) + 1
                    
                    # Add file size if available
                    size_bytes = doc_info.get("size_bytes", 0)
                    total_size_mb += size_bytes / (1024 * 1024)
                else:
                    deselected_by_type[file_extension] = deselected_by_type.get(file_extension, 0) + 1
            
            return {
                "total_size_mb": round(total_size_mb, 2),
                "document_types": document_types,
                "avg_doc_length": 1608,  # Default value, could be calculated if needed
                "selected_document_count": selected_doc_count,
                "selected_by_type": selected_by_type,
                "deselected_by_type": deselected_by_type
            }
        except Exception as e:
            logger.error(f"❌ Failed to get corpus metadata: {e}")
            return {
                "total_size_mb": 0.0,
                "document_types": {},
                "avg_doc_length": 0,
                "selected_document_count": 0,
                "selected_by_type": {},
                "deselected_by_type": {}
            }

    def _check_database_connectivity(self) -> bool:
        """Check if the database is connected."""
        try:
            collections = self.qdrant_manager.client.get_collections()
            return True
        except Exception as e:
            logger.warning(f"⚠️ Database connectivity issue: {e}")
            return False
    
    def _ensure_chunks_have_selection_field(self) -> bool:
        """Ensure all chunks have the is_selected field properly set."""
        try:
            # Get all chunks and check if they have is_selected field
            response = self.qdrant_manager.client.scroll(
                collection_name=self.qdrant_manager.collection_name,
                limit=10000,  # Get all chunks
                with_payload=True,
                with_vectors=False
            )
            
            chunks_without_field = 0
            chunks_updated = 0
            
            # Get current selection status
            tracked_documents = self.selection_manager.selection_config.get("documents", {})
            
            for point in response[0]:
                try:
                    # Validate point structure
                    if not hasattr(point, 'id') or not hasattr(point, 'payload'):
                        logger.warning(f"⚠️ Skipping invalid point structure: {point}")
                        continue
                    
                    document_source = point.payload.get("document_source", "")
                    
                    # Check if chunk has is_selected field
                    if "is_selected" not in point.payload:
                        chunks_without_field += 1
                    
                    # Update chunk based on current document selection status
                    if document_source in tracked_documents:
                        expected_selected = tracked_documents[document_source].get("is_selected", True)
                        current_selected = point.payload.get("is_selected", True)
                        
                        # Update if the selection status doesn't match
                        if current_selected != expected_selected:
                            # Update this specific chunk using set_payload (no vector required)
                            self.qdrant_manager.client.set_payload(
                                collection_name=self.qdrant_manager.collection_name,
                                points=[point.id],
                                payload={"is_selected": expected_selected},
                                wait=True
                            )
                            chunks_updated += 1
                except Exception as point_error:
                    logger.warning(f"⚠️ Error processing point {getattr(point, 'id', 'unknown')}: {point_error}")
                    continue
            
            if chunks_without_field > 0 or chunks_updated > 0:
                logger.info(f"✅ Updated {chunks_updated} chunks and fixed {chunks_without_field} missing fields")
            
            return True
        except Exception as e:
            logger.error(f"❌ Failed to ensure chunks have selection field: {e}")
            return False

    def _load_document(self, filename: str) -> List[Any]:
        """Load a specific document based on its type."""
        try:
            file_path = os.path.join(self.data_folder, filename)
            file_extension = filename.lower().split('.')[-1]
            
            if file_extension == 'csv':
                return self.data_manager.load_csv_data(filename)
            elif file_extension == 'pdf':
                return self.data_manager.load_pdf_data([filename])
            elif file_extension in ['txt', 'json']:
                return self.data_manager.load_text_data([filename])
            else:
                logger.error(f"❌ Unsupported file type: {file_extension}")
                return []
        except Exception as e:
            logger.error(f"❌ Failed to load document {filename}: {e}")
            return []

    def _split_documents(self, documents: List[Any]) -> List[Any]:
        """Split documents into chunks."""
        try:
            return self.chunking_manager.split_documents(documents)
        except Exception as e:
            logger.error(f"❌ Failed to split documents: {e}")
            return []

    def _add_embeddings(self, chunks: List[Any], filename: str) -> List[Dict[str, Any]]:
        """Add embeddings to chunks with comprehensive metadata."""
        try:
            embedded_chunks = []
            for i, chunk in enumerate(chunks):
                try:
                    # All chunks are now LangChain Document objects
                    content = chunk.page_content
                    metadata = chunk.metadata
                    
                    # Get embedding
                    embedding = self.embedding.embed_query(content)
                    
                    # Get document selection status
                    is_selected = self.selection_manager.selection_config.get("documents", {}).get(filename, {}).get("is_selected", True)
                    
                    # Create comprehensive embedded chunk with all necessary fields
                    embedded_chunk = {
                        'id': f"{filename}_{i}",
                        'embedding': embedding,
                        'page_content': content,  # Legacy field for compatibility
                        'metadata': {
                            **metadata,
                            'document_source': filename,
                            'chunk_id': f"{filename}_{i}",
                            'chunk_index': i,
                            'total_chunks': len(chunks),
                            'file_extension': filename.lower().split('.')[-1] if '.' in filename else 'unknown',
                            'is_selected': is_selected,
                            'ingested_at': datetime.now().isoformat(),
                        }
                    }
                    embedded_chunks.append(embedded_chunk)
                except Exception as e:
                    logger.error(f"❌ Failed to embed chunk {i} from {filename}: {e}")
                    continue
            
            logger.info(f"✅ Added embeddings to {len(embedded_chunks)} chunks from {filename}")
            return embedded_chunks
        except Exception as e:
            logger.error(f"❌ Failed to add embeddings to chunks from {filename}: {e}")
            return []

    def _ingest_pending_documents(self) -> bool:
        """Ingest all pending documents."""
        try:
            pending_docs = self.selection_manager.get_documents_needing_ingestion()
            if not pending_docs:
                logger.info("✅ No pending documents to ingest")
                return True
            
            logger.info(f"🔄 Ingesting {len(pending_docs)} pending documents...")
            
            for filename in pending_docs:
                success = self.ingest_document(filename)
                if not success:
                    logger.error(f"❌ Failed to ingest pending document: {filename}")
                    return False
            
            logger.info(f"✅ Successfully ingested {len(pending_docs)} pending documents")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to ingest pending documents: {e}")
            return False

    def refresh_chunk_selection_status(self) -> bool:
        """Force refresh the selection status of all chunks in Qdrant."""
        try:
            logger.info("🔄 Refreshing chunk selection status...")
            success = self._ensure_chunks_have_selection_field()
            if success:
                logger.info("✅ Chunk selection status refreshed successfully")
            return success
        except Exception as e:
            logger.error(f"❌ Failed to refresh chunk selection status: {e}")
            return False

    def validate_chunk_metadata(self) -> Dict[str, Any]:
        """Validate that all chunks have the required metadata fields."""
        try:
            logger.info("🔍 Validating chunk metadata...")
            
            response = self.qdrant_manager.client.scroll(
                collection_name=self.qdrant_manager.collection_name,
                limit=10000,
                with_payload=True,
                with_vectors=False
            )
            
            required_fields = [
                "document_source", "is_selected", "content", "chunk_id"
            ]
            
            validation_results = {
                "total_chunks": len(response[0]),
                "chunks_with_all_fields": 0,
                "missing_fields": {},
                "document_sources": set(),
                "selection_status": {"selected": 0, "deselected": 0}
            }
            
            for point in response[0]:
                payload = point.payload
                missing_fields = []
                
                # Check for required fields
                for field in required_fields:
                    if field not in payload or payload[field] is None:
                        missing_fields.append(field)
                
                if not missing_fields:
                    validation_results["chunks_with_all_fields"] += 1
                else:
                    for field in missing_fields:
                        if field not in validation_results["missing_fields"]:
                            validation_results["missing_fields"][field] = 0
                        validation_results["missing_fields"][field] += 1
                
                # Track document sources
                doc_source = payload.get("document_source", "unknown")
                validation_results["document_sources"].add(doc_source)
                
                # Track selection status
                is_selected = payload.get("is_selected", True)
                if is_selected:
                    validation_results["selection_status"]["selected"] += 1
                else:
                    validation_results["selection_status"]["deselected"] += 1
            
            # Convert set to list for JSON serialization
            validation_results["document_sources"] = list(validation_results["document_sources"])
            
            logger.info(f"✅ Validation complete: {validation_results['chunks_with_all_fields']}/{validation_results['total_chunks']} chunks have all required fields")
            
            return validation_results
            
        except Exception as e:
            logger.error(f"❌ Failed to validate chunk metadata: {e}")
            return {}

    def _reingest_changed_documents(self) -> bool:
        """Re-ingest documents that have changed."""
        try:
            changed_docs = self.selection_manager.get_documents_needing_reingestion()
            if not changed_docs:
                logger.info("✅ No changed documents to re-ingest")
                return True
            
            logger.info(f"🔄 Re-ingesting {len(changed_docs)} changed documents...")
            
            for filename in changed_docs:
                # Delete existing chunks for this document
                self.qdrant_manager.delete_document_chunks(filename)
                
                # Re-ingest
                success = self.ingest_document(filename)
                if not success:
                    logger.error(f"❌ Failed to re-ingest changed document: {filename}")
                    return False
            
            logger.info(f"✅ Successfully re-ingested {len(changed_docs)} changed documents")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to re-ingest changed documents: {e}")
            return False
