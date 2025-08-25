# Metadata Requirements for Document Chunks

This document outlines the required metadata fields that must be present in all document chunks stored in the Qdrant vector database to ensure proper functionality.

## Required Fields

### Core Fields (Always Required)
- **`document_source`**: The filename of the source document (e.g., "document.pdf")
- **`is_selected`**: Boolean indicating if the chunk is active for search (true/false)
- **`content`**: The actual text content of the chunk
- **`chunk_id`**: Unique identifier for the chunk (e.g., "document.pdf_0")

### Legacy Compatibility Fields
- **`page_content`**: Same as `content` (for backward compatibility)

### Enhanced Metadata Fields
- **`document_type`**: File extension (e.g., "pdf", "csv", "txt")
- **`ingested_at`**: ISO timestamp when the chunk was ingested
- **`chunk_index`**: Index of the chunk within the document (0-based)
- **`total_chunks`**: Total number of chunks in the source document
- **`file_size`**: Size of the source file in bytes
- **`created_at`**: ISO timestamp when the source file was created
- **`modified_at`**: ISO timestamp when the source file was last modified

## Implementation

### Enhanced Document Ingestion
The `add_documents_with_selection_status()` method in `EnhancedQdrantManager` now ensures all required fields are set:

```python
payload = {
    # Core content
    "content": doc.get('page_content', ''),
    "page_content": doc.get('page_content', ''),  # Legacy field
    
    # Document identification
    "document_source": document_source,
    "document_type": file_extension,
    "chunk_id": f"{document_source}_{i}",
    
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
```

### Validation
Use the validation endpoint to check if all chunks have required fields:

```bash
GET /api/documents/validate-metadata
```

This will return:
```json
{
  "success": true,
  "data": {
    "total_chunks": 2172,
    "chunks_with_all_fields": 2172,
    "missing_fields": {},
    "document_sources": ["document1.pdf", "document2.csv"],
    "selection_status": {
      "selected": 1738,
      "deselected": 434
    }
  }
}
```

## Common Issues and Solutions

### Issue: Chunks with `document_source: 'unknown'`
**Cause**: Documents were ingested before metadata requirements were implemented
**Solution**: Run the comprehensive fix script:
```bash
python3 comprehensive_fix.py
```

### Issue: Missing `is_selected` field
**Cause**: Chunks were added without selection status
**Solution**: Run the chunk selection fix:
```bash
python3 fix_chunk_selection.py
```

### Issue: Inconsistent selection status
**Cause**: Document selection changed but chunks weren't updated
**Solution**: Use the refresh endpoint:
```bash
POST /api/documents/refresh-selection
```

## Best Practices

1. **Always validate metadata** after ingesting new documents
2. **Use the enhanced ingestion methods** that set all required fields
3. **Run validation regularly** to catch metadata issues early
4. **Test selection functionality** after making changes to document selection
5. **Monitor logs** for metadata-related warnings

## Future Enhancements

- Add automatic metadata validation during ingestion
- Implement metadata migration tools for legacy data
- Add metadata versioning for schema evolution
- Create metadata quality metrics and alerts
