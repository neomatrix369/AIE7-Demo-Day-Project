# -*- coding: utf-8 -*-
import os
import logging
import gc
from typing import List, Dict, Any
from pathlib import Path
from langchain_community.document_loaders import CSVLoader, DirectoryLoader, PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Set up logging
logger = logging.getLogger(__name__)

class DataManager:
    """Manages loading and processing of data from different sources."""

    def __init__(self, data_folder: str):
        self.data_folder = data_folder

    def load_csv_data(self, filename: str = "complaints.csv") -> List[Dict[str, Any]]:
        """
        Load CSV data and return as list of dictionaries.
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
        """
        return [
            "Date received", "Product", "Sub-product", "Issue", "Sub-issue",
            "Consumer complaint narrative", "Company public response", "Company",
            "State", "ZIP code", "Tags", "Consumer consent provided?",
            "Submitted via", "Date sent to company", "Company response to consumer",
            "Timely response?", "Consumer disputed?", "Complaint ID",
        ]

    def _load_raw_csv_documents(self, csv_path: str) -> List[Dict[str, Any]]:
        """
        Load raw CSV documents using LangChain CSVLoader.
        """
        loader = CSVLoader(file_path=csv_path, metadata_columns=self._get_csv_metadata_columns())
        logger.info(f"📊 Loading student loan complaints from: {csv_path}")
        loan_complaint_data = loader.load()
        initial_count = len(loan_complaint_data)
        logger.info(f"📋 STEP 1 - Raw CSV loaded: {initial_count:,} records")
        return loan_complaint_data

    def _set_page_content_from_narrative(self, documents: List[Dict[str, Any]]) -> None:
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

    def _log_filter_results(self, filter_stats: Dict[str, int], initial_count: int, final_count: int) -> None:
        """
        Log detailed filter results and statistics.
        """
        logger.info("📊 FILTER RESULTS:")
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

    def _apply_quality_filters(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Apply quality filters to documents and return valid ones.
        """
        logger.info("🔍 STEP 3 - Applying quality filters...")
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
        self._log_filter_results(filter_stats, len(documents), len(filtered_docs))
        return filtered_docs

    def load_pdf_data(self) -> List[Dict[str, Any]]:
        """
        Load PDF file metadata (without actual content processing).
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
        """
        logger.info(f"📄 Splitting {len(documents)} documents into chunks (size=750, overlap=100)")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=750, chunk_overlap=100)
        logger.info(f"text_splitter: Chunk Size: {text_splitter._chunk_size} | Chunk Overlap: {text_splitter._chunk_overlap}")
        split_docs = text_splitter.split_documents(documents)
        logger.info(f"✅ Created {len(split_docs)} document chunks")
        return split_docs
