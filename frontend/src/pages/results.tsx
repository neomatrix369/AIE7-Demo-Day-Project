import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { resultsApi } from '../services/api';
import { AnalysisResults as AnalysisResultsType } from '../types';
import { logSuccess, logError, logInfo, logNavigation } from '../utils/logger';
import NavigationHeader from '../components/NavigationHeader';
import QualityScoreLegend from '../components/QualityScoreLegend';

const AnalysisResults: React.FC = () => {
  const [results, setResults] = useState<AnalysisResultsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'similarity' | 'source' | 'status'>('similarity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'good' | 'weak' | 'poor'>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        logInfo('Loading analysis results', {
          component: 'Results',
          action: 'RESULTS_LOAD_START'
        });
        
        const data = await resultsApi.getAnalysis();
        setResults(data);
        
        logSuccess(`Results loaded: ${data.overall.total_questions} questions analyzed`, {
          component: 'Results', 
          action: 'RESULTS_LOAD_SUCCESS',
          data: {
            total_questions: data.overall.total_questions,
            avg_similarity: data.overall.avg_similarity,
            success_rate: data.overall.success_rate,
            corpus_health: data.overall.corpus_health,
            llm_avg_score: data.per_group.llm.avg_score,
            ragas_avg_score: data.per_group.ragas.avg_score
          }
        });
        
      } catch (err: any) {
        const userMessage = 'Failed to load analysis results';
        setError(userMessage);
        
        logError(`Results loading failed: ${userMessage}`, {
          component: 'Results',
          action: 'RESULTS_LOAD_ERROR',
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

    fetchResults();
  }, []);

  const handleSort = (field: 'similarity' | 'source' | 'status') => {
    logInfo(`Sorting results by ${field} (${sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'})`, {
      component: 'Results',
      action: 'SORT_RESULTS',
      data: { field, direction: sortField === field && sortDirection === 'asc' ? 'desc' : 'asc' }
    });
    
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'health-excellent';
      case 'good': return 'health-good';
      default: return 'health-needs-work';
    }
  };

  const getSimilarityBarClass = (similarity: number) => {
    if (similarity > 0.7) return 'similarity-good';
    if (similarity > 0.5) return 'similarity-weak';
    return 'similarity-poor';
  };

  const filteredAndSortedQuestions = React.useMemo(() => {
    if (!results) return [];

    let filtered = results.per_question;
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(q => q.status === filterStatus);
    }
    
    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(q => {
        // Search in question text
        const questionMatch = q.text.toLowerCase().includes(searchLower);
        
        // Search in document titles
        const docMatch = q.retrieved_docs.some(doc => 
          doc.title.toLowerCase().includes(searchLower) ||
          doc.doc_id.toLowerCase().includes(searchLower)
        );
        
        return questionMatch || docMatch;
      });
    }

    return filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'similarity':
          aVal = a.similarity;
          bVal = b.similarity;
          break;
        case 'source':
          aVal = a.source;
          bVal = b.source;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortField, sortDirection, filterStatus, searchText]);

  const handleBackToExperiment = () => {
    logNavigation('Results', 'Experiment', {
      component: 'Results',
      action: 'NAVIGATE_TO_EXPERIMENT'
    });
    router.push('/experiment');
  };

  const handleRunNewExperiment = () => {
    logNavigation('Results', 'Dashboard', {
      component: 'Results',
      action: 'NAVIGATE_TO_DASHBOARD',
      data: { reason: 'new_experiment' }
    });
    router.push('/dashboard');
  };

  const handleManageExperiments = () => {
    logNavigation('Results', 'Experiments', {
      component: 'Results',
      action: 'NAVIGATE_TO_EXPERIMENTS'
    });
    router.push('/experiments');
  };

  const handleClearResults = async () => {
    if (!window.confirm('Are you sure you want to clear all experiment results? This action cannot be undone.')) {
      return;
    }

    try {
      logInfo('Clearing experiment results', {
        component: 'Results',
        action: 'CLEAR_RESULTS_START'
      });

      const response = await resultsApi.clearResults();
      
      if (response.success) {
        setResults(null);
        logSuccess('Experiment results cleared successfully', {
          component: 'Results',
          action: 'CLEAR_RESULTS_SUCCESS'
        });
        alert('Experiment results cleared successfully');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      const errorMessage = 'Failed to clear experiment results';
      logError(`${errorMessage}: ${err?.message || 'Unknown error'}`, {
        component: 'Results',
        action: 'CLEAR_RESULTS_ERROR',
        data: { error: err?.message }
      });
      alert(`${errorMessage}: ${err?.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Loading Analysis Results...</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Please wait...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2>Error Loading Results</h2>
        <div style={{ color: '#dc3545', padding: '20px' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!results || results.overall.total_questions === 0) {
    return (
      <div className="card">
        <h2>📊 Analysis Results Dashboard</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', color: '#666', marginBottom: '20px' }}>
            No Experiment Results Available
          </div>
          <div style={{ fontSize: '16px', color: '#888', marginBottom: '30px' }}>
            Run an experiment first to see analysis results here.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <button 
              className="button" 
              onClick={handleBackToExperiment}
            >
              🧪 Go to Experiment
            </button>
            <button 
              className="button button-secondary" 
              onClick={handleManageExperiments}
              style={{ backgroundColor: '#6f42c1' }}
            >
              📁 Manage Experiments
            </button>
            <button 
              className="button button-secondary" 
              onClick={handleRunNewExperiment}
            >
              🏠 Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavigationHeader currentPage="results" />
      <div className="card">
        <h2>📊 Analysis Results Dashboard</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          3-Level infographic analysis results
        </p>

        <div className="analysis-section">
          <h3>📊 Overall Analysis</h3>
          <div className="metric-card">
            <div className="stats-grid">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {results.overall.avg_similarity.toFixed(2)}
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.9 }}>Average Similarity Score</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {Math.round(results.overall.success_rate * 100)}%
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.9 }}>Success Rate (&gt;0.7)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {results.overall.total_questions}
                </div>
                <div style={{ fontSize: '1rem', opacity: 0.9 }}>Questions Processed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className={`health-indicator ${getHealthColor(results.overall.corpus_health)}`}>
                  {results.overall.corpus_health.replace('_', ' ')}
                </span>
                <div style={{ fontSize: '1rem', opacity: 0.9, marginTop: '10px', color: 'white' }}>
                  Corpus Health
                </div>
              </div>
            </div>
            <div style={{ 
              textAlign: 'center', 
              marginTop: '20px', 
              fontSize: '1.1rem', 
              fontStyle: 'italic',
              opacity: 0.9 
            }}>
              Key Insight: {results.overall.key_insight}
            </div>
          </div>
        </div>

        <div className="analysis-section">
          <h3>📈 Per Group Analysis</h3>
          <div className="two-column">
            <div className="card" style={{ backgroundColor: '#f0f8ff', border: '2px solid #007bff' }}>
              <h4>🤖 LLM Questions Performance</h4>
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat-item" style={{ backgroundColor: 'white' }}>
                  <span className="stat-value" style={{ color: '#007bff' }}>
                    {results.per_group.llm.avg_score.toFixed(2)}
                  </span>
                  <div className="stat-label">Average Score</div>
                </div>
                <div className="stat-item" style={{ backgroundColor: 'white' }}>
                  <span className="stat-value" style={{ color: '#007bff' }}>
                    {results.per_group.llm.distribution.filter(s => s > 0.7).length}
                  </span>
                  <div className="stat-label">Good Scores (&gt;0.7)</div>
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <strong>Score Distribution:</strong>
                <div style={{ 
                  display: 'flex', 
                  height: '20px', 
                  backgroundColor: '#e9ecef', 
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginTop: '8px'
                }}>
                  <div 
                    style={{ 
                      backgroundColor: '#28a745',
                      width: `${(results.per_group.llm.distribution.filter(s => s > 0.7).length / results.per_group.llm.distribution.length) * 100}%`
                    }}
                  ></div>
                  <div 
                    style={{ 
                      backgroundColor: '#ffc107',
                      width: `${(results.per_group.llm.distribution.filter(s => s > 0.5 && s <= 0.7).length / results.per_group.llm.distribution.length) * 100}%`
                    }}
                  ></div>
                  <div 
                    style={{ 
                      backgroundColor: '#dc3545',
                      width: `${(results.per_group.llm.distribution.filter(s => s <= 0.5).length / results.per_group.llm.distribution.length) * 100}%`
                    }}
                  ></div>
                </div>
                <QualityScoreLegend 
                  format="horizontal" 
                  showTitle={false}
                  style={{ marginTop: '5px' }}
                />
              </div>
            </div>

            <div className="card" style={{ backgroundColor: '#f8fff8', border: '2px solid #28a745' }}>
              <h4>📊 RAGAS Questions Performance</h4>
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat-item" style={{ backgroundColor: 'white' }}>
                  <span className="stat-value" style={{ color: '#28a745' }}>
                    {results.per_group.ragas.avg_score.toFixed(2)}
                  </span>
                  <div className="stat-label">Average Score</div>
                </div>
                <div className="stat-item" style={{ backgroundColor: 'white' }}>
                  <span className="stat-value" style={{ color: '#28a745' }}>
                    {results.per_group.ragas.distribution.filter(s => s > 0.7).length}
                  </span>
                  <div className="stat-label">Good Scores (&gt;0.7)</div>
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <strong>Score Distribution:</strong>
                <div style={{ 
                  display: 'flex', 
                  height: '20px', 
                  backgroundColor: '#e9ecef', 
                  borderRadius: '10px',
                  overflow: 'hidden',
                  marginTop: '8px'
                }}>
                  <div 
                    style={{ 
                      backgroundColor: '#28a745',
                      width: `${(results.per_group.ragas.distribution.filter(s => s > 0.7).length / results.per_group.ragas.distribution.length) * 100}%`
                    }}
                  ></div>
                  <div 
                    style={{ 
                      backgroundColor: '#ffc107',
                      width: `${(results.per_group.ragas.distribution.filter(s => s > 0.5 && s <= 0.7).length / results.per_group.ragas.distribution.length) * 100}%`
                    }}
                  ></div>
                  <div 
                    style={{ 
                      backgroundColor: '#dc3545',
                      width: `${(results.per_group.ragas.distribution.filter(s => s <= 0.5).length / results.per_group.ragas.distribution.length) * 100}%`
                    }}
                  ></div>
                </div>
                <QualityScoreLegend 
                  format="horizontal" 
                  showTitle={false}
                  style={{ marginTop: '5px' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="analysis-section">
          <h3>🔍 Per Question Analysis</h3>
          
          <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>🔍 Search:</strong>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search questions, documents..."
                  value={searchText}
                  onChange={(e) => {
                    const newSearch = e.target.value;
                    logInfo(`Searching for: "${newSearch}"`, {
                      component: 'Results',
                      action: 'SEARCH_QUESTIONS',
                      data: { search_term: newSearch, previous_term: searchText }
                    });
                    setSearchText(newSearch);
                  }}
                  className="form-control"
                  style={{ 
                    width: '280px', 
                    paddingRight: searchText ? '35px' : '10px'
                  }}
                />
                {searchText && (
                  <button
                    onClick={() => {
                      logInfo('Clearing search', {
                        component: 'Results',
                        action: 'CLEAR_SEARCH',
                        data: { previous_term: searchText }
                      });
                      setSearchText('');
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                      color: '#6c757d',
                      padding: '0',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div>
              <strong>Filter by Status:</strong>
              <select 
                value={filterStatus} 
                onChange={(e) => {
                  const newFilter = e.target.value as any;
                  logInfo(`Filtering results by ${newFilter} status`, {
                    component: 'Results',
                    action: 'FILTER_RESULTS',
                    data: { filter: newFilter, previous_filter: filterStatus }
                  });
                  setFilterStatus(newFilter);
                }}
                className="form-control"
                style={{ width: '120px', marginLeft: '10px' }}
              >
                <option value="all">All</option>
                <option value="good">Good</option>
                <option value="weak">Weak</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '8px 16px', 
              borderRadius: '6px', 
              border: '1px solid #dee2e6',
              fontWeight: 'bold'
            }}>
              📋 Showing {filteredAndSortedQuestions.length} of {results.per_question.length} questions
              {searchText && (
                <span style={{ color: '#007bff', marginLeft: '8px' }}>
                  (filtered by: &quot;{searchText}&quot;)
                </span>
              )}
            </div>
          </div>

          <div className="questions-scroll-container" style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('source')}>
                  Source {sortField === 'source' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Question</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('similarity')}>
                  Similarity {sortField === 'similarity' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Retrieved Docs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedQuestions.map((question) => (
                <React.Fragment key={question.id}>
                  <tr>
                    <td>
                      <span style={{ 
                        backgroundColor: question.source === 'llm' ? '#007bff' : '#28a745',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase'
                      }}>
                        {question.source}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      {question.text.length > 100 
                        ? question.text.substring(0, 100) + '...'
                        : question.text
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {question.similarity.toFixed(2)}
                        <div className="similarity-bar">
                          <div 
                            className={`similarity-fill ${getSimilarityBarClass(question.similarity)}`}
                            style={{ width: `${question.similarity * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-indicator status-${question.status}`}></span>
                      <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {question.status}
                      </span>
                    </td>
                    <td>{question.retrieved_docs.length}</td>
                    <td>
                      <button
                        className="button"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => {
                          const isExpanding = expandedQuestion !== question.id;
                          logInfo(`${isExpanding ? 'Expanding' : 'Collapsing'} question details`, {
                            component: 'Results',
                            action: isExpanding ? 'EXPAND_QUESTION' : 'COLLAPSE_QUESTION',
                            data: {
                              question_id: question.id,
                              question_source: question.source,
                              similarity_score: question.similarity,
                              retrieved_docs_count: question.retrieved_docs.length
                            }
                          });
                          setExpandedQuestion(
                            expandedQuestion === question.id ? null : question.id
                          );
                        }}
                      >
                        {expandedQuestion === question.id ? 'Hide' : 'View'} Docs
                      </button>
                    </td>
                  </tr>
                  {expandedQuestion === question.id && (
                    <tr>
                      <td colSpan={6} style={{ backgroundColor: '#f8f9fa', padding: '15px' }}>
                        <div>
                          <strong>Full Question:</strong>
                          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                            {question.text}
                          </div>
                          <strong>Retrieved Documents:</strong>
                          <div style={{ marginTop: '10px' }}>
                            {question.retrieved_docs.map((doc, idx) => (
                              <div key={idx} style={{ 
                                padding: '8px',
                                backgroundColor: 'white',
                                marginBottom: '5px',
                                borderRadius: '4px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span><strong>{doc.title}</strong> (ID: {doc.doc_id})</span>
                                <span style={{ 
                                  color: getSimilarityBarClass(doc.similarity).includes('good') ? '#28a745' :
                                        getSimilarityBarClass(doc.similarity).includes('weak') ? '#ffc107' : '#dc3545',
                                  fontWeight: 'bold'
                                }}>
                                  {doc.similarity.toFixed(3)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
          <button 
            className="button button-secondary" 
            onClick={handleBackToExperiment}
          >
            ← Back to Experiment
          </button>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="button button-secondary" 
              onClick={handleManageExperiments}
              style={{ backgroundColor: '#6f42c1' }}
            >
              📁 Manage Experiments
            </button>
            
            <button 
              className="button button-secondary" 
              onClick={handleClearResults}
              style={{ backgroundColor: '#dc3545', color: 'white' }}
            >
              🗑️ Clear Results
            </button>
            
            <button 
              className="button" 
              onClick={handleRunNewExperiment}
              style={{ backgroundColor: '#28a745' }}
            >
              🔄 Run New Experiment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;