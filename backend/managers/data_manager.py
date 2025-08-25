# -*- coding: utf-8 -*-
import os
import logging
import gc
import json
from typing import List, Dict, Any
from pathlib import Path
from datetime import datetime
from langchain_community.document_loaders import CSVLoader, DirectoryLoader, PyMuPDFLoader
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from managers.chunking_manager import ChunkingStrategyManager
from config.settings import CHUNK_STRATEGY, CHUNK_SIZE, CHUNK_OVERLAP

# Set up logging
logger = logging.getLogger(__name__)

class DataManager:
    """Manages loading and processing of data from different sources."""

    def __init__(self, data_folder: str):
        self.data_folder = data_folder

    def load_csv_data(self, filename: str = "complaints.csv") -> List[Document]:
        """
        Load CSV data with conditional processing based on filename.
        Uses specific complaint processing for complaints.csv, generic loading for others.
        """
        csv_path = os.path.join(self.data_folder, filename)
        if not os.path.exists(csv_path):
            logger.warning(f"⚠️ CSV file not found: {filename}")
            return []
        try:
            # Determine processing type based on filename
            is_complaints_file = filename.lower() in ["complaints.csv", "student_loans.csv"]
            
            if is_complaints_file:
                return self._load_complaints_csv(csv_path, filename)
            else:
                return self._load_generic_csv(csv_path, filename)
                
        except Exception as e:
            logger.error(f"❌ Error loading CSV: {str(e)}")
            return []

    def _load_complaints_csv(self, csv_path: str, filename: str) -> List[Document]:
        """Load and process complaints CSV with specific business logic."""
        raw_documents = self._load_raw_csv_documents(csv_path, self._get_complaints_csv_metadata_columns())
        if not raw_documents:
            return []
        self._set_page_content_from_narrative(raw_documents)
        filtered_documents = self._apply_complaint_quality_filters(raw_documents)
        gc.collect()
        logger.info(f"✅ Loaded {len(filtered_documents)} valid complaint records from {filename}")
        return filtered_documents.copy()

    def _load_generic_csv(self, csv_path: str, filename: str) -> List[Document]:
        """Load generic CSV file without specific business logic."""
        raw_documents = self._load_raw_csv_documents(csv_path)
        if not raw_documents:
            return []
        processed_documents = self._apply_generic_csv_processing(raw_documents)
        gc.collect()
        logger.info(f"✅ Loaded {len(processed_documents)} records from generic CSV: {filename}")
        return processed_documents.copy()

    def _get_complaints_csv_metadata_columns(self) -> List[str]:
        """
        Get the list of metadata columns for complaints CSV loading.
        """
        return [
            "Date received", "Product", "Sub-product", "Issue", "Sub-issue",
            "Consumer complaint narrative", "Company public response", "Company",
            "State", "ZIP code", "Tags", "Consumer consent provided?",
            "Submitted via", "Date sent to company", "Company response to consumer",
            "Timely response?", "Consumer disputed?", "Complaint ID",
        ]

    def _load_raw_csv_documents(self, csv_path: str, metadata_columns: List[str] = None) -> List[Document]:
        """
        Load raw CSV documents using LangChain CSVLoader.
        """
        if metadata_columns:
            loader = CSVLoader(file_path=csv_path, metadata_columns=metadata_columns)
        else:
            loader = CSVLoader(file_path=csv_path)
        
        logger.info(f"📊 Loading CSV data from: {csv_path}")
        csv_data = loader.load()
        initial_count = len(csv_data)
        logger.info(f"📋 Raw CSV loaded: {initial_count:,} records")
        return csv_data

    def _set_page_content_from_narrative(self, documents: List[Document]) -> None:
        """
        Set the page content for each document from the complaint narrative.
        """
        for doc in documents:
            doc.page_content = doc.metadata["Consumer complaint narrative"]
        logger.info(f"📝 STEP 2 - Page content set: {len(documents):,} records (no change)")

    def _validate_complaint_quality(self, narrative: str) -> List[str]:
        """
        Validate the quality of a complaint narrative.
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
        """
        doc.page_content = (
            f"Customer Issue: {doc.metadata.get('Issue', 'Unknown')}\n"
            f"Product: {doc.metadata.get('Product', 'Unknown')}\n"
            f"Complaint Details: {narrative}"
        )

    def _log_complaint_filter_results(self, filter_stats: Dict[str, int], initial_count: int, final_count: int) -> None:
        """
        Log detailed complaint filter results and statistics.
        """
        logger.info("📊 COMPLAINT FILTER RESULTS:")
        logger.info(f"   ❌ Too short (< 100 chars): {filter_stats['too_short']:,}")
        logger.info(f"   ❌ Too many XXXX (> 5): {filter_stats['too_many_xxxx']:,}")
        logger.info(f"   ❌ Empty/None/N/A: {filter_stats['empty_or_na']:,}")
        logger.info(f"   ⚠️  Multiple issues: {filter_stats['multiple_issues']:,}")
        total_filtered = initial_count - final_count
        retention_rate = (final_count / initial_count) * 100
        logger.info("📈 SUMMARY:")
        logger.info(f"   ✅ Valid records kept: {final_count:,}")
        logger.info(f"   🗑️  Total filtered out: {total_filtered:,}")
        logger.info(f"   📊 Retention rate: {retention_rate:.1f}%")

    def _apply_complaint_quality_filters(self, documents: List[Document]) -> List[Document]:
        """
        Apply complaint-specific quality filters to documents and return valid ones.
        """
        logger.info("🔍 Applying complaint quality filters...")
        filter_stats = {"too_short": 0, "too_many_xxxx": 0, "empty_or_na": 0, "multiple_issues": 0, "valid": 0}
        filtered_docs = []
        for doc in documents:
            narrative = doc.metadata.get("Consumer complaint narrative", "")
            issues = self._validate_complaint_quality(narrative)
            if "length" in issues:
                filter_stats["too_short"] += 1
            if "redaction" in issues:
                filter_stats["too_many_xxxx"] += 1
            if "empty" in issues:
                filter_stats["empty_or_na"] += 1
            if len(issues) > 1:
                filter_stats["multiple_issues"] += 1
            if not issues:
                filter_stats["valid"] += 1
                self._format_valid_document_content(doc, narrative)
                filtered_docs.append(doc)
        self._log_complaint_filter_results(filter_stats, len(documents), len(filtered_docs))
        return filtered_docs

    def _apply_generic_csv_processing(self, documents: List[Document]) -> List[Document]:
        """
        Apply generic processing to CSV documents.
        Sets page content from the first non-empty text field found.
        """
        logger.info("🔍 Applying generic CSV processing...")
        processed_docs = []
        
        for doc in documents:
            # Find the best text content from available fields
            page_content = self._extract_generic_page_content(doc)
            
            if page_content and len(page_content.strip()) > 0:
                doc.page_content = page_content
                processed_docs.append(doc)
            else:
                logger.debug(f"Skipping document with no usable text content")
        
        logger.info(f"✅ Processed {len(processed_docs)} documents with valid content")
        return processed_docs

    def _extract_generic_page_content(self, doc: Document) -> str:
        """
        Extract page content from generic CSV document.
        Looks for common text fields and combines them meaningfully.
        """
        metadata = doc.metadata
        content_parts = []
        
        # Common field names that might contain the main content
        primary_content_fields = [
            'content', 'text', 'description', 'body', 'message', 'narrative', 
            'summary', 'details', 'comment', 'review', 'feedback', 'response'
        ]
        
        # Secondary fields that add context
        context_fields = [
            'title', 'subject', 'name', 'category', 'type', 'status'
        ]
        
        # Look for primary content
        primary_content = None
        for field in primary_content_fields:
            for key, value in metadata.items():
                if field.lower() in key.lower() and value is not None:
                    value_str = str(value).strip()
                    if value_str:
                        primary_content = value_str
                        break
            if primary_content:
                break
        
        # If no primary content found, use the first substantial text field
        if not primary_content:
            for key, value in metadata.items():
                if value and isinstance(value, str) and len(value.strip()) > 20:
                    primary_content = value.strip()
                    break
        
        # Add context fields
        context_parts = []
        for field in context_fields:
            for key, value in metadata.items():
                if field.lower() in key.lower() and value is not None:
                    value_str = str(value).strip()
                    if value_str:
                        context_parts.append(f"{key}: {value_str}")
                        break
        
        # Combine content
        if context_parts:
            content_parts.extend(context_parts)
        
        if primary_content:
            content_parts.append(f"Content: {primary_content}")
        
        # Ensure all parts are strings before joining
        content_parts = [str(part) for part in content_parts if part is not None]
        return "\n".join(content_parts) if content_parts else ""

    def discover_all_csv_files(self) -> List[Document]:
        """
        Automatically discover CSV files and load only selected ones.
        """
        if not os.path.exists(self.data_folder):
            logger.warning(f"⚠️ Data folder not found: {self.data_folder}")
            return []
        
        csv_files = []
        for filename in os.listdir(self.data_folder):
            if filename.lower().endswith('.csv'):
                csv_files.append(filename)
        
        logger.info(f"📊 Found {len(csv_files)} CSV files: {csv_files}")
        
        # Auto-add new files to document selection if they don't exist
        self._ensure_files_in_selection(csv_files)
        
        # Only load selected CSV files
        selected_files = self._get_selected_files(csv_files)
        logger.info(f"📋 Loading {len(selected_files)} selected CSV files: {selected_files}")
        
        all_csv_docs = []
        for filename in selected_files:
            try:
                docs = self.load_csv_data(filename)
                all_csv_docs.extend(docs)
                logger.info(f"✅ Loaded {len(docs)} documents from {filename}")
            except Exception as e:
                logger.error(f"❌ Error loading {filename}: {str(e)}")
        
        logger.info(f"✅ Total CSV documents loaded: {len(all_csv_docs)}")
        return all_csv_docs

    def _get_selected_files(self, filenames: List[str]) -> List[str]:
        """Filter files to only return those marked as selected in document_selection.json."""
        selection_file = os.path.join(self.data_folder, "document_selection.json")
        
        if not os.path.exists(selection_file):
            logger.info("📋 No document_selection.json found, loading all files")
            return filenames
            
        try:
            with open(selection_file, 'r', encoding='utf-8') as f:
                selection_config = json.load(f)
            
            documents = selection_config.get('documents', {})
            selected_files = []
            
            for filename in filenames:
                if filename in documents and documents[filename].get('is_selected', False):
                    selected_files.append(filename)
                    logger.debug(f"✅ {filename} is selected")
                else:
                    logger.debug(f"⏸️ {filename} is not selected, skipping")
            
            return selected_files
                
        except Exception as e:
            logger.error(f"❌ Error reading document selection: {str(e)}")
            return filenames  # Fallback to loading all files

    def _ensure_files_in_selection(self, filenames: List[str]) -> None:
        """Ensure discovered files are added to document_selection.json if missing."""
        selection_file = os.path.join(self.data_folder, "document_selection.json")
        
        if not os.path.exists(selection_file):
            logger.info("📋 No document_selection.json found, files will be loaded directly")
            return
            
        try:
            with open(selection_file, 'r', encoding='utf-8') as f:
                selection_config = json.load(f)
            
            documents = selection_config.get('documents', {})
            updated = False
            
            for filename in filenames:
                if filename not in documents:
                    logger.info(f"📄 Auto-adding {filename} to document selection (not ingested, shows Ingest/Delete buttons)")
                    documents[filename] = {
                        "is_selected": False,
                        "is_ingested": False,
                        "ingested_at": "",
                        "hash": "",
                        "size_bytes": 0,
                        "modified": "",
                        "chunk_count": 0,
                        "auto_discovered": True,
                        "discovery_source": "filesystem"
                    }
                    updated = True
            
            if updated:
                selection_config['last_updated'] = f"{datetime.now().isoformat()}"
                with open(selection_file, 'w', encoding='utf-8') as f:
                    json.dump(selection_config, f, indent=2)
                logger.info("✅ Updated document_selection.json with new files")
                
        except Exception as e:
            logger.error(f"❌ Error updating document selection: {str(e)}")

    def load_json_files(self) -> List[Document]:
        """
        Load JSON files from data folder, excluding config files, only selected ones.
        """
        if not os.path.exists(self.data_folder):
            logger.warning(f"⚠️ Data folder not found: {self.data_folder}")
            return []
        
        json_files = []
        for filename in os.listdir(self.data_folder):
            if (filename.lower().endswith('.json') and 
                not filename.lower().startswith('config') and
                filename != 'document_selection.json'):
                json_files.append(filename)
        
        logger.info(f"📄 Found {len(json_files)} JSON files: {json_files}")
        
        # Auto-add to selection if needed
        self._ensure_files_in_selection(json_files)
        
        # Only load selected JSON files
        selected_files = self._get_selected_files(json_files)
        logger.info(f"📋 Loading {len(selected_files)} selected JSON files: {selected_files}")
        
        json_docs = []
        for filename in selected_files:
            try:
                filepath = os.path.join(self.data_folder, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    import json
                    data = json.load(f)
                
                # Create document from JSON
                doc_dict = {
                    'page_content': json.dumps(data, indent=2),
                    'metadata': {
                        'source': filepath,
                        'filename': filename,
                        'type': 'json'
                    }
                }
                json_docs.append(doc_dict)
                logger.info(f"✅ Loaded JSON file: {filename}")
            except Exception as e:
                logger.error(f"❌ Error loading JSON {filename}: {str(e)}")
        
        logger.info(f"✅ Total JSON documents loaded: {len(json_docs)}")
        return json_docs

    def load_pdf_data(self) -> List[Document]:
        """
        Load PDF documents, but only selected ones.
        """
        pdf_folder = self.data_folder
        if not os.path.exists(pdf_folder):
            logger.warning(f"⚠️ Folder for PDF file(s) not found: {pdf_folder}")
            return []
            
        # Get all PDF files
        pdf_files = [f.name for f in Path(pdf_folder).glob("*.pdf")]
        logger.info(f"📄 Found {len(pdf_files)} PDF files: {pdf_files}")
        
        # Auto-add to selection if needed
        self._ensure_files_in_selection(pdf_files)
        
        # Only load selected PDF files
        selected_files = self._get_selected_files(pdf_files)
        logger.info(f"📋 Loading {len(selected_files)} selected PDF files: {selected_files}")
        
        if not selected_files:
            logger.info("⏸️ No PDF files selected for loading")
            return []
        
        # Load only selected files
        all_docs = []
        for filename in selected_files:
            try:
                file_path = os.path.join(pdf_folder, filename)
                loader = PyMuPDFLoader(file_path)
                docs = loader.load()
                all_docs.extend(docs)
                logger.info(f"✅ Loaded {len(docs)} pages from {filename}")
            except Exception as e:
                logger.error(f"❌ Error loading PDF {filename}: {str(e)}")
        
        gc.collect()
        logger.info(f"✅ Total PDF documents loaded: {len(all_docs)}")
        return all_docs

    def split_documents(self, documents):
        """
        Split hybrid dataset documents into optimal chunks for vector embedding.
        Enhanced to add processed metadata (doc_id, title) to each chunk.
        """
        chunking_manager = ChunkingStrategyManager(
            strategy=list(CHUNK_STRATEGY.keys())[0],
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )
        split_docs = chunking_manager.split_documents(documents)
        
        # Enhance each chunk with processed metadata
        enhanced_chunks = []
        for chunk in split_docs:
            enhanced_chunk = self._enhance_chunk_metadata(chunk)
            enhanced_chunks.append(enhanced_chunk)
        
        logger.info(f"✅ Created {len(enhanced_chunks)} enhanced document chunks with processed metadata")
        return enhanced_chunks

    def _enhance_chunk_metadata(self, chunk):
        """
        Enhance chunk metadata with processed doc_id and title for better identification.
        
        Args:
            chunk: Document chunk from text splitter
            
        Returns:
            Enhanced chunk with doc_id and title metadata
        """
        # Get original source path
        source = chunk.metadata.get("source", "unknown")
        
        # Determine document type and create appropriate title and doc_id
        if source.endswith(".csv"):
            # For CSV complaints: use Company + Product + Issue for meaningful title
            company = chunk.metadata.get("Company", "Unknown Company")
            product = chunk.metadata.get("Product", "Unknown Product") 
            issue = chunk.metadata.get("Issue", "Unknown Issue")
            
            # Create human-readable title
            title = f"{company} - {product}: {issue}"
            doc_id = f"CSV:{os.path.basename(source)}"
            
        elif source.endswith(".pdf"):
            # For PDF documents: use filename as title
            title = os.path.basename(source)
            doc_id = f"PDF:{os.path.basename(source)}"
            
        else:
            # Fallback for other document types
            title = f"Document from {source}" if source != "unknown" else "Unknown Document"
            doc_id = os.path.basename(source) if source != "unknown" else "unknown"
        
        # Add the enhanced metadata to the chunk
        chunk.metadata["doc_id"] = doc_id
        chunk.metadata["title"] = title
        
        return chunk

    def load_all_documents(self) -> List[Document]:
        """
        Load all documents from CSV, JSON, and PDF sources automatically.
        
        Returns:
            List of all loaded documents
        """
        try:
            logger.info("📚 Auto-discovering and loading all documents...")
            
            # Auto-discover all CSV files
            csv_docs = self.discover_all_csv_files()
            logger.info(f"📊 Total CSV documents: {len(csv_docs)}")
            
            # Load JSON files
            json_docs = self.load_json_files()
            logger.info(f"📄 Total JSON documents: {len(json_docs)}")
            
            # Load PDF data
            pdf_docs = self.load_pdf_data()
            logger.info(f"📄 Total PDF documents: {len(pdf_docs)}")
            
            # Combine all documents
            all_docs = csv_docs + json_docs + pdf_docs
            logger.info(f"✅ Total documents loaded: {len(all_docs)}")
            
            return all_docs
            
        except Exception as e:
            logger.error(f"❌ Error loading all documents: {str(e)}")
            return []
