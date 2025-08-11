import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { experimentApi } from '../services/api';
import { ExperimentConfig } from '../types';

interface StreamResult {
  question_id: string;
  question: string;
  source: string;
  avg_similarity: number;
  retrieved_docs: Array<{
    doc_id: string;
    similarity: number;
    title: string;
  }>;
}

const ExperimentConfiguration: React.FC = () => {
  const [config, setConfig] = useState<ExperimentConfig>({
    selected_groups: ['llm', 'ragas'],
    top_k: 5,
    similarity_threshold: 0.5
  });
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<StreamResult[]>([]);
  const [completed, setCompleted] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const totalQuestions = (config.selected_groups.includes('llm') ? 25 : 0) + 
                        (config.selected_groups.includes('ragas') ? 30 : 0);

  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [results]);

  const handleGroupChange = (group: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      selected_groups: checked 
        ? [...prev.selected_groups, group]
        : prev.selected_groups.filter(g => g !== group)
    }));
  };

  const handleConfigChange = (field: keyof ExperimentConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const startExperiment = async () => {
    if (config.selected_groups.length === 0) {
      alert('Please select at least one question group');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setCompleted(false);

    try {
      await experimentApi.run(config);

      const websocket = new WebSocket('ws://localhost:8000/ws/experiment/stream');
      setWs(websocket);

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'completed') {
          setCompleted(true);
          setIsRunning(false);
          websocket.close();
        } else {
          setResults(prev => [...prev, data]);
          setProgress(prev => Math.min(prev + (100 / totalQuestions), 100));
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsRunning(false);
      };

      websocket.onclose = () => {
        setWs(null);
      };

    } catch (error) {
      console.error('Error starting experiment:', error);
      setIsRunning(false);
    }
  };

  const stopExperiment = () => {
    if (ws) {
      ws.close();
    }
    setIsRunning(false);
  };

  const handleViewResults = () => {
    navigate('/results');
  };

  const handleBackToQuestions = () => {
    navigate('/questions');
  };

  const getStatusColor = (similarity: number) => {
    if (similarity > 0.7) return '#28a745';
    if (similarity > 0.5) return '#ffc107';
    return '#dc3545';
  };

  const getStatusText = (similarity: number) => {
    if (similarity > 0.7) return 'GOOD';
    if (similarity > 0.5) return 'WEAK';
    return 'POOR';
  };

  return (
    <div>
      <div className="card">
        <h2>⚙️ Experiment Configuration</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          Select question groups to test against corpus
        </p>

        <div className="two-column">
          <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
            <h3>Question Group Selection</h3>
            <div className="form-group">
              <div className="checkbox">
                <input
                  type="checkbox"
                  id="llm-questions"
                  checked={config.selected_groups.includes('llm')}
                  onChange={(e) => handleGroupChange('llm', e.target.checked)}
                  disabled={isRunning}
                />
                <label htmlFor="llm-questions">
                  Run LLM Questions (25 questions)
                </label>
              </div>
              <div className="checkbox">
                <input
                  type="checkbox"
                  id="ragas-questions"
                  checked={config.selected_groups.includes('ragas')}
                  onChange={(e) => handleGroupChange('ragas', e.target.checked)}
                  disabled={isRunning}
                />
                <label htmlFor="ragas-questions">
                  Run RAGAS Questions (30 questions)
                </label>
              </div>
              <div className="checkbox">
                <input
                  type="checkbox"
                  id="both-questions"
                  checked={config.selected_groups.includes('llm') && config.selected_groups.includes('ragas')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setConfig(prev => ({ ...prev, selected_groups: ['llm', 'ragas'] }));
                    } else {
                      setConfig(prev => ({ ...prev, selected_groups: [] }));
                    }
                  }}
                  disabled={isRunning}
                />
                <label htmlFor="both-questions">
                  Run Both Groups ({totalQuestions} total questions)
                </label>
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: '#f0f8ff' }}>
            <h3>Retrieval Configuration</h3>
            <div className="form-group">
              <label htmlFor="top-k">Top-K Results:</label>
              <select
                id="top-k"
                className="form-control"
                value={config.top_k}
                onChange={(e) => handleConfigChange('top_k', parseInt(e.target.value))}
                disabled={isRunning}
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="similarity-threshold">Similarity Threshold:</label>
              <select
                id="similarity-threshold"
                className="form-control"
                value={config.similarity_threshold}
                onChange={(e) => handleConfigChange('similarity_threshold', parseFloat(e.target.value))}
                disabled={isRunning}
              >
                <option value={0.3}>0.3</option>
                <option value={0.5}>0.5</option>
                <option value={0.7}>0.7</option>
              </select>
            </div>
          </div>
        </div>

        {!isRunning && !completed && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button 
              className="button" 
              onClick={startExperiment}
              style={{ fontSize: '18px', padding: '15px 30px' }}
              disabled={config.selected_groups.length === 0}
            >
              🚀 Start Experiment
            </button>
          </div>
        )}

        {isRunning && (
          <div className="card" style={{ backgroundColor: '#fff3cd', marginTop: '20px' }}>
            <h3>🔄 Experiment Running</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              Progress: {Math.round(progress)}% ({results.length}/{totalQuestions} questions processed)
            </div>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button 
                className="button button-secondary" 
                onClick={stopExperiment}
              >
                Stop Experiment
              </button>
            </div>
          </div>
        )}

        {completed && (
          <div className="card" style={{ backgroundColor: '#d4edda', marginTop: '20px' }}>
            <h3>✅ Experiment Completed</h3>
            <div style={{ textAlign: 'center', color: '#155724' }}>
              Successfully processed {results.length} questions!
            </div>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button 
                className="button" 
                onClick={handleViewResults}
                style={{ fontSize: '16px', padding: '12px 24px' }}
              >
                View Detailed Results →
              </button>
            </div>
          </div>
        )}

        {(isRunning || results.length > 0) && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3>📊 Live Results Preview</h3>
            <div className="experiment-stream" ref={resultsRef}>
              {results.map((result, index) => (
                <div key={index} className="stream-item" style={{ 
                  borderBottom: '1px solid #eee', 
                  paddingBottom: '10px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{result.source.toUpperCase()}</strong>: {result.question}
                    </div>
                    <div style={{ 
                      minWidth: '80px',
                      textAlign: 'right',
                      color: getStatusColor(result.avg_similarity),
                      fontWeight: 'bold'
                    }}>
                      {result.avg_similarity.toFixed(2)} ({getStatusText(result.avg_similarity)})
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                    Retrieved {result.retrieved_docs.length} documents
                  </div>
                </div>
              ))}
              {isRunning && results.length === 0 && (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  Initializing experiment... Please wait.
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
          <button 
            className="button button-secondary" 
            onClick={handleBackToQuestions}
            disabled={isRunning}
          >
            ← Back to Questions
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExperimentConfiguration;