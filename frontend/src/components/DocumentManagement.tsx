import React, { useState, useEffect, useRef } from 'react';
import { documentsApi } from '../services/api';
import { DocumentStatus, DocumentInfo } from '../types';
import { logSuccess, logError, logInfo } from '../utils/logger';

interface DocumentManagementProps {
  onStatusChange?: () => void;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ onStatusChange }) => {
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true); // Collapsed by default
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocumentStatus();
  }, []);

  const loadDocumentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsApi.getStatus();
      if (response.success) {
        setDocumentStatus(response.data);
        logInfo('Document status loaded', { component: 'DocumentManagement' });
      } else {
        throw new Error('Failed to load document status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load document status');
      logError(`Failed to load document status: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDocument = async (filename: string) => {
    try {
      setActionLoading(`select-${filename}`);
      const response = await documentsApi.selectDocument(filename);
      if (response.success) {
        await loadDocumentStatus();
        logSuccess(`Document selected and ingested: ${filename}`, { component: 'DocumentManagement' });
        onStatusChange?.();
      } else {
        throw new Error(response.message || 'Failed to select and ingest document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select and ingest document');
      logError(`Failed to select and ingest document ${filename}: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeselectDocument = async (filename: string) => {
    try {
      setActionLoading(`deselect-${filename}`);
      const response = await documentsApi.deselectDocument(filename);
      if (response.success) {
        await loadDocumentStatus();
        logSuccess(`Document deselected: ${filename}`, { component: 'DocumentManagement' });
        onStatusChange?.();
      } else {
        throw new Error(response.message || 'Failed to deselect document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to deselect document');
      logError(`Failed to deselect document ${filename}: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleIngestDocument = async (filename: string) => {
    try {
      setActionLoading(`ingest-${filename}`);
      const response = await documentsApi.ingestDocument(filename);
      if (response.success) {
        await loadDocumentStatus();
        logSuccess(`Document ingested: ${filename}`, { component: 'DocumentManagement' });
        onStatusChange?.();
      } else {
        throw new Error(response.message || 'Failed to ingest document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to ingest document');
      logError(`Failed to ingest document ${filename}: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleIngestPending = async () => {
    try {
      setActionLoading('ingest-pending');
      const response = await documentsApi.ingestPending();
      if (response.success) {
        await loadDocumentStatus();
        logSuccess('Pending documents ingested', { component: 'DocumentManagement' });
        onStatusChange?.();
      } else {
        throw new Error(response.message || 'Failed to ingest pending documents');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to ingest pending documents');
      logError(`Failed to ingest pending documents: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReingestChanged = async () => {
    try {
      setActionLoading('reingest-changed');
      const response = await documentsApi.reingestChanged();
      if (response.success) {
        await loadDocumentStatus();
        logSuccess('Changed documents re-ingested', { component: 'DocumentManagement' });
        onStatusChange?.();
      } else {
        throw new Error(response.message || 'Failed to re-ingest changed documents');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to re-ingest changed documents');
      logError(`Failed to re-ingest changed documents: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    try {
      setActionLoading(`delete-${filename}`);
      const response = await documentsApi.deleteDocument(filename);
      if (response.success) {
        await loadDocumentStatus();
        logSuccess(`Document deleted: ${filename}`, { component: 'DocumentManagement' });
        onStatusChange?.();
      } else {
        throw new Error(response.message || 'Failed to delete document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
      logError(`Failed to delete document ${filename}: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLoadDocuments = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setActionLoading('upload');
      setError(null);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const allowedTypes = ['.pdf', '.csv', '.txt', '.json'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
          throw new Error(`Invalid file type: ${fileExtension}. Allowed types: ${allowedTypes.join(', ')}`);
        }

        const response = await documentsApi.uploadDocument(file);
        if (response.success) {
          logSuccess(`Document uploaded: ${file.name}`, { component: 'DocumentManagement' });
        } else {
          throw new Error(response.message || `Failed to upload ${file.name}`);
        }
      }

      // Reload document status after upload
      await loadDocumentStatus();
      onStatusChange?.();
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload documents');
      logError(`Failed to upload documents: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (isSelected: boolean, isIngested: boolean) => {
    if (!isSelected) return '#dc3545'; // Red for deselected
    if (!isIngested) return '#ffc107'; // Yellow for selected but not ingested
    return '#28a745'; // Green for selected and ingested
  };

  const getStatusText = (isSelected: boolean, isIngested: boolean) => {
    if (!isSelected) return 'Deselected';
    if (!isIngested) return 'Selected (Not Ingested)';
    return 'Selected & Ingested';
  };

  if (loading) {
    return (
      <div className="card">
        <h3>📁 Document Management</h3>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading document status...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h3>📁 Document Management</h3>
        <div style={{ color: '#dc3545', padding: '20px' }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={loadDocumentStatus}
            style={{ 
              marginLeft: '10px', 
              padding: '5px 10px', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!documentStatus) {
    return (
      <div className="card">
        <h3>📁 Document Management</h3>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>No document status available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: isCollapsed ? '0' : '20px',
          cursor: 'pointer',
          padding: '10px 0'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 style={{ margin: 0 }}>📁 Document Management</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {documentStatus?.selection_summary?.total_documents ? (
              <>
                {documentStatus.selection_summary.total_documents} documents
                <span style={{ color: '#28a745', marginLeft: '8px' }}>
                  ({documentStatus.selection_summary.selected_documents} selected
                </span>
                {documentStatus.selection_summary.deselected_documents > 0 && (
                  <span style={{ color: '#dc3545' }}>
                    , {documentStatus.selection_summary.deselected_documents} deselected
                  </span>
                )}
                <span style={{ color: '#28a745' }}>)</span>
              </>
            ) : 'Loading...'}
          </span>
          <span style={{ 
            fontSize: '18px', 
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.2s ease'
          }}>
            ▼
          </span>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadDocuments();
                }}
                disabled={actionLoading === 'upload'}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: actionLoading === 'upload' ? 'not-allowed' : 'pointer',
                  opacity: actionLoading === 'upload' ? 0.6 : 1
                }}
              >
                {actionLoading === 'upload' ? '🔄 Uploading...' : '📁 Load Documents'}
              </button>
              {documentStatus?.selection_summary?.needing_ingestion > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIngestPending();
                  }}
                  disabled={actionLoading === 'ingest-pending'}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: actionLoading === 'ingest-pending' ? 'not-allowed' : 'pointer',
                    opacity: actionLoading === 'ingest-pending' ? 0.6 : 1
                  }}
                >
                  {actionLoading === 'ingest-pending' ? '🔄 Ingesting...' : `📥 Ingest Pending (${documentStatus.selection_summary.needing_ingestion})`}
                </button>
              )}
              {documentStatus?.selection_summary?.needing_reingestion > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReingestChanged();
                  }}
                  disabled={actionLoading === 'reingest-changed'}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: actionLoading === 'reingest-changed' ? 'not-allowed' : 'pointer',
                    opacity: actionLoading === 'reingest-changed' ? 0.6 : 1
                  }}
                >
                  {actionLoading === 'reingest-changed' ? '🔄 Re-ingesting...' : `🔄 Re-ingest Changed (${documentStatus.selection_summary.needing_reingestion})`}
                </button>
              )}
            </div>
          </div>

          {/* Hidden file input for document upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.txt,.json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* Summary Statistics - Compact */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: '10px', 
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                {documentStatus?.selection_summary?.total_documents || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Docs</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                {documentStatus?.selection_summary?.selected_documents || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Selected</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                {documentStatus?.selection_summary?.deselected_documents || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Deselected</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#17a2b8' }}>
                {documentStatus?.qdrant_statistics?.total_chunks || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Chunks</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                {documentStatus?.qdrant_statistics?.selected_chunks || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Active Chunks</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6c757d' }}>
                {documentStatus?.qdrant_statistics?.deselected_chunks || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Retained Chunks</div>
            </div>
          </div>

          {/* Document List - Compact */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '16px' }}>📄 Document List</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {documentStatus?.documents?.sort((a, b) => {
                // Sort priority: deselected first, then not-ingested, then selected & ingested
                if (!a.is_selected && b.is_selected) return -1;
                if (a.is_selected && !b.is_selected) return 1;
                if (a.is_selected && b.is_selected) {
                  if (!a.is_ingested && b.is_ingested) return -1;
                  if (a.is_ingested && !b.is_ingested) return 1;
                }
                return a.filename.localeCompare(b.filename);
              }).map((doc: DocumentInfo) => (
                <div
                  key={doc.filename}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    padding: '10px',
                    marginBottom: '8px',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        marginBottom: '6px' 
                      }}>
                        <span style={{ 
                          padding: '2px 6px', 
                          borderRadius: '3px', 
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          backgroundColor: getStatusColor(doc.is_selected, doc.is_ingested),
                          color: 'white'
                        }}>
                          {getStatusText(doc.is_selected, doc.is_ingested)}
                        </span>
                        {doc.has_changed && (
                          <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: '3px', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            backgroundColor: '#ffc107',
                            color: '#212529'
                          }}>
                            🔄 Changed
                          </span>
                        )}
                      </div>
                      
                      <div style={{ 
                        fontWeight: 'bold', 
                        marginBottom: '4px',
                        fontSize: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        📄 {doc.filename}
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        gap: '12px', 
                        fontSize: '12px', 
                        color: '#666' 
                      }}>
                        <span>📊 {formatFileSize(doc.size_bytes)}</span>
                        <span>🔢 {doc.chunk_count} chunks</span>
                        <span>📝 {doc.file_type.toUpperCase()}</span>
                        <span>📅 {formatDate(doc.modified)}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                      {doc.is_selected ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeselectDocument(doc.filename);
                          }}
                          disabled={actionLoading === `deselect-${doc.filename}`}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: actionLoading === `deselect-${doc.filename}` ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === `deselect-${doc.filename}` ? 0.6 : 1
                          }}
                        >
                          {actionLoading === `deselect-${doc.filename}` ? '🔄 Deselecting' : '❌ Deselect'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectDocument(doc.filename);
                            }}
                            disabled={actionLoading === `select-${doc.filename}`}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '11px',
                              cursor: actionLoading === `select-${doc.filename}` ? 'not-allowed' : 'pointer',
                              opacity: actionLoading === `select-${doc.filename}` ? 0.6 : 1
                            }}
                          >
                            {actionLoading === `select-${doc.filename}` ? '🔄 Selecting & Ingesting' : '✅ Select & Ingest'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.filename);
                            }}
                            disabled={actionLoading === `delete-${doc.filename}`}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '11px',
                              cursor: actionLoading === `delete-${doc.filename}` ? 'not-allowed' : 'pointer',
                              opacity: actionLoading === `delete-${doc.filename}` ? 0.6 : 1
                            }}
                          >
                            {actionLoading === `delete-${doc.filename}` ? '🔄 Deleting' : '🗑️ Delete'}
                          </button>
                        </>
                      )}
                      
                      {doc.is_selected && !doc.is_ingested && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIngestDocument(doc.filename);
                          }}
                          disabled={actionLoading === `ingest-${doc.filename}`}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: actionLoading === `ingest-${doc.filename}` ? 'not-allowed' : 'pointer',
                            opacity: actionLoading === `ingest-${doc.filename}` ? 0.6 : 1
                          }}
                        >
                          {actionLoading === `ingest-${doc.filename}` ? '🔄 Ingesting' : '📥 Ingest'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last Updated */}
          <div style={{ 
            fontSize: '11px', 
            color: '#666', 
            textAlign: 'center', 
            padding: '8px',
            borderTop: '1px solid #e9ecef',
            marginTop: '10px'
          }}>
            Last updated: {documentStatus ? formatDate(documentStatus.last_updated) : 'Unknown'}
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentManagement;
