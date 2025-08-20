# -*- coding: utf-8 -*-
from langchain.text_splitter import RecursiveCharacterTextSplitter
import logging

logger = logging.getLogger(__name__)

class ChunkingStrategyManager:
    def __init__(self, strategy, chunk_size, chunk_overlap):
        self.strategy = strategy
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_documents(self, documents):
        logger.info(f"📄 Splitting {len(documents)} documents into chunks (strategy={self.strategy}, size={self.chunk_size}, overlap={self.chunk_overlap})")
        if self.strategy == "recursive":
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap
            )
        else:
            # Default to recursive for now
            logger.warning(f"⚠️ Unknown chunking strategy '{self.strategy}'. Defaulting to 'recursive'.")
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap
            )
        
        logger.info(f"text_splitter: Chunk Size: {text_splitter._chunk_size} | Chunk Overlap: {text_splitter._chunk_overlap}")
        split_docs = text_splitter.split_documents(documents)
        logger.info(f"✅ Created {len(split_docs)} document chunks")
        return split_docs
