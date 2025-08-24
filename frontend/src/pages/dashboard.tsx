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
  const { data: corpusStatus, loading, error, execute } = useApiCall<CorpusStatus>();
  const router = useRouter();
  const { goTo } = usePageNavigation('Dashboard');
  const [documentStatusChanged, setDocumentStatusChanged] = useState(false);

  useEffect(() => {
    execute(
      corpusApi.getStatus,
      { component: 'Dashboard', action: 'FETCH_CORPUS_STATUS' }
    );
  }, [execute]);

  // Refresh corpus status when document status changes
  useEffect(() => {
    if (documentStatusChanged) {
      execute(
        corpusApi.getStatus,
        { component: 'Dashboard', action: 'REFRESH_CORPUS_STATUS' }
      );
      setDocumentStatusChanged(false);
    }
  }, [documentStatusChanged, execute]);

  const handleDocumentStatusChange = () => {
    setDocumentStatusChanged(true);
  };

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

  return (
    <div>
      <NavigationHeader currentPage="dashboard" />
      <VectorDbStatusIndicator position="top-left" />
      <ExperimentStatusIndicator />
      <DocumentManagement onStatusChange={handleDocumentStatusChange} />
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
                <span>Documents Loaded</span>
                <BalloonTooltip 
                  content="Total number of documents processed and loaded into the vector database. Each document is analyzed and split into searchable chunks."
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
                <span>Chunks Indexed</span>
                <BalloonTooltip 
                  content="Total number of text chunks created from documents. Each chunk is embedded and stored in the vector database for semantic search during RAG queries."
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
                <span>Total Size</span>
                <BalloonTooltip 
                  content="Combined size of all processed documents in megabytes. Larger corpora provide more comprehensive knowledge but may affect retrieval performance."
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
                <span>Avg Document Length</span>
                <BalloonTooltip 
                  content="Average character length of documents in the corpus. Longer documents typically contain more detailed information but are split into more chunks."
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
        </div>

        <div className="card" style={{ backgroundColor: '#e8f4fd', marginBottom: '30px' }}>
          <h3>📈 Corpus Health Preview</h3>
          <div className="two-column">
            <div>
              <h4>Document Distribution</h4>
              <div style={{ padding: '10px' }}>
                {Object.entries(corpusStatus.corpus_metadata.document_types).map(([type, count]) => (
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