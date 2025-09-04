import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import usePageNavigation from '../hooks/usePageNavigation';
import usePageData from '../hooks/usePageData';
import { LABEL_DASHBOARD, LABEL_HEATMAP } from '../utils/constants';
import { resultsApi } from '../services/api';
import { AnalysisResults as AnalysisResultsType } from '../types';
import { logInfo, logSuccess, logError } from '../utils/logger';
import { getStatusColor as getStatusColorShared, getStatus as getStatusShared } from '../utils/qualityScore';
import PageWrapper from '../components/ui/PageWrapper';
import QualityScoreLegend from '../components/QualityScoreLegend';
import BalloonTooltip from '../components/ui/BalloonTooltip';
import { createStorageAdapter } from '../services/storage';
import QuickActions from '../components/ui/QuickActions';
import ExperimentBanner from '../components/ui/ExperimentBanner';
import { useExperimentName } from '../hooks/useExperimentName';

const AnalysisResults: React.FC = () => {
  // UI state management (not moved to usePageData)
  const [sortField, setSortField] = useState<'quality_score' | 'source' | 'status'>('quality_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'good' | 'developing' | 'poor'>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [isRoleAnalysisExpanded, setIsRoleAnalysisExpanded] = useState(false);
  const [isAdvancedVisualizationExpanded, setIsAdvancedVisualizationExpanded] = useState(false);
  
  const { goTo } = usePageNavigation('Results');
  const router = useRouter();

  // Get experiment filename from query parameter
  const experimentFilename = router.query.experiment as string;
  
  // Use shared hook for experiment name fetching
  const { experimentName, loadExperimentName } = useExperimentName('Results');

  // Stable data loader function that loads specific experiment if provided
  const dataLoader = useCallback(async () => {
    // If a specific experiment is requested, load it first and get its name
    if (experimentFilename) {
      await loadExperimentName(experimentFilename);
    }
    
    // Get the analysis results
    return resultsApi.getAnalysis();
  }, [experimentFilename, loadExperimentName]);

  // Data loading with standard pattern
  const { data: results, loading, error, reload } = usePageData<AnalysisResultsType>(
    dataLoader,
    {
      component: 'Results',
      loadAction: 'RESULTS_LOAD_START',
      successAction: 'RESULTS_LOAD_SUCCESS',
      errorAction: 'RESULTS_LOAD_ERROR',
      userErrorMessage: 'Failed to load analysis results',
      successMessage: (data: AnalysisResultsType) => 
        `Results loaded: ${data.overall.total_questions} questions analyzed`,
      successData: (data: AnalysisResultsType) => ({
        total_questions: data.overall.total_questions,
        avg_quality_score: data.overall.avg_quality_score,
        success_rate: data.overall.success_rate,

        llm_avg_quality_score: data.per_group.llm?.avg_quality_score ?? 0,
        ragas_avg_quality_score: data.per_group.ragas?.avg_quality_score ?? 0
      })
    }
  );

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

  const getStatusColor = (qualityScore: number) => getStatusColorShared(qualityScore);
  const getStatusText = (qualityScore: number) => getStatusShared(qualityScore).toUpperCase();



  const getQualityScoreBarClass = (qualityScore: number) => {
    if (qualityScore >= 7.0) return 'quality-score-good';
    if (qualityScore >= 5.0) return 'quality-score-developing';
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
        const questionMatch = q.text && typeof q.text === 'string' && q.text.toLowerCase().includes(searchLower);
        
        const sourceMatch = q.source && typeof q.source === 'string' && q.source.toLowerCase().includes(searchLower);

        // Search in document titles
        const docMatch = q.retrieved_docs.some(doc => 
          (doc.title && typeof doc.title === 'string' && doc.title.toLowerCase().includes(searchLower)) ||
          (doc.doc_id && typeof doc.doc_id === 'string' && doc.doc_id.toLowerCase().includes(searchLower))
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
    goTo('/experiment', 'Experiment', { action: 'NAVIGATE_TO_EXPERIMENT' });
  };

  const handleRunNewExperiment = () => {
    goTo('/dashboard', LABEL_DASHBOARD, { action: 'NAVIGATE_TO_DASHBOARD', data: { reason: 'new_experiment' } });
  };

  const handleManageExperiments = () => {
    goTo('/experiments', 'Experiments', { action: 'NAVIGATE_TO_EXPERIMENTS' });
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

      const storageAdapter = createStorageAdapter();
      const response = await storageAdapter.clearResults();
      
      if (response.success) {
        reload(); // Reload the data after clearing
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
    goTo('/heatmap', LABEL_HEATMAP, { action: 'NAVIGATE_TO_HEATMAP', data: { total_questions: results?.overall.total_questions, avg_quality_score: results?.overall.avg_quality_score } });
  };

  // Loading and error handling moved to PageWrapper

  // Error handling moved to PageWrapper

  // Special case: no results available
  if (!loading && !error && (!results || results.overall.total_questions === 0)) {
    return (
      <PageWrapper currentPage="results">
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
                🏠 Dashboard
              </button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper 
      currentPage="results"
      loading={loading}
      error={error}
      loadingMessage="Loading Analysis Results..."
      errorTitle="Error Loading Results"
      onRetry={reload}
    >
      {results && (
      <div className="card">
        <h2>📊 Analysis Results Dashboard</h2>
        {experimentFilename && (
          <ExperimentBanner 
            experimentFilename={experimentFilename}
            experimentName={experimentName}
            variant="results"
          />
        )}
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          3-Level infographic analysis results
        </p>

        <div className="analysis-section">
          <h3>📊 Overall Analysis</h3>
          <div className="card" style={{ backgroundColor: '#f8f9fa', border: '2px solid #dee2e6', padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              
              {/* Quality Score Card */}
              <div style={{ backgroundColor: '#e8f5e8', border: '2px solid #1e7e34', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0a3d0f', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯 Overall Quality Score</span>
                  <BalloonTooltip 
                    content="Average quality score across all questions (0-10 scale). Calculated from semantic similarity between questions and retrieved documents. Higher scores indicate better corpus coverage."
                    maxWidth={320} 
                    cursor="help"
                  >
                    <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                  </BalloonTooltip>
                </h4>
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
                <h4 style={{ margin: '0 0 8px 0', color: '#6a1a3a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📈 Success Rate</span>
                  <BalloonTooltip 
                    content="Percentage of questions achieving GOOD quality scores (≥7.0). This indicates how well your corpus answers the tested questions."
                    maxWidth={300} 
                    cursor="help"
                  >
                    <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                  </BalloonTooltip>
                </h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span style={{ color: '#d63384', fontSize: '1.8rem', fontWeight: 'bold', display: 'block' }}>
                    {Math.round(results.overall.success_rate * 100)}%
                  </span>
                  <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>High Quality Rate (≥7.0)</div>
                </div>
              </div>

              {/* Questions Processed Card */}
              <div style={{ backgroundColor: '#e6e6ff', border: '2px solid #5a3bb0', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#3a1d66', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📊 Processing Volume</span>
                  <BalloonTooltip 
                    content="Total number of questions tested in this experiment. More questions provide better coverage assessment but take longer to process."
                    maxWidth={300} 
                    cursor="help"
                  >
                    <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                  </BalloonTooltip>
                </h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span style={{ color: '#5a3bb0', fontSize: '1.8rem', fontWeight: 'bold', display: 'block' }}>
                    {results.overall.total_questions}
                  </span>
                  <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>Questions Processed</div>
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

        {/* Quick Actions */}
        <QuickActions
          actions={[
            {
              label: `Focus on Poor Questions (${results.per_question.filter(q => q.status === 'poor').length})`,
              icon: '🔍',
              onClick: () => {
                const poorQuestions = results.per_question.filter(q => q.status === 'poor');
                if (poorQuestions.length > 0) {
                  setExpandedQuestion(poorQuestions[0].id);
                  setFilterStatus('poor');
                  document.getElementById('per-question-analysis')?.scrollIntoView({ behavior: 'smooth' });
                }
              }
            },
            {
              label: `View Top Performers (${results.per_question.filter(q => q.status === 'good').length})`,
              icon: '✨',
              onClick: () => {
                setFilterStatus('good');
                document.getElementById('per-question-analysis')?.scrollIntoView({ behavior: 'smooth' });
              }
            },
            {
              label: 'Gap Analysis',
              icon: '🎯',
              variant: 'accent',
              onClick: () => goTo('/gap-analysis', 'Gap Analysis', { 
                action: 'NAVIGATE_TO_GAP_ANALYSIS_FROM_RESULTS', 
                data: { 
                  total_questions: results.overall.total_questions,
                  poor_questions_count: results.per_question.filter(q => q.status === 'poor').length 
                } 
              })
            },
            {
              label: 'Interactive Heatmap',
              icon: '🗺️',
              variant: 'primary',
              onClick: handleViewHeatmap
            }
          ]}
          style={{ marginBottom: '20px' }}
        />

        <div className="analysis-section">
          <h3 
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #dee2e6',
              marginBottom: '15px'
            }}
            onClick={() => setIsRoleAnalysisExpanded(!isRoleAnalysisExpanded)}
          >
            <span>🗂️ Per Group Role Analysis</span>
            <span style={{ fontSize: '0.8em', color: '#666' }}>
              {isRoleAnalysisExpanded ? '▼ Collapse' : '▶ Expand'}
            </span>
          </h3>
          {isRoleAnalysisExpanded && Object.entries(results.per_group).map(([groupName, groupData]) => (
            <div key={groupName} className="card" style={{ marginBottom: '20px' }}>
              <h4>{groupName.toUpperCase()} - Role Breakdown</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">Avg Quality Score</th>
                    <th scope="col">High Quality Scores (≥7.0)</th>
                    <th scope="col">Score Distribution</th>
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
          <h3 
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #dee2e6',
              marginBottom: '15px'
            }}
            onClick={() => setIsAdvancedVisualizationExpanded(!isAdvancedVisualizationExpanded)}
          >
            <span>🗺️ Advanced Visualization</span>
            <span style={{ fontSize: '0.8em', color: '#666' }}>
              {isAdvancedVisualizationExpanded ? '▼ Collapse' : '▶ Expand'}
            </span>
          </h3>
          {isAdvancedVisualizationExpanded && (
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
              Explore multi-dimensional RAG relationships through interactive scatter plot heatmaps with three distinct perspectives. 
              Analyze document clustering, role-based access patterns, chunk retrieval analysis, and identify optimization opportunities in your RAG system.
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '15px', 
              marginBottom: '20px',
              fontSize: '0.9rem',
              color: '#666'
            }}>
              <div>
                <strong style={{ color: '#007bff' }}>📋 Documents → Chunks</strong><br/>
                View document hexagon blocks containing multiple chunks, including unassociated chunks
              </div>
              <div>
                <strong style={{ color: '#007bff' }}>🎭 Roles → Chunks</strong><br/>
                View how different user roles access document chunks and analyze retrieval patterns by role
              </div>
              <div>
                <strong style={{ color: '#007bff' }}>📄 Chunks → Questions</strong><br/>
                See how chunks are retrieved with Unretrieved chunk detection
              </div>
              <div>
                <strong style={{ color: '#007bff' }}>📊 Coverage Analytics</strong><br/>
                Track chunk utilization and identify gaps
              </div>
              <div>
                <strong style={{ color: '#007bff' }}>🎯 Smart Insights</strong><br/>
                Performance gaps and efficiency indicators
              </div>
              <div>
                <strong style={{ color: '#007bff' }}>⚙️ Advanced Controls</strong><br/>
                Quality filters, perspective switching, and point size controls
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                className="button"
                onClick={handleViewHeatmap}
                style={{ 
                  fontSize: '14px', 
                  padding: '10px 20px',
                  backgroundColor: '#007bff'
                }}
              >
                🗺️ Interactive Heatmap
              </button>
              
              <button 
                className="button button-secondary"
                onClick={() => goTo('/gap-analysis', 'Gap Analysis', { 
                  action: 'NAVIGATE_TO_GAP_ANALYSIS_FROM_RESULTS_ADVANCED', 
                  data: { 
                    from_section: 'advanced_visualization',
                    total_questions: results.overall.total_questions 
                  } 
                })}
                style={{ 
                  fontSize: '14px', 
                  padding: '10px 20px',
                  backgroundColor: '#e67e22',
                  color: 'white'
                }}
              >
                🎯 Gap Analysis
              </button>
              
              <button 
                className="button button-secondary"
                onClick={() => goTo('/', LABEL_DASHBOARD, { 
                  action: 'NAVIGATE_TO_DASHBOARD_FROM_RESULTS_ADVANCED', 
           
                })}
                style={{ 
                  fontSize: '14px', 
                  padding: '10px 20px',
                  backgroundColor: '#28a745'
                }}
              >
                🏠 Dashboard
              </button>
            </div>
          </div>
          )}
        </div>

        <div className="analysis-section" id="per-question-analysis">
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
                <option value="developing">Developing</option>
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
                <th scope="col" style={{ cursor: 'pointer' }} onClick={() => handleSort('source')} aria-label="Sort by source">
                  Source {sortField === 'source' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col">Role</th>
                <th scope="col">Question</th>
                <th scope="col" style={{ cursor: 'pointer' }} onClick={() => handleSort('quality_score')} aria-label="Sort by quality score">
                  Quality Score {sortField === 'quality_score' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" style={{ cursor: 'pointer' }} onClick={() => handleSort('status')} aria-label="Sort by status">
                  Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col">Retrieved Docs</th>
                <th scope="col">Actions</th>
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
                          aria-label="No documents available for this question"
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
                          aria-label={`${expandedQuestion === question.id ? 'Hide' : 'View'} documents for question ${question.id}`}
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
                                <th style={{ padding: '8px', backgroundColor: '#f8f9fa', color: '#495057', fontWeight: 'bold', textAlign: 'center', width: '300px' }}>
                                  Chunk Content
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
                                    {doc.title || doc.doc_id}
                                  </td>
                                  <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                                    {doc.content ? (
                                      <BalloonTooltip
                                        content={doc.content.length > 500 ? `${doc.content.substring(0, 500)}...` : doc.content}
                                        maxWidth={400}
                                        cursor="help"
                                      >
                                        <div 
                                          style={{ 
                                            fontSize: '0.8rem',
                                            color: '#495057',
                                            lineHeight: '1.4',
                                            wordBreak: 'break-word'
                                          }}
                                        >
                                          {doc.content.length > 20 ? `${doc.content.substring(0, 20)}...` : doc.content}
                                        </div>
                                      </BalloonTooltip>
                                    ) : (
                                      <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                        No content available
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <BalloonTooltip
                                      content={`Full chunk ID: ${doc.chunk_id || 'unknown'}\n\nClick to copy to clipboard`}
                                      maxWidth={350}
                                      cursor="pointer"
                                    >
                                      <span 
                                        style={{ 
                                          fontFamily: 'monospace',
                                          fontSize: '0.75rem',
                                          color: '#6c757d'
                                        }}
                                        onClick={() => navigator.clipboard?.writeText(doc.chunk_id || 'unknown')}
                                      >
                                        {doc.chunk_id && doc.chunk_id.length > 8 ? `${doc.chunk_id.substring(0, 8)}...` : (doc.chunk_id || 'unknown')}
                                      </span>
                                    </BalloonTooltip>
                                  </td>
                                  <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <span style={{ 
                                      color: getQualityScoreBarClass(doc.similarity).includes('good') ? '#28a745' :
                                            getQualityScoreBarClass(doc.similarity).includes('developing') ? '#e67e22' : '#dc3545',
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
      )}
    </PageWrapper>
  );
};

export default AnalysisResults;