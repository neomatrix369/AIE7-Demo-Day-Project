# -*- coding: utf-8 -*-
import os
import json
import logging
import hashlib
from typing import List, Dict, Any, Set
from pathlib import Path
from datetime import datetime
from utils.environment import is_cloud_deployment, log_deployment_info

# Set up logging
logger = logging.getLogger(__name__)

class DocumentSelectionManager:
    """Manages document selection, deselection, and configuration persistence."""
    
    def __init__(self, data_folder: str, config_file: str = "document_selection.json", qdrant_manager=None):
        """Initialize the document selection manager."""
        self.data_folder = data_folder
        self.config_file = os.path.join(data_folder, config_file)
        self.qdrant_manager = qdrant_manager
        self.is_cloud = is_cloud_deployment()
        
        # Log deployment environment for debugging
        log_deployment_info()
        
        # In cloud environments, we may need to use alternative storage
        if self.is_cloud:
            logger.info("🌐 Cloud environment detected - using cloud-compatible configuration management")
        
        self.selection_config = self._load_selection_config()
        logger.info(f"📋 Loaded document selection config: {len(self.selection_config.get('documents', {}))} documents tracked")
        
    def _load_selection_config(self) -> Dict[str, Any]:
        """Load document selection configuration from file, cloud storage, or auto-generate if missing."""
        try:
            # Try to load from local file first
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                logger.info(f"📋 Loaded document selection config from file: {len(config.get('documents', {}))} documents tracked")
                return config
            
            # In cloud environments, try to load from Qdrant
            if self.is_cloud and self.qdrant_manager:
                logger.info("☁️ Config file not found, trying cloud storage...")
                cloud_config = self._load_config_from_qdrant()
                if cloud_config and cloud_config.get('documents'):
                    logger.info(f"☁️ Loaded document selection config from cloud: {len(cloud_config.get('documents', {}))} documents tracked")
                    return cloud_config
            
            # Auto-generate config by discovering available data sources
            logger.info("📋 Config not found, auto-generating from available data sources...")
            auto_generated_config = self._auto_generate_config()
            self._save_selection_config(auto_generated_config)
            logger.info(f"✅ Auto-generated document selection config with {len(auto_generated_config.get('documents', {}))} documents")
            return auto_generated_config
            
        except Exception as e:
            logger.error(f"❌ Failed to load selection config: {e}")
            # Fallback to basic auto-generation even if there's an error
            fallback_config = self._auto_generate_config()
            return fallback_config
    
    def _save_selection_config(self, config: Dict[str, Any] = None) -> bool:
        """Save document selection configuration to file or cloud storage."""
        if config is None:
            config = self.selection_config
        
        config["last_updated"] = datetime.now().isoformat()
        
        # In cloud environments, try alternative storage methods
        if self.is_cloud:
            return self._save_to_cloud_storage(config)
        else:
            return self._save_to_local_file(config)
    
    def _save_to_local_file(self, config: Dict[str, Any]) -> bool:
        """Save configuration to local file system."""
        try:
            # Ensure data folder exists before saving config
            os.makedirs(self.data_folder, exist_ok=True)
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved document selection config to file: {len(config.get('documents', {}))} documents tracked")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to save selection config to file: {e}")
            return False
    
    def _save_to_cloud_storage(self, config: Dict[str, Any]) -> bool:
        """Save configuration using cloud-compatible methods."""
        try:
            # Method 1: Try to save to Qdrant as metadata (if available)
            if self.qdrant_manager:
                success = self._save_config_to_qdrant(config)
                if success:
                    logger.info(f"☁️ Saved document selection config to Qdrant: {len(config.get('documents', {}))} documents tracked")
                    return True
            
            # Method 2: Try local file as fallback (may work in some cloud environments)
            try:
                return self._save_to_local_file(config)
            except Exception:
                pass
            
            # Method 3: Continue with in-memory only (graceful degradation)
            logger.info("📝 Using in-memory config only (cloud environment - file save unavailable)")
            return True  # Return True to continue operation
            
        except Exception as e:
            logger.error(f"❌ Failed to save config to cloud storage: {e}")
            # Graceful degradation - continue with in-memory config
            logger.info("📝 Continuing with in-memory config only")
            return True
    
    def _save_config_to_qdrant(self, config: Dict[str, Any]) -> bool:
        """Save document selection config as metadata in Qdrant."""
        try:
            # Create a special metadata point in Qdrant to store document selection config
            from qdrant_client.http import models
            
            # Create a point with special ID for configuration
            config_point = models.PointStruct(
                id="__document_selection_config__",
                vector=[0.0] * 1536,  # Dummy embedding vector
                payload={
                    "config_type": "document_selection",
                    "config_data": config,
                    "saved_at": datetime.now().isoformat(),
                    "version": config.get("version", "1.0")
                }
            )
            
            self.qdrant_manager.client.upsert(
                collection_name=self.qdrant_manager.collection_name,
                points=[config_point]
            )
            
            logger.info("☁️ Successfully saved config to Qdrant metadata")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save config to Qdrant: {e}")
            return False
    
    def _load_config_from_qdrant(self) -> Dict[str, Any]:
        """Load document selection config from Qdrant metadata."""
        try:
            # Try to retrieve the configuration point
            result = self.qdrant_manager.client.retrieve(
                collection_name=self.qdrant_manager.collection_name,
                ids=["__document_selection_config__"],
                with_payload=True
            )
            
            if result and len(result) > 0:
                config_data = result[0].payload.get("config_data", {})
                logger.info(f"☁️ Loaded document selection config from Qdrant: {len(config_data.get('documents', {}))} documents")
                return config_data
                
        except Exception as e:
            logger.debug(f"Could not load config from Qdrant: {e}")
        
        return {}
    
    def _auto_generate_config(self) -> Dict[str, Any]:
        """Auto-generate document selection config from available data sources."""
        logger.info("🔍 Starting auto-generation of document selection config...")
        
        # Initialize base config
        config = {
            "version": "1.0",
            "last_updated": datetime.now().isoformat(),
            "documents": {},
            "settings": {
                "auto_ingest_new": True,
                "retain_deselected": True,
                "auto_generated": True,
                "generation_timestamp": datetime.now().isoformat()
            }
        }
        
        # Data source 1: Discover documents from Qdrant vector database
        qdrant_documents = self._discover_documents_from_qdrant()
        logger.info(f"📊 Found {len(qdrant_documents)} documents from Qdrant database")
        
        # Data source 2: Scan file system for additional documents
        filesystem_documents = self._discover_documents_from_filesystem()
        logger.info(f"📁 Found {len(filesystem_documents)} documents from filesystem")
        
        # Data source 3: Combine and deduplicate
        all_documents = self._merge_document_sources(qdrant_documents, filesystem_documents)
        logger.info(f"🔄 Combined and deduplicated to {len(all_documents)} unique documents")
        
        # Populate config with discovered documents
        for doc_info in all_documents:
            config["documents"][doc_info["filename"]] = {
                "is_selected": doc_info["is_selected"],
                "is_ingested": doc_info["is_ingested"],
                "ingested_at": doc_info.get("ingested_at", datetime.now().isoformat()),
                "hash": doc_info.get("hash", ""),
                "size_bytes": doc_info.get("size_bytes", 0),
                "modified": doc_info.get("modified", datetime.now().isoformat()),
                "chunk_count": doc_info.get("chunk_count", 0),
                "auto_discovered": True,
                "discovery_source": doc_info.get("source", "unknown")
            }
        
        logger.info(f"✅ Auto-generated config for {len(config['documents'])} documents")
        return config
    
    def _discover_documents_from_qdrant(self) -> List[Dict[str, Any]]:
        """Discover documents from Qdrant vector database."""
        discovered_docs = []
        
        if not self.qdrant_manager:
            logger.info("⚠️ No Qdrant manager available for document discovery")
            return discovered_docs
        
        try:
            # Get chunk counts by document source
            chunk_counts = self.qdrant_manager.get_document_chunk_counts()
            
            # Get document statistics for selection status
            stats = self.qdrant_manager.get_document_statistics()
            document_sources = stats.get("document_sources", {})
            
            for source, count in chunk_counts.items():
                if source and source != "unknown":
                    # Get selection status from statistics
                    source_stats = document_sources.get(source, {"total": count, "selected": count})
                    is_selected = source_stats["selected"] > 0
                    
                    discovered_docs.append({
                        "filename": source,
                        "is_selected": is_selected,
                        "is_ingested": True,  # If in Qdrant, it's been ingested
                        "chunk_count": count,
                        "source": "qdrant",
                        "ingested_at": datetime.now().isoformat(),  # Approximate
                        "hash": self._get_file_hash(os.path.join(self.data_folder, source)) if os.path.exists(os.path.join(self.data_folder, source)) else "",
                        "size_bytes": self._get_file_size(os.path.join(self.data_folder, source)) if os.path.exists(os.path.join(self.data_folder, source)) else 0,
                        "modified": self._get_file_modified(os.path.join(self.data_folder, source)) if os.path.exists(os.path.join(self.data_folder, source)) else datetime.now().isoformat()
                    })
            
            logger.info(f"📊 Discovered {len(discovered_docs)} documents from Qdrant")
            
        except Exception as e:
            logger.error(f"❌ Error discovering documents from Qdrant: {e}")
        
        return discovered_docs
    
    def _discover_documents_from_filesystem(self) -> List[Dict[str, Any]]:
        """Discover documents from the data folder filesystem."""
        discovered_docs = []
        
        if not os.path.exists(self.data_folder):
            logger.info(f"⚠️ Data folder not found: {self.data_folder}")
            return discovered_docs
        
        try:
            # Scan for supported file types
            supported_extensions = ['.pdf', '.csv', '.txt', '.json']
            
            for root, dirs, files in os.walk(self.data_folder):
                for file in files:
                    if any(file.lower().endswith(ext) for ext in supported_extensions):
                        # Skip system files
                        if file in ['document_selection.json', '.DS_Store', 'Thumbs.db', '.gitignore', '.env']:
                            continue
                        
                        file_path = os.path.join(root, file)
                        relative_path = os.path.relpath(file_path, self.data_folder)
                        
                        discovered_docs.append({
                            "filename": relative_path,
                            "is_selected": False,  # Default to not selected for filesystem-only files
                            "is_ingested": False,
                            "chunk_count": 0,
                            "source": "filesystem",
                            "hash": self._get_file_hash(file_path),
                            "size_bytes": self._get_file_size(file_path),
                            "modified": self._get_file_modified(file_path)
                        })
            
            logger.info(f"📁 Discovered {len(discovered_docs)} documents from filesystem")
            
        except Exception as e:
            logger.error(f"❌ Error discovering documents from filesystem: {e}")
        
        return discovered_docs
    
    def _merge_document_sources(self, qdrant_docs: List[Dict[str, Any]], 
                               filesystem_docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Merge and deduplicate documents from different sources."""
        merged = {}
        
        # Add Qdrant documents first (they have ingestion status)
        for doc in qdrant_docs:
            merged[doc["filename"]] = doc
        
        # Add filesystem documents, but don't overwrite Qdrant data
        for doc in filesystem_docs:
            if doc["filename"] not in merged:
                merged[doc["filename"]] = doc
            else:
                # Update filesystem metadata if available
                existing = merged[doc["filename"]]
                existing["hash"] = doc.get("hash", existing.get("hash", ""))
                existing["size_bytes"] = doc.get("size_bytes", existing.get("size_bytes", 0))
                existing["modified"] = doc.get("modified", existing.get("modified", ""))
        
        return list(merged.values())
    
    def _get_file_size(self, file_path: str) -> int:
        """Get file size in bytes."""
        try:
            if os.path.exists(file_path):
                return os.path.getsize(file_path)
        except Exception as e:
            logger.debug(f"Could not get size for {file_path}: {e}")
        return 0
    
    def _get_file_modified(self, file_path: str) -> str:
        """Get file modification time as ISO string."""
        try:
            if os.path.exists(file_path):
                mtime = os.path.getmtime(file_path)
                return datetime.fromtimestamp(mtime).isoformat()
        except Exception as e:
            logger.debug(f"Could not get modified time for {file_path}: {e}")
        return datetime.now().isoformat()
    
    def _get_file_hash(self, file_path: str) -> str:
        """Generate a hash for a file to detect changes."""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                return hashlib.md5(content).hexdigest()
        except Exception as e:
            logger.error(f"❌ Failed to generate hash for {file_path}: {e}")
            return ""
    
    def _get_file_metadata(self, file_path: str) -> Dict[str, Any]:
        """Get metadata for a file."""
        try:
            stat = os.stat(file_path)
            return {
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "hash": self._get_file_hash(file_path)
            }
        except Exception as e:
            logger.error(f"❌ Failed to get metadata for {file_path}: {e}")
            return {}
    
    def scan_data_folder(self) -> List[Dict[str, Any]]:
        """Scan for documents that are tracked in the configuration file."""
        documents = []
        try:
            # Get chunk counts from Qdrant if available
            chunk_counts = {}
            if self.qdrant_manager:
                chunk_counts = self.qdrant_manager.get_document_chunk_counts()
            
            # Handle legacy data where all chunks have "unknown" source
            unknown_chunks = chunk_counts.get("unknown", 0)
            if unknown_chunks > 0:
                logger.info(f"📊 Found {unknown_chunks} legacy chunks with 'unknown' source")
            
            # Get current documents from config
            tracked_documents = self.selection_config.get("documents", {})
            
            for filename, doc_config in tracked_documents.items():
                # Handle both "data/filename" and "filename" formats
                if filename.startswith("data/"):
                    relative_path = filename[5:]  # Remove "data/" prefix
                    full_path = os.path.join(self.data_folder, relative_path)
                else:
                    relative_path = filename
                    full_path = os.path.join(self.data_folder, relative_path)
                
                # Check if file actually exists
                if not os.path.exists(full_path):
                    logger.warning(f"⚠️ Tracked file not found: {filename}")
                    continue
                
                # Get current file metadata
                current_metadata = self._get_file_metadata(full_path)
                
                # Use config metadata or current metadata
                metadata = {
                    "size": doc_config.get("size_bytes", current_metadata.get("size", 0)),
                    "modified": doc_config.get("modified", current_metadata.get("modified", "")),
                    "hash": doc_config.get("hash", current_metadata.get("hash", ""))
                }
                
                # Determine if document is selected and ingested
                is_selected = doc_config.get("is_selected", True)
                is_ingested = doc_config.get("is_ingested", False)
                
                # Get chunk count from config or Qdrant
                chunk_count = doc_config.get("chunk_count", 0)
                if chunk_count == 0 and self.qdrant_manager and relative_path in chunk_counts:
                    chunk_count = chunk_counts[relative_path]
                
                # Update ingestion status based on chunk count
                if chunk_count > 0:
                    is_ingested = True
                
                # Check if file has changed
                has_changed = doc_config.get("has_changed", False)
                if doc_config.get("hash", "") and doc_config.get("hash", "") != metadata.get("hash", ""):
                    has_changed = True
                
                document_info = {
                    "filename": relative_path,
                    "full_path": full_path,
                    "file_type": doc_config.get("file_type", os.path.splitext(relative_path)[1].lower()),
                    "size_bytes": metadata.get("size", 0),
                    "modified": metadata.get("modified", ""),
                    "hash": metadata.get("hash", ""),
                    "is_selected": is_selected,
                    "is_ingested": is_ingested,
                    "ingested_at": doc_config.get("ingested_at", ""),
                    "chunk_count": chunk_count,
                    "has_changed": has_changed
                }
                documents.append(document_info)
            
            logger.info(f"📁 Scanned tracked documents: found {len(documents)} documents")
            return documents
        except Exception as e:
            logger.error(f"❌ Failed to scan tracked documents: {e}")
            return []
    
    def _has_file_changed(self, relative_path: str, current_hash: str) -> bool:
        """Check if a file has changed since last scan."""
        existing_doc = self.selection_config.get("documents", {}).get(relative_path, {})
        existing_hash = existing_doc.get("hash", "")
        return existing_hash != "" and existing_hash != current_hash
    
    def get_selected_documents(self) -> List[str]:
        """Get list of selected document filenames."""
        selected = []
        for filename, doc_info in self.selection_config.get("documents", {}).items():
            if doc_info.get("is_selected", False):
                selected.append(filename)
        return selected
    
    def get_deselected_documents(self) -> List[str]:
        """Get list of deselected document filenames."""
        deselected = []
        for filename, doc_info in self.selection_config.get("documents", {}).items():
            if not doc_info.get("is_selected", True):
                deselected.append(filename)
        return deselected
    
    def select_document(self, filename: str) -> bool:
        """Select a document for ingestion."""
        try:
            if "documents" not in self.selection_config:
                self.selection_config["documents"] = {}
            
            if filename not in self.selection_config["documents"]:
                # Add new document entry
                file_path = os.path.join(self.data_folder, filename)
                if os.path.exists(file_path):
                    metadata = self._get_file_metadata(file_path)
                    self.selection_config["documents"][filename] = {
                        "is_selected": True,
                        "is_ingested": False,
                        "ingested_at": "",
                        "chunk_count": 0,
                        "size": metadata.get("size", 0),
                        "modified": metadata.get("modified", ""),
                        "hash": metadata.get("hash", "")
                    }
                else:
                    logger.warning(f"⚠️ Document not found: {filename}")
                    return False
            else:
                # Update existing document
                self.selection_config["documents"][filename]["is_selected"] = True
            
            self._save_selection_config()
            logger.info(f"✅ Selected document: {filename}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to select document {filename}: {e}")
            return False
    
    def deselect_document(self, filename: str) -> bool:
        """Deselect a document (but retain its vectors)."""
        try:
            if filename in self.selection_config.get("documents", {}):
                self.selection_config["documents"][filename]["is_selected"] = False
                self._save_selection_config()
                logger.info(f"✅ Deselected document: {filename} (vectors retained)")
                return True
            else:
                logger.warning(f"⚠️ Document not found in config: {filename}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to deselect document {filename}: {e}")
            return False
    
    def mark_document_ingested(self, filename: str, chunk_count: int = 0) -> bool:
        """Mark a document as ingested."""
        try:
            if filename in self.selection_config.get("documents", {}):
                self.selection_config["documents"][filename].update({
                    "is_ingested": True,
                    "ingested_at": datetime.now().isoformat(),
                    "chunk_count": chunk_count
                })
                self._save_selection_config()
                logger.info(f"✅ Marked document as ingested: {filename} ({chunk_count} chunks)")
                return True
            else:
                logger.warning(f"⚠️ Document not found in config: {filename}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to mark document as ingested {filename}: {e}")
            return False
    
    def get_documents_needing_ingestion(self) -> List[str]:
        """Get list of documents that need to be ingested."""
        needing_ingestion = []
        for filename, doc_info in self.selection_config.get("documents", {}).items():
            if doc_info.get("is_selected", False) and not doc_info.get("is_ingested", False):
                needing_ingestion.append(filename)
        return needing_ingestion
    
    def get_documents_needing_reingestion(self) -> List[str]:
        """Get list of documents that need re-ingestion due to changes."""
        needing_reingestion = []
        for filename, doc_info in self.selection_config.get("documents", {}).items():
            if doc_info.get("is_selected", False) and doc_info.get("has_changed", False):
                needing_reingestion.append(filename)
        return needing_reingestion
    
    def get_selection_summary(self) -> Dict[str, Any]:
        """Get a summary of document selection status."""
        # Handle the new JSON structure with individual document objects
        documents = self.selection_config.get("documents", {})
        
        total_docs = len(documents)
        selected_docs = len([d for d in documents.values() if d.get("is_selected", False)])
        ingested_docs = len([d for d in documents.values() if d.get("is_ingested", False)])
        deselected_docs = total_docs - selected_docs
        
        # Calculate documents needing ingestion (selected but not ingested)
        needing_ingestion = len([d for d in documents.values() 
                               if d.get("is_selected", False) and not d.get("is_ingested", False)])
        
        # Calculate documents needing re-ingestion (selected and changed)
        needing_reingestion = len([d for d in documents.values() 
                                 if d.get("is_selected", False) and d.get("has_changed", False)])
        
        return {
            "total_documents": total_docs,
            "selected_documents": selected_docs,
            "deselected_documents": deselected_docs,
            "ingested_documents": ingested_docs,
            "needing_ingestion": needing_ingestion,
            "needing_reingestion": needing_reingestion,
            "last_updated": self.selection_config.get("last_updated", "")
        }

    def add_document_to_tracking(self, filename: str) -> bool:
        """Add a document to the tracking list (but don't select it automatically)."""
        try:
            if "documents" not in self.selection_config:
                self.selection_config["documents"] = {}
            
            if filename not in self.selection_config["documents"]:
                # Add new document entry
                file_path = os.path.join(self.data_folder, filename)
                if os.path.exists(file_path):
                    metadata = self._get_file_metadata(file_path)
                    self.selection_config["documents"][filename] = {
                        "is_selected": False,  # Don't auto-select new documents
                        "is_ingested": False,
                        "ingested_at": "",
                        "chunk_count": 0,
                        "size_bytes": metadata.get("size", 0),
                        "modified": metadata.get("modified", ""),
                        "hash": metadata.get("hash", ""),
                        "file_type": os.path.splitext(filename)[1].lower(),
                        "full_path": file_path,
                        "has_changed": False
                    }
                    self._save_selection_config()
                    logger.info(f"✅ Document added to tracking: {filename}")
                    return True
                else:
                    logger.warning(f"⚠️ Document not found: {filename}")
                    return False
            else:
                logger.info(f"📄 Document already tracked: {filename}")
                return True
        except Exception as e:
            logger.error(f"❌ Failed to add document to tracking {filename}: {e}")
            return False

    def document_exists_in_tracking(self, filename: str) -> bool:
        """Check if a document exists in the tracking list."""
        return filename in self.selection_config.get("documents", {})

    def is_document_selected(self, filename: str) -> bool:
        """Check if a document is currently selected."""
        doc_info = self.selection_config.get("documents", {}).get(filename, {})
        return doc_info.get("is_selected", False)

    def remove_document_from_tracking(self, filename: str) -> bool:
        """Remove a document from the tracking list."""
        try:
            if filename in self.selection_config.get("documents", {}):
                del self.selection_config["documents"][filename]
                self._save_selection_config()
                logger.info(f"✅ Document removed from tracking: {filename}")
                return True
            else:
                logger.warning(f"⚠️ Document not found in tracking: {filename}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to remove document from tracking {filename}: {e}")
            return False

