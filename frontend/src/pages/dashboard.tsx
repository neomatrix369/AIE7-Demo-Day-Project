import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import usePageNavigation from '../hooks/usePageNavigation';
import { corpusApi } from '../services/api';
import { CorpusStatus } from '../types';
import { logSuccess, logInfo, logNavigation } from '../utils/logger';
import { LABEL_RESULTS, LABEL_HEATMAP } from '../utils/constants';
import NavigationHeader from '../components/NavigationHeader';
import { useApiCall } from '../hooks/useApiCall';
import LoadingDisplay from '../components/ui/LoadingDisplay';
import ErrorDisplay from '../components/ui/ErrorDisplay';
import BalloonTooltip from '../components/ui/BalloonTooltip';
import ExperimentStatusIndicator from '../components/ui/ExperimentStatusIndicator';
import VectorDbStatusIndicator from '../components/ui/VectorDbStatusIndicator';
import DocumentManagement from '../components/DocumentManagement';

const DataLoadingDashboard: React.FC = () => {
  const { data: corpusStatus, loading, error, execute, setData } = useApiCall<CorpusStatus>();
  

  const router = useRouter();
  const { goTo } = usePageNavigation('Dashboard');
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  useEffect(() => {
    execute(
      corpusApi.getStatus,
      { component: 'Dashboard', action: 'FETCH_CORPUS_STATUS' }
    );
  }, [execute]);

  const handleProceedToQuestions = () => {
    goTo('/questions', 'Questions', { action: 'NAVIGATE_TO_QUESTIONS' });
  };

  const handleManageExperiments = () => {
    goTo('/experiments', 'Experiments', { action: 'NAVIGATE_TO_EXPERIMENTS' });
  };

  if (loading) {
    return (
      <LoadingDisplay 
        title="Loading Corpus Status..."
        message="Loading document corpus and vector database..."
        subMessage="This may take a few moments for first-time loading"
      />
    );
  }

  if (error || !corpusStatus) {
    return (
      <ErrorDisplay 
        error={error}
        title="Error Loading Corpus"
        context="This may be due to the backend taking time to initialize the document corpus and vector database. Please wait a moment and refresh the page."
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Handle backend error status
  if (corpusStatus.status === 'error' || corpusStatus.error_message) {
    return (
      <div>
        <NavigationHeader currentPage="dashboard" />
        <VectorDbStatusIndicator position="top-left" />
        <ExperimentStatusIndicator />
        <DocumentManagement onCorpusUpdate={setData} />
        <div className="card">
          <ErrorDisplay 
            error={{
              message: corpusStatus.error_message || 'Unknown error',
              type: 'CorpusError'
            }}
            title="Corpus Not Ready"
            context={corpusStatus.corpus_metadata?.message || "The document corpus is not properly loaded. Please ingest documents using the Document Management section above."}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // Handle partial status (documents tracked but not yet ingested)
  if (corpusStatus.status === 'partial' || corpusStatus.documents_tracked) {
    return (
      <div>
        <NavigationHeader currentPage="dashboard" />
        <VectorDbStatusIndicator position="top-left" />
        <ExperimentStatusIndicator />
        <DocumentManagement onCorpusUpdate={setData} />
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2 style={{ color: '#856404', marginBottom: '20px' }}>📋 Documents Tracked - Ready for Ingestion</h2>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '20px' }}>
              {corpusStatus.document_count} documents have been selected and are ready for processing
            </div>
            <div style={{ fontSize: '14px', color: '#856404', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <strong>Next Step:</strong> Use the Document Management section above to ingest your selected documents into the vector database.
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              Once documents are ingested, you&apos;ll be able to run experiments and analyze your corpus.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavigationHeader currentPage="dashboard" />
      <VectorDbStatusIndicator position="top-left" />
      <ExperimentStatusIndicator />
              <DocumentManagement onCorpusUpdate={setData} />
      <div className="card">
          <h2>🔍 RagCheck - Ready to Analyze</h2>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
            Pre-loaded corpus ready for analysis
          </p>
        
        <div className="card" style={{ backgroundColor: '#f8f9fa', marginBottom: '20px' }}>
          <h3>🗂️ Corpus Overview</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{corpusStatus.document_count}</span>
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Selected Documents</span>
                <BalloonTooltip 
                  content="Number of physical files (PDF, CSV, MD, etc.) currently selected and active for search. Each file counts as one document, regardless of size."
                  maxWidth={280} 
                  cursor="help"
                >
                  <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                </BalloonTooltip>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corpusStatus.chunk_count}</span>
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Active Chunks</span>
                <BalloonTooltip 
                  content="Number of chunks from selected documents that are actively used in search and analysis. Only chunks from selected documents are counted."
                  maxWidth={280} 
                  cursor="help"
                >
                  <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                </BalloonTooltip>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corpusStatus.corpus_metadata.total_size_mb} MB</span>
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Selected Size</span>
                <BalloonTooltip 
                  content="Combined size of selected documents in megabytes. Only selected documents contribute to the active corpus size."
                  maxWidth={280} 
                  cursor="help"
                >
                  <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                </BalloonTooltip>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corpusStatus.corpus_metadata.avg_doc_length}</span>
              <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Avg Selected Doc Length</span>
                <BalloonTooltip 
                  content="Average character length of selected documents. This represents the typical size of documents currently active for search."
                  maxWidth={280} 
                  cursor="help"
                >
                  <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                </BalloonTooltip>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Embedding Model:</strong> 
            <span>{corpusStatus.embedding_model}</span>
            <BalloonTooltip 
              content="The AI model used to convert text chunks into vector embeddings for semantic search. OpenAI's text-embedding-3-small provides 1536-dimensional vectors optimized for retrieval quality."
              maxWidth={320} 
              cursor="help"
            >
              <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
            </BalloonTooltip>
          </div>
          
          {/* Selection-aware chunk statistics */}
          {(corpusStatus.selected_chunks !== undefined || corpusStatus.deselected_chunks !== undefined) && (
            <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #dee2e6' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#495057' }}>📊 Chunk Selection Status</h4>
              <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>{corpusStatus.selected_chunks || 0}</span>
                  <span>Active Chunks</span>
                  <BalloonTooltip 
                    content="Number of chunks from selected documents that are actively used in search and analysis."
                    maxWidth={250} 
                    cursor="help"
                  >
                    <span style={{ fontSize: '1rem', color: '#28a745', opacity: 0.8 }}>ℹ️</span>
                  </BalloonTooltip>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#6c757d', fontWeight: 'bold' }}>{corpusStatus.deselected_chunks || 0}</span>
                  <span>Retained Chunks</span>
                  <BalloonTooltip 
                    content="Number of chunks from deselected documents that are retained but excluded from search results."
                    maxWidth={250} 
                    cursor="help"
                  >
                    <span style={{ fontSize: '1rem', color: '#6c757d', opacity: 0.8 }}>ℹ️</span>
                  </BalloonTooltip>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ backgroundColor: '#e8f4fd', marginBottom: '30px' }}>
          <h3>📈 Document Distribution Preview</h3>
          <div className="two-column">
            <div>
              <h4>Document Distribution</h4>
              <div style={{ padding: '10px' }}>
                {/* Show selected documents by type */}
                {Object.entries(corpusStatus.corpus_metadata.selected_by_type || {}).map(([type, count]) => (
                  <div key={`selected-${type}`} style={{ marginBottom: '8px' }}>
                    <span style={{ textTransform: 'uppercase', fontWeight: 'bold', color: '#28a745' }}>{type}</span>: {count} selected
                  </div>
                ))}
                {/* Show deselected documents by type */}
                {Object.entries(corpusStatus.corpus_metadata.deselected_by_type || {}).map(([type, count]) => (
                  <div key={`deselected-${type}`} style={{ marginBottom: '8px' }}>
                    <span style={{ textTransform: 'uppercase', fontWeight: 'bold', color: '#6c757d' }}>{type}</span>: {count} deselected
                  </div>
                ))}
                {/* Show total by type if no selection breakdown available */}
                {(!corpusStatus.corpus_metadata.selected_by_type || Object.keys(corpusStatus.corpus_metadata.selected_by_type).length === 0) &&
                 (!corpusStatus.corpus_metadata.deselected_by_type || Object.keys(corpusStatus.corpus_metadata.deselected_by_type).length === 0) &&
                 Object.entries(corpusStatus.corpus_metadata.document_types).map(([type, count]) => (
                  <div key={type} style={{ marginBottom: '8px' }}>
                    <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{type}</span>: {count} documents
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4>Quick Metrics</h4>
              <div style={{ padding: '10px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Status:</strong> <span style={{ color: '#28a745' }}>✅ Ready for Analysis</span>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Quality:</strong> <span style={{ color: '#007bff' }}>Pre-processed & Indexed</span>
                </div>
                <div>
                  <strong>Coverage:</strong> <span style={{ color: '#6f42c1' }}>Multi-domain Content</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <button 
              className="button" 
              onClick={handleProceedToQuestions}
              style={{ fontSize: '18px', padding: '15px 30px' }}
            >
              Proceed to Question Analysis →
            </button>
            
            <button 
              className="button button-secondary" 
              onClick={handleManageExperiments}
              style={{ fontSize: '18px', padding: '15px 30px', backgroundColor: '#6f42c1' }}
            >
              📁 Manage Experiments
            </button>
            
            <button 
              className="button button-secondary" 
              onClick={() => goTo('/results', LABEL_RESULTS, { 
                action: 'NAVIGATE_TO_RESULTS_FROM_DASHBOARD', 
                data: { total_chunks: corpusStatus?.chunk_count || 0 } 
              })}
              style={{ fontSize: '18px', padding: '15px 30px', backgroundColor: '#28a745' }}
            >
              📊 View Results
            </button>
            
            <button 
              className="button button-secondary" 
              onClick={() => goTo('/heatmap', LABEL_HEATMAP, { 
                action: 'NAVIGATE_TO_HEATMAP_FROM_DASHBOARD', 
                data: { total_documents: corpusStatus?.document_count || 0 } 
              })}
              style={{ fontSize: '18px', padding: '15px 30px', backgroundColor: '#007bff' }}
            >
              🗺️ Interactive Heatmap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataLoadingDashboard;