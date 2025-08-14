import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { corpusApi } from '../services/api';
import { CorpusStatus } from '../types';
import { logSuccess, logError, logInfo, logNavigation } from '../utils/logger';
import NavigationHeader from '../components/NavigationHeader';

const DataLoadingDashboard: React.FC = () => {
  const [corpusStatus, setCorpusStatus] = useState<CorpusStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchCorpusStatus = async () => {
      try {
        setLoading(true);
        logInfo('Starting corpus status check', { 
          component: 'Dashboard',
          action: 'CORPUS_LOAD_START'
        });
        
        const data = await corpusApi.getStatus();
        setCorpusStatus(data);
        
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
        
      } catch (err: any) {
        const userMessage = 'Failed to load corpus status';
        setError(userMessage);
        
        logError(`Corpus loading failed: ${userMessage}`, {
          component: 'Dashboard',
          action: 'CORPUS_LOAD_ERROR',
          data: {
            error_type: err?.code || err?.name || 'Unknown',
            error_message: err?.message,
            status: err?.response?.status
          }
        });
        
      } finally {
        setLoading(false);
      }
    };

    fetchCorpusStatus();
  }, []);

  const handleProceedToQuestions = () => {
    logNavigation('Dashboard', 'Questions', {
      component: 'Dashboard',
      action: 'NAVIGATE_TO_QUESTIONS'
    });
    router.push('/questions');
  };

  const handleManageExperiments = () => {
    logNavigation('Dashboard', 'Experiments', {
      component: 'Dashboard',
      action: 'NAVIGATE_TO_EXPERIMENTS'
    });
    router.push('/experiments');
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Loading Corpus Status...</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>
            Loading document corpus and vector database...
          </div>
          <div style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
            This may take a few moments for first-time loading
          </div>
        </div>
      </div>
    );
  }

  if (error || !corpusStatus) {
    return (
      <div className="card">
        <h2>Error Loading Corpus</h2>
        <div style={{ color: '#dc3545', padding: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            {error || 'Unknown error occurred'}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            This may be due to the backend taking time to initialize the document corpus 
            and vector database. Please wait a moment and refresh the page.
          </div>
          <button 
            className="button button-secondary" 
            onClick={() => window.location.reload()}
            style={{ marginTop: '15px' }}
          >
            Retry Loading
          </button>
        </div>
      </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataLoadingDashboard;