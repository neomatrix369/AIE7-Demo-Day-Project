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
  const [sortField, setSortField] = useState<'quality_score' | 'source' | 'status'>('quality_score');
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
            avg_quality_score: data.overall.avg_quality_score,
            success_rate: data.overall.success_rate,
            corpus_health: data.overall.corpus_health,
            llm_avg_quality_score: data.per_group.llm?.avg_quality_score ?? 0,
            ragas_avg_quality_score: data.per_group.ragas?.avg_quality_score ?? 0
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

  const handleSort = (field: 'quality_score' | 'source' | 'status') => {
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

  const getStatusColor = (qualityScore: number) => {
    if (qualityScore >= 7.0) return '#28a745';
    if (qualityScore >= 5.0) return '#e67e22';
    return '#dc3545'; // For poor quality
  };

  const getStatusText = (qualityScore: number) => {
    if (qualityScore >= 7.0) return 'GOOD';
    if (qualityScore >= 5.0) return 'WEAK';
    return 'POOR';
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'health-excellent';
      case 'good': return 'health-good';
      default: return 'health-needs-work';
    }
  };

  const getQualityScoreBarClass = (qualityScore: number) => {
    if (qualityScore >= 7.0) return 'quality-score-good';
    if (qualityScore >= 5.0) return 'quality-score-weak';
    return 'quality-score-poor';
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
        
        const sourceMatch = q.source.toLowerCase().includes(searchLower);

        // Search in document titles
        const docMatch = q.retrieved_docs.some(doc => 
          doc.title.toLowerCase().includes(searchLower) ||
          doc.doc_id.toLowerCase().includes(searchLower)
        );
        
        return questionMatch || docMatch || sourceMatch;
      });
    }

    return filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'quality_score':
          aVal = a.quality_score;
          bVal = b.quality_score;
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
    if (!window.confirm('Are you sure you want to clear all experiment results? This action can&apos;t be undone.')) {
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

  const handleViewHeatmap = () => {
    logNavigation('Results', 'Heatmap', {
      component: 'Results',
      action: 'NAVIGATE_TO_HEATMAP',
      data: {
        total_questions: results?.overall.total_questions,
        avg_quality_score: results?.overall.avg_quality_score
      }
    });
    router.push('/heatmap');
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
          <div className="card" style={{ backgroundColor: '#f8f9fa', border: '2px solid #dee2e6', padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              
              {/* Quality Score Card */}
              <div style={{ backgroundColor: '#e8f5e8', border: '2px solid #1e7e34', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0a3d0f', fontSize: '0.9rem' }}>🎯 Overall Quality Score</h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span style={{ color: '#1e7e34', fontSize: '1.8rem', fontWeight: 'bold', display: 'block' }}>
                    {results.overall.avg_quality_score ? results.overall.avg_quality_score.toFixed(1) : 0}
                  </span>
                  <div style={{
                    fontSize: '1.1rem',
                    color: getStatusColor(results.overall.avg_quality_score),
                    fontWeight: 'bold',
                    marginTop: '3px'
                  }}>
                    {getStatusText(results.overall.avg_quality_score)}
                  </div>
                  <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>Quality Score</div>
                </div>
              </div>

              {/* Success Rate Card */}
              <div style={{ backgroundColor: '#fff2e6', border: '2px solid #d63384', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#6a1a3a', fontSize: '0.9rem' }}>📈 Success Rate</h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span style={{ color: '#d63384', fontSize: '1.8rem', fontWeight: 'bold', display: 'block' }}>
                    {Math.round(results.overall.success_rate * 100)}%
                  </span>
                  <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>High Quality Rate (≥7.0)</div>
                </div>
              </div>

              {/* Questions Processed Card */}
              <div style={{ backgroundColor: '#e6e6ff', border: '2px solid #5a3bb0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#3a1d66', fontSize: '0.9rem' }}>📊 Processing Volume</h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span style={{ color: '#5a3bb0', fontSize: '1.8rem', fontWeight: 'bold', display: 'block' }}>
                    {results.overall.total_questions}
                  </span>
                  <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>Questions Processed</div>
                </div>
              </div>

              {/* Corpus Health Card */}
              <div style={{ backgroundColor: '#e6f7ff', border: '2px solid #0c7cd5', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#064785', fontSize: '0.9rem' }}>🏥 Corpus Health</h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span className={`health-indicator ${getHealthColor(results.overall.corpus_health)}`} style={{ fontSize: '0.9rem' }}>
                    {results.overall.corpus_health.replace('_', ' ')}
                  </span>
                  <div style={{ color: '#666', marginTop: '6px', fontSize: '0.8rem' }}>System Status</div>
                </div>
              </div>
            </div>

            {/* Key Insight Section */}
            <div style={{ 
              backgroundColor: '#fff8dc', 
              border: '2px solid #b8860b', 
              borderRadius: '6px',
              padding: '10px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#5c4b00', fontSize: '0.9rem' }}>💡 Key Insight</h4>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#5c4b00',
                padding: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #b8860b'
              }}>
                {results.overall.key_insight}
              </div>
            </div>
          </div>
        </div>

        <div className="analysis-section">
          <h3>📈 Per Group Analysis</h3>
          <div className="two-column">
            {Object.entries(results.per_group).map(([groupName, groupData]) => (
              <div key={groupName} className="card" style={{ backgroundColor: '#f0f8ff', border: '2px solid #007bff' }}>
                <h4>{groupName.toUpperCase()} Questions Performance</h4>
                <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="stat-item" style={{ backgroundColor: 'white' }}>
                    <span className="stat-value" style={{ color: '#007bff' }}>
                      {groupData.avg_quality_score ? groupData.avg_quality_score.toFixed(1) : 0}
                    </span>
                    <div style={{
                      fontSize: '1.2rem',
                      color: getStatusColor(groupData.avg_quality_score),
                      fontWeight: 'bold',
                      marginTop: '3px'
                    }}>
                      {getStatusText(groupData.avg_quality_score)}
                    </div>
                    <div className="stat-label">Quality Score</div>
                  </div>
                  <div className="stat-item" style={{ backgroundColor: 'white' }}>
                    <span className="stat-value" style={{ color: '#007bff' }}>
                      {groupData.distribution.filter(s => s >= 7.0).length}
                    </span>
                    <div className="stat-label">High Quality Scores (≥7.0)</div>
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
                        width: `${(groupData.distribution.filter(s => s >= 7.0).length / groupData.distribution.length) * 100}%`
                      }}
                    ></div>
                    <div
                      style={{
                        backgroundColor: '#e67e22',
                        width: `${(groupData.distribution.filter(s => s >= 5.0 && s < 7.0).length / groupData.distribution.length) * 100}%`
                      }}
                    ></div>
                    <div
                      style={{
                        backgroundColor: '#dc3545',
                        width: `${(groupData.distribution.filter(s => s < 5.0).length / groupData.distribution.length) * 100}%`
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
            ))}
          </div>
        </div>

        <div className="analysis-section">
          <h3>🗂️ Per Group Role Analysis</h3>
          {Object.entries(results.per_group).map(([groupName, groupData]) => (
            <div key={groupName} className="card" style={{ marginBottom: '20px' }}>
              <h4>{groupName.toUpperCase()} - Role Breakdown</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Avg Quality Score</th>
                    <th>High Quality Scores (≥7.0)</th>
                    <th>Score Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {groupData.roles && Object.entries(groupData.roles).length > 0 ? (
                    Object.entries(groupData.roles).map(([roleName, roleData]) => (
                      <tr key={roleName}>
                        <td>{roleName}</td>
                        <td>{roleData.avg_quality_score.toFixed(1)}</td>
                        <td>{roleData.distribution.filter(s => s >= 7.0).length}</td>
                        <td>
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
                                width: `${(roleData.distribution.filter(s => s >= 7.0).length / roleData.distribution.length) * 100}%`
                              }}
                            ></div>
                            <div
                              style={{
                                backgroundColor: '#e67e22',
                                width: `${(roleData.distribution.filter(s => s >= 5.0 && s < 7.0).length / roleData.distribution.length) * 100}%`
                              }}
                            ></div>
                            <div
                              style={{
                                backgroundColor: '#dc3545',
                                width: `${(roleData.distribution.filter(s => s < 5.0).length / roleData.distribution.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                        No role data available for this group.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="analysis-section">
          <h3>🗺️ Advanced Visualization</h3>
          <div className="card" style={{ 
            backgroundColor: '#f0f8ff', 
            border: '2px solid #007bff',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0056b3' }}>
              Interactive Data Visualization
            </h4>
            <p style={{ 
              color: '#495057', 
              fontSize: '16px', 
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              Explore question-chunk relationships through interactive scatter plot heatmaps with dual perspectives. 
              Analyze patterns, clusters, and outliers in your RAG system&apos;s performance.
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '15px', 
              marginBottom: '20px',
              fontSize: '0.9rem',
              color: '#666'
            }}>
              <div>
                <strong style={{ color: '#007bff' }}>📊 Questions View</strong><br/>
                See how questions map to chunks
              </div>
              <div>
                <strong style={{ color: '#007bff' }}>📄 Chunks View</strong><br/>
                See how chunks are retrieved
              </div>
              <div>
                <strong style={{ color: '#007bff' }}>🎯 Interactive</strong><br/>
                Click points for drill-down
              </div>
              <div>
                <strong style={{ color: '#007bff' }}>🔍 Filters</strong><br/>
                Filter by quality scores
              </div>
            </div>
            
            <button 
              className="button"
              onClick={handleViewHeatmap}
              style={{ 
                fontSize: '16px', 
                padding: '12px 24px',
                backgroundColor: '#007bff'
              }}
            >
              🗺️ Open Interactive Heatmap Visualization →
            </button>
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
                <th>Role</th>
                <th>Question</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('quality_score')}>
                  Quality Score {sortField === 'quality_score' && (sortDirection === 'asc' ? '↑' : '↓')}
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
                    <td>
                      <span style={{ 
                        backgroundColor: '#f8f9fa',
                        color: '#495057',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.75rem',
                        border: '1px solid #dee2e6'
                      }}>
                        {question.role_name || 'Unknown'}
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
                        {question.quality_score ? question.quality_score.toFixed(1) : 0}
                        <div className="quality-score-bar">
                          <div 
                            className={`quality-score-fill ${getQualityScoreBarClass(question.quality_score)}`}
                            style={{ width: `${question.quality_score * 10}%` }}
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
                      {question.retrieved_docs.length === 0 ? (
                        <button
                          className="button"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#ccc', cursor: 'not-allowed' }}
                          disabled
                        >
                          No Docs
                        </button>
                      ) : (
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
                                quality_score: question.quality_score,
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
                      )}
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
                          <table className="table" style={{ marginTop: '10px', backgroundColor: 'white' }}>
                            <thead>
                              <tr>
                                <th style={{ padding: '8px', backgroundColor: '#f8f9fa', color: '#495057', fontWeight: 'bold' }}>
                                  Retrieved Documents
                                </th>
                                <th style={{ padding: '8px', backgroundColor: '#f8f9fa', color: '#495057', fontWeight: 'bold', textAlign: 'center', width: '140px' }}>
                                  Chunk ID
                                </th>
                                <th style={{ padding: '8px', backgroundColor: '#f8f9fa', color: '#495057', fontWeight: 'bold', textAlign: 'center', width: '160px' }}>
                                  Semantic Similarity Score
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {question.retrieved_docs.map((doc, idx) => (
                                <tr key={idx} style={{ borderBottom: idx < question.retrieved_docs.length - 1 ? '1px solid #dee2e6' : 'none' }}>
                                  <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                                    {doc.doc_id}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <span 
                                      style={{ 
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        color: '#6c757d',
                                        cursor: 'pointer'
                                      }}
                                      title={`Full chunk ID: ${doc.chunk_id || 'unknown'}`}
                                      onClick={() => navigator.clipboard?.writeText(doc.chunk_id || 'unknown')}
                                    >
                                      {doc.chunk_id && doc.chunk_id.length > 8 ? `${doc.chunk_id.substring(0, 8)}...` : (doc.chunk_id || 'unknown')}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <span style={{ 
                                      color: getQualityScoreBarClass(doc.similarity).includes('good') ? '#28a745' :
                                            getQualityScoreBarClass(doc.similarity).includes('weak') ? '#e67e22' : '#dc3545',
                                      fontWeight: 'bold',
                                      fontSize: '0.9rem'
                                    }}>
                                      {doc.similarity ? doc.similarity.toFixed(3) : 0.0}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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