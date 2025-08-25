# -*- coding: utf-8 -*-
import os
import logging
import uuid
import time
import threading
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams, Filter, FieldCondition, MatchValue
from qdrant_client.http.models import UpdateStatus, PointStruct
from qdrant_client.http.exceptions import UnexpectedResponse

# Set up logging
logger = logging.getLogger(__name__)

# Qdrant configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
VECTOR_SIZE = 1536  # OpenAI text-embedding-3-small dimensions

class EnhancedQdrantManager:
    """Enhanced Qdrant manager with document selection and retention capabilities."""

    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self._client = None
        self._client_lock = threading.Lock()
        self._last_connection_time = 0
        self._connection_timeout = 30  # seconds
        self._max_connection_age = 300  # 5 minutes - recreate connection after this
        self._ensure_collection_exists()

    def _get_qdrant_client(self) -> QdrantClient:
        """Create and return a Qdrant client instance with connection management."""
        with self._client_lock:
            current_time = time.time()
            
            # Check if we need to create a new connection
            if (self._client is None or 
                current_time - self._last_connection_time > self._max_connection_age):
                
                # Close existing connection if it exists
                if self._client is not None:
                    try:
                        self._client.close()
                        logger.info("🔌 Closed existing Qdrant connection")
                    except Exception as e:
                        logger.warning(f"⚠️ Error closing Qdrant connection: {e}")
                
                # Create new connection with proper timeout
                logger.info(f"🔗 Creating new Qdrant connection to {QDRANT_URL}")
                
                try:
                    # Create Qdrant client with extended timeout for better connection management
                    self._client = QdrantClient(
                        url=QDRANT_URL, 
                        api_key=QDRANT_API_KEY, 
                        timeout=60  # Extended timeout to prevent hanging connections
                    )
                    
                    # Test the connection
                    collections = self._client.get_collections()
                    self._last_connection_time = current_time
                    
                    logger.info("✅ Successfully connected to Qdrant server")
                    logger.info(f"📊 Found {len(collections.collections)} existing collections")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to connect to Qdrant server: {e}")
                    self._client = None
                    raise
            
            return self._client

    def _ensure_collection_exists(self) -> bool:
        """Ensure the collection exists with proper payload schema."""
        try:
            client = self._get_qdrant_client()
            collections = client.get_collections()
            collection_names = [c.name for c in collections.collections]
            
            if self.collection_name in collection_names:
                collection_info = client.get_collection(self.collection_name)
                logger.info(f"📦 Collection '{self.collection_name}' exists with {collection_info.points_count} points")
                return True
            
            logger.info(f"📦 Creating new Qdrant collection '{self.collection_name}' with enhanced payload schema")
            
            # Create collection with enhanced payload schema
            client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
                # Add payload schema for document management
                on_disk_payload=True,  # Store payloads on disk for better performance
            )
            
            # Create payload indexes for efficient filtering
            self._create_payload_indexes()
            
            logger.info(f"✅ Successfully created collection '{self.collection_name}' with enhanced schema")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to ensure collection exists: {e}")
            return False

    def _create_payload_indexes(self):
        """Create payload indexes for efficient filtering."""
        try:
            client = self._get_qdrant_client()
            
            # Index for document source filtering
            client.create_payload_index(
                collection_name=self.collection_name,
                field_name="document_source",
                field_schema=models.PayloadFieldSchema.KEYWORD
            )
            
            # Index for selection status filtering
            client.create_payload_index(
                collection_name=self.collection_name,
                field_name="is_selected",
                field_schema=models.PayloadFieldSchema.BOOL
            )
            
            # Index for document type filtering
            client.create_payload_index(
                collection_name=self.collection_name,
                field_name="document_type",
                field_schema=models.PayloadFieldSchema.KEYWORD
            )
            
            logger.info("✅ Created payload indexes for efficient filtering")
        except Exception as e:
            logger.warning(f"⚠️ Failed to create payload indexes: {e}")

    def close_connection(self):
        """Close the Qdrant connection and cleanup resources."""
        with self._client_lock:
            if self._client is not None:
                try:
                    self._client.close()
                    logger.info("🔌 Closed Qdrant connection")
                except Exception as e:
                    logger.warning(f"⚠️ Error closing Qdrant connection: {e}")
                finally:
                    self._client = None
                    self._last_connection_time = 0

    def __del__(self):
        """Cleanup when the manager is destroyed."""
        self.close_connection()

    @property
    def client(self) -> QdrantClient:
        """Get the Qdrant client instance with connection management."""
        return self._get_qdrant_client()

    def add_documents_with_selection_status(self, documents: List[Dict[str, Any]], 
                                          document_source: str, 
                                          is_selected: bool = True) -> bool:
        """Add documents to collection with selection status in payload."""
        try:
            if not documents:
                logger.warning("⚠️ No documents provided for ingestion")
                return True
            
            # Prepare points with enhanced payload
            points = []
            for i, doc in enumerate(documents):
                # Ensure all required fields are present
                from datetime import datetime
                
                # Get document type from filename extension
                file_extension = document_source.lower().split('.')[-1] if '.' in document_source else 'unknown'
                
                # Create comprehensive payload with all necessary fields
                payload = {
                    # Core content
                    "content": doc.get('page_content', ''),
                    "page_content": doc.get('page_content', ''),  # Legacy field for compatibility
                    
                    # Document identification
                    "document_source": document_source,
                    "document_type": file_extension,
                    "chunk_id": f"{i:05d}_{document_source}",
                    
                    # Selection and status
                    "is_selected": is_selected,
                    "ingested_at": datetime.now().isoformat(),
                    
                    # Metadata (preserve existing metadata)
                    "metadata": doc.get('metadata', {}),
                    
                    # Additional fields for future compatibility
                    "chunk_index": i,
                    "total_chunks": len(documents),
                    "file_size": doc.get('metadata', {}).get('file_size', 0),
                    "created_at": doc.get('metadata', {}).get('created_at', datetime.now().isoformat()),
                    "modified_at": doc.get('metadata', {}).get('modified_at', datetime.now().isoformat()),
                }
                
                # Create unique ID as integer (Qdrant requires unsigned integer)
                # Combine document index with content hash for uniqueness
                content_hash = abs(hash(doc.get('page_content', '')))
                document_hash = abs(hash(document_source))
                unique_id = int(f"{document_hash % 1000000}{i:03d}{content_hash % 1000000}")
                
                # Validate embedding before creating PointStruct
                embedding = doc.get('embedding', [])
                if not embedding or not isinstance(embedding, list):
                    logger.warning(f"⚠️ Skipping document with invalid embedding: {unique_id}")
                    continue
                
                point = PointStruct(
                    id=unique_id,
                    vector=embedding,
                    payload=payload
                )
                points.append(point)
            
            # Add points to collection
            if points:
                self._get_qdrant_client().upsert(
                    collection_name=self.collection_name,
                    points=points,
                    wait=True
                )
            else:
                logger.warning("⚠️ No valid points to add to collection")
            
            logger.info(f"✅ Added {len(points)} documents from '{document_source}' (selected: {is_selected}) with complete metadata")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to add documents: {e}")
            return False

    def update_document_selection_status(self, document_source: str, is_selected: bool) -> bool:
        """Update selection status for all chunks from a specific document source."""
        try:
            # First, get all chunks to find the ones from this document source
            response = self._get_qdrant_client().scroll(
                collection_name=self.collection_name,
                limit=10000,
                with_payload=True,
                with_vectors=False
            )
            
            # Find chunks that belong to this document source
            chunk_ids_to_update = []
            for point in response[0]:
                point_document_source = point.payload.get("document_source", "")
                if point_document_source == document_source:
                    chunk_ids_to_update.append(point.id)
            
            if not chunk_ids_to_update:
                logger.warning(f"⚠️ No chunks found for document source: {document_source}")
                return False
            
            # Update the chunks using their IDs
            # Use set_payload for updating existing points (no vector required)
            self._get_qdrant_client().set_payload(
                collection_name=self.collection_name,
                points=chunk_ids_to_update,
                payload={"is_selected": is_selected},
                wait=True
            )
            
            logger.info(f"✅ Updated selection status for {len(chunk_ids_to_update)} chunks from '{document_source}' to {is_selected}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to update selection status: {e}")
            return False

    def get_active_documents(self, filter_selected: bool = True) -> List[Dict[str, Any]]:
        """Get documents that are currently active (selected) for search."""
        try:
            filter_condition = None
            if filter_selected:
                filter_condition = Filter(
                    must=[
                        FieldCondition(
                            key="is_selected",
                            match=MatchValue(value=True)
                        )
                    ]
                )
            
            # Get all points with the filter
            response = self._get_qdrant_client().scroll(
                collection_name=self.collection_name,
                scroll_filter=filter_condition,
                limit=10000,  # Adjust based on your needs
                with_payload=True,
                with_vectors=False
            )
            
            documents = []
            for point in response[0]:
                documents.append({
                    "id": point.id,
                    "content": point.payload.get("content", ""),
                    "metadata": point.payload.get("metadata", {}),
                    "document_source": point.payload.get("document_source", ""),
                    "is_selected": point.payload.get("is_selected", True),
                    "document_type": point.payload.get("document_type", ""),
                    "chunk_id": point.payload.get("chunk_id", "")
                })
            
            logger.info(f"📚 Retrieved {len(documents)} active documents")
            return documents
        except Exception as e:
            logger.error(f"❌ Failed to get active documents: {e}")
            return []

    def get_document_statistics(self) -> Dict[str, Any]:
        """Get statistics about documents in the collection."""
        try:
            # Get total count
            total_count = self._get_qdrant_client().get_collection(self.collection_name).points_count
            
            # Get all document sources and count selected/deselected chunks
            sources_response = self._get_qdrant_client().scroll(
                collection_name=self.collection_name,
                limit=10000,
                with_payload=True,
                with_vectors=False
            )
            
            document_sources = {}
            selected_count = 0
            
            # Debug: Log all unique document sources found
            unique_sources = set()
            for point in sources_response[0]:
                source = point.payload.get("document_source", "unknown")
                unique_sources.add(source)
            
            logger.info(f"🔍 Found document sources in chunks: {list(unique_sources)}")
            
            for point in sources_response[0]:
                source = point.payload.get("document_source", "unknown")
                is_selected = point.payload.get("is_selected", True)
                
                if source not in document_sources:
                    document_sources[source] = {"total": 0, "selected": 0}
                
                document_sources[source]["total"] += 1
                if is_selected:
                    document_sources[source]["selected"] += 1
                    selected_count += 1
            
            return {
                "total_chunks": total_count,
                "selected_chunks": selected_count,
                "deselected_chunks": total_count - selected_count,
                "document_sources": document_sources,
                "collection_name": self.collection_name
            }
        except Exception as e:
            logger.error(f"❌ Failed to get document statistics: {e}")
            return {}

    def search_with_selection_filter(self, query_vector: List[float], 
                                   limit: int = 10, 
                                   filter_selected: bool = True,
                                   score_threshold: float = 0.0) -> List[Dict[str, Any]]:
        """Search documents with optional selection filter."""
        try:
            filter_condition = None
            if filter_selected:
                filter_condition = Filter(
                    must=[
                        FieldCondition(
                            key="is_selected",
                            match=MatchValue(value=True)
                        )
                    ]
                )
            
            search_response = self._get_qdrant_client().search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=filter_condition,
                limit=limit,
                score_threshold=score_threshold,
                with_payload=True
            )
            
            results = []
            for scored_point in search_response:
                results.append({
                    "id": scored_point.id,
                    "score": scored_point.score,
                    "content": scored_point.payload.get("content", ""),
                    "metadata": scored_point.payload.get("metadata", {}),
                    "document_source": scored_point.payload.get("document_source", ""),
                    "chunk_id": scored_point.payload.get("chunk_id", "")
                })
            
            logger.info(f"🔍 Search returned {len(results)} results (filtered by selection: {filter_selected})")
            return results
        except Exception as e:
            logger.error(f"❌ Search failed: {e}")
            return []

    def delete_document_chunks(self, document_source: str) -> bool:
        """Delete all chunks from a specific document source."""
        try:
            # Create filter for the specific document source
            filter_condition = Filter(
                must=[
                    FieldCondition(
                        key="document_source",
                        match=MatchValue(value=document_source)
                    )
                ]
            )
            
            # Delete points
            self._get_qdrant_client().delete(
                collection_name=self.collection_name,
                points_selector=filter_condition,
                wait=True
            )
            
            logger.info(f"🗑️ Deleted all chunks from document source: {document_source}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to delete document chunks: {e}")
            return False

    def delete_collection_chunks(self) -> bool:
        """Delete all chunks from the collection."""
        try:
            self._get_qdrant_client().delete(
                collection_name=self.collection_name,
                points_selector=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_source",
                            match=models.MatchAny(any=["*"])  # Match all documents
                        )
                    ]
                ),
                wait=True
            )
            
            logger.info(f"🗑️ Deleted all chunks from collection: {self.collection_name}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to delete collection chunks: {e}")
            return False

    def update_document_selection_status(self, document_source: str, is_selected: bool) -> bool:
        """Update the selection status of all chunks for a specific document."""
        try:
            from qdrant_client import models
            
            # Create filter to find chunks from this document
            filter_condition = models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_source",
                        match=models.MatchValue(value=document_source)
                    )
                ]
            )
            
            # Update points with new selection status
            self._get_qdrant_client().set_payload(
                collection_name=self.collection_name,
                payload={"is_selected": is_selected},
                points_selector=filter_condition,
                wait=True
            )
            
            action = "selected" if is_selected else "deselected"
            logger.info(f"✅ Updated selection status for document '{document_source}': {action}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to update document selection status: {e}")
            return False


    def get_collection_info(self) -> Dict[str, Any]:
        """Get comprehensive collection information."""
        try:
            collection_info = self._get_qdrant_client().get_collection(self.collection_name)
            stats = self.get_document_statistics()
            
            # Safely extract vector configuration
            vector_size = None
            distance = None
            
            try:
                if hasattr(collection_info, 'config') and collection_info.config:
                    if hasattr(collection_info.config, 'params') and collection_info.config.params:
                        if hasattr(collection_info.config.params, 'vectors'):
                            vectors_config = collection_info.config.params.vectors
                            
                            # Handle different types of vectors_config
                            if isinstance(vectors_config, dict):
                                # Case where vectors_config is a dict
                                vector_size = vectors_config.get('size')
                                distance = vectors_config.get('distance')
                            elif hasattr(vectors_config, 'size'):
                                # Case where vectors_config is an object with attributes
                                vector_size = vectors_config.size
                                distance = getattr(vectors_config, 'distance', None)
                            else:
                                logger.debug(f"Unexpected vectors_config type: {type(vectors_config)}")
            except Exception as e:
                logger.warning(f"Could not extract vector config: {e}")
            
            return {
                "collection_name": self.collection_name,
                "total_points": getattr(collection_info, 'points_count', 0),
                "vector_size": vector_size,
                "distance": distance,
                "document_statistics": stats
            }
        except Exception as e:
            logger.error(f"❌ Failed to get collection info: {e}")
            return {}

    def get_document_chunk_counts(self) -> Dict[str, int]:
        """Get chunk counts for each document source."""
        try:
            # Get all points with payload to analyze document sources
            response = self._get_qdrant_client().scroll(
                collection_name=self.collection_name,
                limit=10000,
                with_payload=True,
                with_vectors=False
            )
            
            chunk_counts = {}
            for point in response[0]:
                source = point.payload.get("document_source", "unknown")
                title = point.payload.get("metadata", {}).get("title", "")
                
                # For legacy data with "unknown" source, try to extract filename from title
                if source == "unknown" and title:
                    # Extract filename from title
                    if title.endswith('.pdf'):
                        # PDF files: title is the filename
                        filename = title
                    elif ' - ' in title and not title.endswith('.pdf'):
                        # CSV entries: title format is "Company - Product: Issue"
                        # Map these back to the CSV file
                        filename = "complaints.csv"
                    else:
                        # Other cases, use title as is
                        filename = title
                    
                    chunk_counts[filename] = chunk_counts.get(filename, 0) + 1
                else:
                    # Use the actual document source
                    chunk_counts[source] = chunk_counts.get(source, 0) + 1
            
            logger.info(f"📊 Retrieved chunk counts for {len(chunk_counts)} document sources")
            return chunk_counts
        except Exception as e:
            logger.error(f"❌ Failed to get document chunk counts: {e}")
            return {}
