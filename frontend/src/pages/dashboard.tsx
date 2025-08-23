import React, { useEffect } from 'react';
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

const DataLoadingDashboard: React.FC = () => {
  const { data: corpusStatus, loading, error, execute } = useApiCall<CorpusStatus>();
  const router = useRouter();
  const { goTo } = usePageNavigation('Dashboard');

  useEffect(() => {
    const fetchCorpusStatus = async () => {
      logInfo('Starting corpus status check', { 
        component: 'Dashboard',
        action: 'CORPUS_LOAD_START'
      });
      
      const data = await execute(
        () => corpusApi.getStatus(),
        { 
          component: 'Dashboard', 
          action: 'CORPUS_LOAD', 
          userMessage: 'Failed to load corpus status' 
        }
      );
      
      if (data) {
        logSuccess(`Corpus loaded: ${data.document_count} documents, ${data.chunk_count} chunks`, {
          component: 'Dashboard',
          action: 'CORPUS_LOAD_SUCCESS',
          data: {
            documents: data.document_count,
            chunks: data.chunk_count,
            embedding_model: data.embedding_model,
            corpus_loaded: data.corpus_loaded
          }
        });
      }
    };

    fetchCorpusStatus();
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

  return (
    <div>
      <NavigationHeader currentPage="dashboard" />
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
              <div className="stat-label">Documents Loaded</div>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corpusStatus.chunk_count}</span>
              <div className="stat-label">Chunks Indexed</div>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corpusStatus.corpus_metadata.total_size_mb} MB</span>
              <div className="stat-label">Total Size</div>
            </div>
            <div className="stat-item">
              <span className="stat-value">{corpusStatus.corpus_metadata.avg_doc_length}</span>
              <div className="stat-label">Avg Document Length</div>
            </div>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <strong>Embedding Model:</strong> {corpusStatus.embedding_model}
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
              🗺️ Open Heatmap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataLoadingDashboard;