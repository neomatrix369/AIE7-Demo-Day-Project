import React, { useState, useEffect, useRef, useCallback } from 'react';
import { documentsApi } from '../services/api';
import { DocumentStatus, DocumentInfo } from '../types';
import { logSuccess, logError, logInfo } from '../utils/logger';
import { createStorageAdapter, isVercelDeployment } from '../services/storage';
import { DocumentConfig } from '../services/storage/StorageAdapter';

interface DocumentManagementProps {
  onStatusChange?: () => void;
}

interface IngestionProgress {
  filename: string;
  stage: string;
  percentage: number;
  message: string;
  timestamp: string;
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({ onStatusChange }) => {
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true); // Collapsed by default
  const [ingestionProgress, setIngestionProgress] = useState<IngestionProgress | null>(null);
  const [documentConfig, setDocumentConfig] = useState<DocumentConfig | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get storage adapter (cloud-compatible)
  const storageAdapter = createStorageAdapter();

  const syncWithStorageAdapter = useCallback(async (status: DocumentStatus) => {
    try {
      // Convert DocumentStatus to DocumentConfig format
      const config: DocumentConfig = {
        version: "1.0",
        last_updated: new Date().toISOString(),
        documents: {},
        settings: {
          auto_ingest_new: true,
          retain_deselected: true
        }
      };
      
      // Convert documents to config format
      status.documents.forEach(doc => {
        config.documents[doc.filename] = {
          is_selected: doc.is_selected,
          is_ingested: doc.is_ingested,
          ingested_at: doc.ingested_at,
          hash: doc.hash,
          size_bytes: doc.size_bytes,
          modified: doc.modified,
          chunk_count: doc.chunk_count
        };
      });
      
      // Save to storage adapter - use fresh adapter instance to avoid stale closures
      const currentStorageAdapter = createStorageAdapter();
      await currentStorageAdapter.saveDocumentConfig(config);
      setDocumentConfig(config);
      
      logInfo('Document config synced to browser storage', { component: 'DocumentManagement' });
    } catch (err) {
      logError(`Failed to sync with storage adapter: ${err}`, { component: 'DocumentManagement' });
    }
  }, []); // Empty deps - using fresh adapter instance inside
  
  const loadFromStorageAdapter = useCallback(async () => {
    try {
      // Use fresh adapter instance to avoid stale closures
      const currentStorageAdapter = createStorageAdapter();
      const configResponse = await currentStorageAdapter.loadDocumentConfig();
      
      if (configResponse.success && configResponse.config) {
        // Convert DocumentConfig back to DocumentStatus format
        const documentInfo: DocumentInfo[] = Object.entries(configResponse.config.documents).map(([filename, doc]) => ({
          filename,
          full_path: `./data/${filename}`,
          file_type: filename.split('.').pop() || 'unknown',
          size_bytes: doc.size_bytes,
          modified: doc.modified,
          hash: doc.hash,
          is_selected: doc.is_selected,
          is_ingested: doc.is_ingested,
          ingested_at: doc.ingested_at,
          chunk_count: doc.chunk_count,
          has_changed: false
        }));
        
        // Create status from config (not mock data - this is real data from storage)
        const status: DocumentStatus = {
          selection_summary: {
            total_documents: documentInfo.length,
            selected_documents: documentInfo.filter(d => d.is_selected).length,
            deselected_documents: documentInfo.filter(d => !d.is_selected).length,
            ingested_documents: documentInfo.filter(d => d.is_ingested).length,
            needing_ingestion: documentInfo.filter(d => d.is_selected && !d.is_ingested).length,
            needing_reingestion: 0,
            last_updated: configResponse.config.last_updated
          },
          qdrant_statistics: {
            total_chunks: documentInfo.reduce((sum, d) => sum + d.chunk_count, 0),
            selected_chunks: documentInfo.filter(d => d.is_selected).reduce((sum, d) => sum + d.chunk_count, 0),
            deselected_chunks: documentInfo.filter(d => !d.is_selected).reduce((sum, d) => sum + d.chunk_count, 0),
            document_sources: {},
            collection_name: 'student_loan_corpus'
          },
          documents: documentInfo,
          last_updated: configResponse.config.last_updated
        };
        
        setDocumentStatus(status);
        setDocumentConfig(configResponse.config);
        logInfo('Document status loaded from browser storage', { component: 'DocumentManagement' });
      } else {
        throw new Error('No document configuration found in browser storage. Please refresh the page or contact support if the issue persists.');
      }
    } catch (err) {
      logError(`Failed to load from storage adapter: ${err}`, { component: 'DocumentManagement' });
      throw err;
    }
  }, []); // Empty deps - using fresh adapter instance inside

  // Use useRef to store stable function references and prevent infinite loops
  const loadDocumentStatusRef = useRef<() => Promise<void>>();
  
  const loadDocumentStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Debounce: don't refresh more than once every 5 seconds
      const now = Date.now();
      if (now - lastRefreshTime < 5000) {
        setLoading(false);
        return;
      }
      setLastRefreshTime(now);
      
      const response = await documentsApi.getStatus();
      if (response.success) {
        setDocumentStatus(response.data);
        // Sync with storage adapter for cloud deployments
        if (isVercelDeployment()) {
          await syncWithStorageAdapter(response.data);
        }
        logInfo('Document status loaded successfully', { component: 'DocumentManagement' });
      } else {
        throw new Error('Failed to load document status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load document status');
      logError(`Failed to load document status: ${err.message}`, { component: 'DocumentManagement' });
    } finally {
      setLoading(false);
    }
  }, [lastRefreshTime, syncWithStorageAdapter]);

  // Progress display component
  const ProgressDisplay = ({ progress }: { progress: IngestionProgress }) => {
    const getStageColor = (stage: string) => {
      switch (stage.toLowerCase()) {
        case 'loading': return '#007bff';
        case 'chunking': return '#17a2b8';
        case 'embedding_start':
        case 'embedding': return '#ffc107';
        case 'database': return '#28a745';
        case 'complete': return '#28a745';
        case 'error': return '#dc3545';
        default: return '#6c757d';
      }
    };

    const getStageIcon = (stage: string) => {
      switch (stage.toLowerCase()) {
        case 'loading': return '📄';
        case 'chunking': return '✂️';
        case 'embedding_start':
        case 'embedding': return '🧠';
        case 'database': return '💾';
        case 'complete': return '✅';
        case 'error': return '❌';
        default: return '⏳';
      }
    };

    return (
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '20px', marginRight: '10px' }}>
            {getStageIcon(progress.stage)}
          </span>
          <div>
            <div style={{ fontWeight: 'bold', color: '#333' }}>
              {progress.filename}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>
              {progress.message}
            </div>
          </div>
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress.percentage}%`,
              height: '100%',
              backgroundColor: getStageColor(progress.stage),
              transition: 'width 0.3s ease-in-out',
              borderRadius: '4px'
            }} />
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {progress.percentage}% complete
          </div>
          <div style={{ color: '#999', fontSize: '12px' }}>
            {new Date(progress.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;
    
    const checkProgress = async () => {
      try {
        const response = await fetch('/api/documents/ingestion-progress');
        const data = await response.json();
        
        if (data.success && data.data && Object.keys(data.data).length > 0) {
          // Get the first active progress
          const progressEntries = Object.entries(data.data);
          const [filename, progressData] = progressEntries[0] as [string, any];
          
          if (progressData && progressData.stage) {
            setIngestionProgress({
              filename: progressData.filename || filename,
              stage: progressData.stage,
              percentage: progressData.percentage || 0,
              message: progressData.message || 'Processing...',
              timestamp: progressData.timestamp || new Date().toISOString()
            });
            
            // Stop polling if complete or error
            if (progressData.stage === 'complete' || progressData.stage === 'error') {
              if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
              }
              
              setTimeout(() => {
                setIngestionProgress(null);
                if (progressData.stage === 'complete') {
                  loadDocumentStatus();
                }
              }, 3000);
            }
          }
        } else {
          // No active progress, clear any existing progress
          setIngestionProgress(null);
        }
      } catch (err) {
        logError(`Failed to check progress: ${err}`, { component: 'DocumentManagement' });
      }
    };
    
    // Start polling when component mounts
    progressInterval = setInterval(checkProgress, 2000);
    
    // Cleanup on unmount
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [loadDocumentStatus]);

  useEffect(() => {
    loadDocumentStatus();
  }, [loadDocumentStatus]); // Include loadDocumentStatus in dependencies

  const handleSelectDocument = async (filename: string) => {
    try {
      setActionLoading(`select-${filename}`);
      const response = await documentsApi.selectDocument(filename);
      if (response.success) {
        // Update local state immediately
        setDocumentStatus(prevStatus => {
          if (!prevStatus) return prevStatus;
          return {
            ...prevStatus,
            documents: prevStatus.documents.map(doc => 
              doc.filename === filename ? { ...doc, is_selected: true } : doc
            )
          };
        });
        logSuccess(`Document selected: ${filename}`, { component: 'DocumentManagement' });
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
        // Update local state immediately
        setDocumentStatus(prevStatus => {
          if (!prevStatus) return prevStatus;
          return {
            ...prevStatus,
            documents: prevStatus.documents.map(doc => 
              doc.filename === filename ? { ...doc, is_selected: false } : doc
            )
          };
        });
        logSuccess(`Document deselected: ${filename}`, { component: 'DocumentManagement' });
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
      setError(null);
      
      // Initialize progress display
      setIngestionProgress({
        filename, 
        stage: 'Starting', 
        percentage: 0, 
        message: 'Starting ingestion process...', 
        timestamp: new Date().toISOString()
      });
      
      const response = await documentsApi.ingestDocument(filename);
      
      if (response.success) {
        // The backend now starts ingestion asynchronously
        // Progress updates will come via WebSocket
        logInfo(`Ingestion started for ${filename}. Monitoring progress...`, { component: 'DocumentManagement' });
        
        // Don't clear progress here - let WebSocket handle it
        // The progress will be updated in real-time via WebSocket
      } else {
        throw new Error(response.message || 'Failed to start ingestion');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start ingestion');
      setIngestionProgress({
        filename, 
        stage: 'Error', 
        percentage: 0, 
        message: `Error: ${err.message}`, 
        timestamp: new Date().toISOString()
      });
      logError(`Failed to start ingestion for ${filename}: ${err.message}`, { component: 'DocumentManagement' });
      setTimeout(() => setIngestionProgress(null), 5000);
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

  const handleClearCache = async () => {
    try {
      setActionLoading('clear-cache');
      const response = await storageAdapter.clearDocumentConfig();
      if (response.success) {
        // Force reload from backend
        await loadDocumentStatus();
        logSuccess('Document cache cleared', { component: 'DocumentManagement' });
        onStatusChange?.();
      } else {
        throw new Error(response.message || 'Failed to clear document cache');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to clear document cache');
      logError(`Failed to clear document cache: ${err.message}`, { component: 'DocumentManagement' });
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
        const allowedTypes = ['.pdf', '.csv', '.txt', '.md', '.json'];
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
    if (!isIngested) return '#fd7e14'; // Orange for selected but not ingested (better contrast)
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
        <div style={{ padding: '20px' }}>
          <div style={{ 
            backgroundColor: '#f8d7da', 
            border: '1px solid #f5c6cb', 
            borderRadius: '4px', 
            padding: '15px',
            marginBottom: '15px'
          }}>
            <div style={{ color: '#721c24', marginBottom: '10px' }}>
              <strong>⚠️ Unable to Load Document Status</strong>
            </div>
            <div style={{ color: '#721c24', fontSize: '14px', marginBottom: '15px' }}>
              {error}
            </div>
            <div style={{ fontSize: '12px', color: '#856404', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
              <strong>💡 Troubleshooting:</strong>
              <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                <li>Check your internet connection</li>
                <li>Ensure the backend server is running</li>
                <li>Try refreshing the page</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
          </div>
          <button 
            onClick={loadDocumentStatus}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Retry Loading
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
          <div style={{ fontSize: '18px', color: '#666', marginBottom: '10px' }}>
            📋 No Document Status Available
          </div>
          <div style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>
            Document information could not be loaded. This may be due to:
          </div>
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              <li>No documents have been loaded yet</li>
              <li>Backend service is not running</li>
              <li>Database connection issues</li>
              <li>Configuration problems</li>
            </ul>
          </div>
          <button 
            onClick={loadDocumentStatus}
            style={{ 
              marginTop: '20px',
              padding: '8px 16px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Try Again
          </button>
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

      {/* Progress Display */}
      {ingestionProgress && (
        <ProgressDisplay progress={ingestionProgress} />
      )}

      {!isCollapsed && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isVercelDeployment() && (
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearCache();
                }}
                disabled={actionLoading === 'clear-cache'}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: actionLoading === 'clear-cache' ? 'not-allowed' : 'pointer',
                  opacity: actionLoading === 'clear-cache' ? 0.6 : 1
                }}
              >
                {actionLoading === 'clear-cache' ? '🔄 Clearing...' : '🗑️ Clear Cache'}
              </button>
            </div>
          </div>

          {/* Vercel deployment notice */}
          {isVercelDeployment() && (
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '12px',
              color: '#6c757d'
            }}>
              <strong>🌐 Vercel Deployment Notice:</strong> Document upload is not available in cloud deployment. 
              Documents are pre-loaded and managed through the backend. Use the document selection controls below to manage which documents are active for analysis.
            </div>
          )}

          {/* Hidden file input for document upload - only in local development */}
          {!isVercelDeployment() && (
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.txt,.md,.json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          )}

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
                    
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0, position: 'relative' }}>
                      {doc.is_ingested ? (
                        // Ingested files: Show Select/Deselect toggle
                        <>
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
                              {actionLoading === `select-${doc.filename}` ? '🔄 Selecting' : '✅ Select'}
                            </button>
                          )}
                        </>
                      ) : (
                        // Not ingested files: Always show Ingest and Delete buttons
                        <>
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
                            {actionLoading === `ingest-${doc.filename}` ? '🔄 Ingesting...' : '📥 Ingest'}
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
