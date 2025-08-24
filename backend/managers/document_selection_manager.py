# -*- coding: utf-8 -*-
import os
import json
import logging
import hashlib
from typing import List, Dict, Any, Set
from pathlib import Path
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

class DocumentSelectionManager:
    """Manages document selection, deselection, and configuration persistence."""
    
    def __init__(self, data_folder: str, config_file: str = "document_selection.json", qdrant_manager=None):
        """Initialize the document selection manager."""
        self.data_folder = data_folder
        self.config_file = os.path.join(data_folder, config_file)
        self.qdrant_manager = qdrant_manager
        self.selection_config = self._load_selection_config()
        logger.info(f"📋 Loaded document selection config: {len(self.selection_config.get('documents', {}))} documents tracked")
        
    def _load_selection_config(self) -> Dict[str, Any]:
        """Load document selection configuration from file."""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                logger.info(f"📋 Loaded document selection config: {len(config.get('documents', {}))} documents tracked")
                return config
            else:
                # Initialize with default config
                default_config = {
                    "version": "1.0",
                    "last_updated": datetime.now().isoformat(),
                    "documents": {},
                    "settings": {
                        "auto_ingest_new": True,
                        "retain_deselected": True
                    }
                }
                self._save_selection_config(default_config)
                logger.info("📋 Created new document selection config")
                return default_config
        except Exception as e:
            logger.error(f"❌ Failed to load selection config: {e}")
            return {"version": "1.0", "last_updated": datetime.now().isoformat(), "documents": {}, "settings": {}}
    
    def _save_selection_config(self, config: Dict[str, Any] = None) -> bool:
        """Save document selection configuration to file."""
        try:
            if config is None:
                config = self.selection_config
            
            config["last_updated"] = datetime.now().isoformat()
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved document selection config: {len(config.get('documents', {}))} documents tracked")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to save selection config: {e}")
            return False
    
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

