import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import usePageNavigation from '../hooks/usePageNavigation';
import { LABEL_RESULTS } from '../utils/constants';
import { experimentApi, questionsApi } from '../services/api';
import { ExperimentConfig } from '../types';
import { logSuccess, logError, logInfo, logNavigation, logWebSocketEvent, logProgress } from '../utils/logger';
import NavigationHeader from '../components/NavigationHeader';
import QualityScoreLegend from '../components/QualityScoreLegend';
import GapAnalysisDashboard from '../components/gap-analysis/GapAnalysisDashboard';
import { createStorageAdapter, isVercelDeployment } from '../services/storage';

interface StreamResult {
  question_id: string;
  question: string;
  source: string;
  avg_quality_score: number;
  retrieved_docs: Array<{
    doc_id: string;
    chunk_id?: string;
    content: string;
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
  const [experimentConfig, setExperimentConfig] = useState<{chunk_strategy: Record<string, string>, retrieval_method: Record<string, string>, chunk_size: number, chunk_overlap: number}>({chunk_strategy: {}, retrieval_method: {}, chunk_size: 0, chunk_overlap: 0});
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<StreamResult[]>([]);
  const [completed, setCompleted] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [llmQuestionCount, setLlmQuestionCount] = useState<number | null>(null);
  const [ragasQuestionCount, setRagasQuestionCount] = useState<number | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isGapAnalysisExpanded, setIsGapAnalysisExpanded] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { goTo } = usePageNavigation('Experiment');

  useEffect(() => {
    const fetchExperimentConfig = async () => {
      try {
        const data = await experimentApi.getExperimentConfig();
        setExperimentConfig(data);
      } catch (error) {
        console.error("Failed to fetch experiment config", error);
      }
    };
    fetchExperimentConfig();
  }, []);

  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [results]);

  // Calculate total questions based on selected groups
  useEffect(() => {
    let total = 0;
    if (config.selected_groups.includes('llm') && llmQuestionCount !== null) {
      total += llmQuestionCount;
    }
    if (config.selected_groups.includes('ragas') && ragasQuestionCount !== null) {
      total += ragasQuestionCount;
    }
    setTotalQuestions(total);
  }, [config.selected_groups, llmQuestionCount, ragasQuestionCount]);

  // Update progress when results change
  useEffect(() => {
    if (totalQuestions > 0) {
      const newProgress = Math.min((results.length * 100) / totalQuestions, 100);
      setProgress(newProgress);
    }
  }, [results.length, totalQuestions]);

  useEffect(() => {
    const fetchQuestionCounts = async () => {
      try {
        setLoadingCounts(true);
        logInfo('Fetching question counts from API', {
          component: 'Experiment',
          action: 'FETCH_QUESTION_COUNTS'
        });

        const [llmQuestions, ragasQuestions] = await Promise.all([
          questionsApi.getLLMQuestions(),
          questionsApi.getRAGASQuestions()
        ]);

        // Calculate total questions from the real data structure
        const llmCount = Array.isArray(llmQuestions) 
          ? llmQuestions.reduce((total, group) => total + (group.questions ? group.questions.length : 0), 0) 
          : 0;
        const ragasCount = Array.isArray(ragasQuestions) 
          ? ragasQuestions.reduce((total, group) => total + (group.questions ? group.questions.length : 0), 0)
          : 0;

        setLlmQuestionCount(llmCount);
        setRagasQuestionCount(ragasCount);

        logSuccess(`Question counts loaded: LLM=${llmCount}, RAGAS=${ragasCount}`, {
          component: 'Experiment',
          action: 'QUESTION_COUNTS_LOADED',
          data: { llm_count: llmCount, ragas_count: ragasCount }
        });
      } catch (error: any) {
        logError(`Failed to fetch question counts: ${error?.message || 'Unknown error'}`, {
          component: 'Experiment',
          action: 'FETCH_QUESTION_COUNTS_ERROR',
          data: { error: error?.message }
        });
        // Fallback to default counts if API fails
        setLlmQuestionCount(56);
        setRagasQuestionCount(22);
      } finally {
        setLoadingCounts(false);
      }
    };

    fetchQuestionCounts();
  }, []);


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

    if (totalQuestions === 0) {
      alert('Question counts are still loading. Please wait a moment and try again.');
      return;
    }

    console.log(`🚀 Starting REAL experiment with ${totalQuestions} questions`);
    console.log('📋 Config:', config);
    console.log('🔢 Question counts:', { llmQuestionCount, ragasQuestionCount, totalQuestions });
    
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setCompleted(false);

    // Connect to WebSocket for real-time streaming (with fallback for Vercel)
    const getWebSocketUrl = () => {
      if (typeof window !== 'undefined') {
        // Vercel deployment with external backend
        if (process.env.NEXT_PUBLIC_BACKEND_URL) {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
          const protocol = backendUrl.startsWith('https:') ? 'wss:' : 'ws:';
          // Normalize URL: remove protocol and trailing slashes
          const host = backendUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
          return `${protocol}//${host}/ws/experiment/stream`;
        }
        
        // Local development or production with same-host backend
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = process.env.NODE_ENV === 'development' ? ':8000' : '';
        return `${protocol}//${host}${port}/ws/experiment/stream`;
      }
      return 'ws://localhost:8000/ws/experiment/stream';
    };
    
    const wsUrl = getWebSocketUrl();
    const websocket = new WebSocket(wsUrl);
    let usingPolling = false;
    
    // Set a timeout for WebSocket connection
    const connectionTimeout = setTimeout(() => {
      if (websocket.readyState !== WebSocket.OPEN) {
        console.error('❌ WebSocket connection timeout');
        alert('Connection timeout. Please check if the backend server is running.');
        setIsRunning(false);
        websocket.close();
      }
    }, 5000); // 5 second timeout

    websocket.onopen = () => {
      clearTimeout(connectionTimeout);
      console.log('🔌 WebSocket connected, sending config...');
      websocket.send(JSON.stringify(config));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'completed') {
          console.log('🏁 Experiment completed');
          setCompleted(true);
          setIsRunning(false);
          websocket.close();
          
          // Auto-save will be handled by useEffect when results are ready
          if (isVercelDeployment()) {
            console.log('🌐 Vercel mode - auto-save will trigger via useEffect when results are ready');
          } else {
            console.log('🏠 Local mode - auto-save not needed (backend handles saving)');
          }
        } else if (data.type === 'error') {
          console.error('❌ Experiment error:', data.message);
          alert(`Experiment failed: ${data.message}`);
          setIsRunning(false);
          websocket.close();
        } else if (data.type === 'progress') {
          // Handle progress updates
          console.log('📊 Progress update:', data);
          setProgress(data.progress);
        } else {
          // This is a question result - transform old field names for backwards compatibility
          const transformedData = {
            ...data,
            avg_quality_score: data.avg_quality_score || data.avg_similarity,
          };
          console.log('📊 Received result:', transformedData);
          setResults(prevResults => [...prevResults, transformedData]);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      alert('Failed to connect to experiment stream. Please try again.');
      setIsRunning(false);
    };

    websocket.onclose = () => {
      console.log('🔌 WebSocket connection closed');
      setWs(null);
    };

    setWs(websocket);
  };

  const stopExperiment = () => {
    logInfo(`User stopped experiment at ${Math.round(progress)}%`, {
      component: 'Experiment',
      action: 'EXPERIMENT_STOP',
      data: {
        progress_percent: Math.round(progress),
        questions_processed: results.length,
        total_questions: totalQuestions
      }
    });
    
    if (ws) {
      ws.close();
    }
    setIsRunning(false);
  };

  const saveExperimentToBrowser = useCallback(async () => {
    try {
      const storageAdapter = createStorageAdapter();
      const timestamp = new Date().toISOString();
      
      // Calculate average quality score
      const avgQualityScore = results.length > 0 
        ? Math.round((results.reduce((sum, r) => sum + r.avg_quality_score, 0) / results.length) * 10) / 10
        : 0;
      
      const experimentData = {
        timestamp,
        config,
        results,
        total_questions: results.length,
        sources: config.selected_groups,
        avg_quality_score: avgQualityScore
      };
      
      const response = await storageAdapter.saveExperiment(experimentData);
      
      if (response.success) {
        logSuccess(`Experiment auto-saved: ${response.filename}`, {
          component: 'Experiment',
          action: 'AUTO_SAVE_SUCCESS',
          data: { filename: response.filename, questions: results.length }
        });
        console.log(`✅ Experiment auto-saved: ${response.filename}`);
      } else {
        logError(`Auto-save failed: ${response.message}`, {
          component: 'Experiment',
          action: 'AUTO_SAVE_FAILED'
        });
        console.error('❌ Auto-save failed:', response.message);
      }
    } catch (error) {
      logError(`Auto-save error: ${String(error)}`, {
        component: 'Experiment',
        action: 'AUTO_SAVE_ERROR'
      });
      console.error('❌ Auto-save error:', error);
    }
  }, [config, results]);

  // Auto-save effect for Vercel deployments when experiment completes
  useEffect(() => {
    if (completed && isVercelDeployment() && results.length > 0 && !isRunning) {
      console.log(`🎯 Auto-save trigger: experiment completed with ${results.length} results`);
      const timeoutId = setTimeout(() => {
        saveExperimentToBrowser();
      }, 500);
      
      // Cleanup timeout on unmount or re-run
      return () => clearTimeout(timeoutId);
    }
  }, [completed, results.length, isRunning, saveExperimentToBrowser]);

  const handleViewResults = () => {
    goTo('/results', LABEL_RESULTS, { action: 'NAVIGATE_TO_RESULTS', data: { experiment_completed: completed, questions_processed: results.length } });
  };

  const handleBackToQuestions = () => {
    goTo('/questions', 'Questions', { action: 'NAVIGATE_TO_QUESTIONS' });
  };

  const handleManageExperiments = () => {
    goTo('/experiments', 'Experiments', { action: 'NAVIGATE_TO_EXPERIMENTS' });
  };

  const getStatusColor = (qualityScore: number) => {
    if (qualityScore >= 7.0) return '#28a745';
    if (qualityScore >= 5.0) return '#e67e22';
    return '#dc3545';
  };

  const getStatusText = (qualityScore: number) => {
    if (qualityScore >= 7.0) return 'GOOD';
    if (qualityScore >= 5.0) return 'WEAK';
    return 'POOR';
  };

  return (
    <div>
      <NavigationHeader currentPage="experiment" />
      <div className="card">
        <h2>⚙️ Experiment Configuration</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          Select question groups to test against corpus
        </p>

        <div className="three-column">
          <div className="card" style={{ backgroundColor: '#f0f8ff' }}>
            <h3>Chunking Strategy</h3>
            <div className="form-group">
              <select
                id="chunk-strategy"
                className="form-control"
                disabled={isRunning}
              >
                {Object.entries(experimentConfig.chunk_strategy).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Chunk Size:</label>
              <p>{experimentConfig.chunk_size}</p>
            </div>
            <div className="form-group">
              <label>Chunk Overlap:</label>
              <p>{experimentConfig.chunk_overlap}</p>
            </div>
            <div className="form-group">
              <label>Embedding Model:</label>
              <p>text-embedding-3-small (OpenAI)</p>
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

            <div className="form-group">
              <label htmlFor="retrieval-method">Retrieval Method:</label>
              <select
                id="retrieval-method"
                className="form-control"
                disabled={isRunning}
              >
                {Object.entries(experimentConfig.retrieval_method).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>
          </div>

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
                  Run LLM Questions ({loadingCounts ? '...' : llmQuestionCount || 0} questions)
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
                  Run RAGAS Questions ({loadingCounts ? '...' : ragasQuestionCount || 0} questions)
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
                  Run Both Groups ({loadingCounts ? '...' : totalQuestions} total questions)
                </label>
              </div>
            </div>
          </div>
        </div>

        {!isRunning && !completed && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button 
              className="button" 
              onClick={startExperiment}
              style={{ fontSize: '18px', padding: '15px 30px' }}
              disabled={config.selected_groups.length === 0 || loadingCounts}
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
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              Progress: {Math.round(Math.min(progress, 100))}% ({results.length}/{totalQuestions} questions processed)
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
            <QualityScoreLegend 
              format="compact" 
              showTitle={true}
              style={{ 
                marginBottom: '15px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}
            />
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
                      color: getStatusColor(result.avg_quality_score),
                      fontWeight: 'bold'
                    }}>
                      <div>{result.avg_quality_score ? result.avg_quality_score.toFixed(1) : 0}</div>
                      <div>{getStatusText(result.avg_quality_score)}</div>
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

        {/* Gap Analysis Section */}
        {(completed || results.length > 0) && (
          <div className="card" style={{ marginTop: '20px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
            <div 
              className="collapsible-header" 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '10px 0',
                borderBottom: isGapAnalysisExpanded ? '2px solid #dee2e6' : 'none'
              }}
              onClick={() => setIsGapAnalysisExpanded(!isGapAnalysisExpanded)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>📊</span>
                <h3 style={{ margin: 0, color: '#495057' }}>Gap Analysis & Recommendations</h3>
                {!isGapAnalysisExpanded && (
                  <span style={{ 
                    fontSize: '0.8rem', 
                    background: '#007bff',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontWeight: 'bold'
                  }}>
                    NEW
                  </span>
                )}
              </div>
              <div style={{ 
                fontSize: '1.2rem',
                transition: 'transform 0.3s ease',
                transform: isGapAnalysisExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
              }}>
                ▶️
              </div>
            </div>
            
            {!isGapAnalysisExpanded && (
              <div style={{ 
                padding: '15px 0 5px 0',
                fontSize: '0.9rem',
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                💡 Discover content gaps and get actionable recommendations to improve your corpus performance
              </div>
            )}
            
            {isGapAnalysisExpanded && (
              <div style={{ paddingTop: '20px' }}>
                <GapAnalysisDashboard />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <button 
            className="button button-secondary" 
            onClick={handleBackToQuestions}
            disabled={isRunning}
          >
            ← Back to Questions
          </button>
          
          <button 
            className="button button-secondary" 
            onClick={handleManageExperiments}
            disabled={isRunning}
            style={{ backgroundColor: '#6f42c1' }}
          >
            📁 Manage Experiments
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExperimentConfiguration;