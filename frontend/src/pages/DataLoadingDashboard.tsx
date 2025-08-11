import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { corpusApi } from '../services/api';
import { CorpusStatus } from '../types';

const DataLoadingDashboard: React.FC = () => {
  const [corpusStatus, setCorpusStatus] = useState<CorpusStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCorpusStatus = async () => {
      try {
        setLoading(true);
        const data = await corpusApi.getStatus();
        setCorpusStatus(data);
      } catch (err) {
        setError('Failed to load corpus status');
        console.error('Error fetching corpus status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCorpusStatus();
  }, []);

  const handleProceedToQuestions = () => {
    navigate('/questions');
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Loading Corpus Status...</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Please wait...</div>
        </div>
      </div>
    );
  }

  if (error || !corpusStatus) {
    return (
      <div className="card">
        <h2>Error Loading Corpus</h2>
        <div style={{ color: '#dc3545', padding: '20px' }}>
          {error || 'Unknown error occurred'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>📊 Corpus Quality Assessment Tool - Ready to Analyze</h2>
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
          <button 
            className="button" 
            onClick={handleProceedToQuestions}
            style={{ fontSize: '18px', padding: '15px 30px' }}
          >
            Proceed to Question Analysis →
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataLoadingDashboard;