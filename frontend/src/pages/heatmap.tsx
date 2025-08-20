import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { resultsApi, corpusApi } from '../services/api';
import { AnalysisResults as AnalysisResultsType, HeatmapPerspective, HeatmapConfig } from '../types';
import { logSuccess, logError, logInfo, logNavigation } from '../utils/logger';
import NavigationHeader from '../components/NavigationHeader';
import ScatterHeatmap from '../components/heatmap/ScatterHeatmap';
import HeatmapControls from '../components/heatmap/HeatmapControls';
import HeatmapLegend from '../components/heatmap/HeatmapLegend';
import { HeatmapPoint } from '../utils/heatmapData';
import useApiCache from '../hooks/useApiCache';

const InteractiveHeatmapVisualization: React.FC = () => {
  const [results, setResults] = useState<AnalysisResultsType | null>(null);
  const [allChunks, setAllChunks] = useState<Array<{chunk_id: string; doc_id: string; title: string; content: string}> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>({
    perspective: 'chunks-to-questions',
    qualityFilter: 'all',
    showTooltips: true,
    pointSize: 'medium',
    colorIntensity: 1.0
  });
  const [selectedHeatmapPoint, setSelectedHeatmapPoint] = useState<HeatmapPoint | null>(null);
  const [drillDownData, setDrillDownData] = useState<string>('');
  const router = useRouter();
  
  // Initialize API cache with optimized settings for heatmap data
  const { cachedRequest } = useApiCache({
    ttl: 10 * 60 * 1000, // 10 minutes cache for heatmap data
    maxSize: 20 // Small cache for this page's needs
  });

  // Load all chunks once (static data used for chunks-to-questions perspective)
  useEffect(() => {
    const fetchAllChunks = async () => {
      try {
        logInfo('Loading all chunks for heatmap visualization', {
          component: 'Heatmap',
          action: 'CHUNKS_LOAD_START'
        });
        
        // Use cached request with static key for chunks
        const chunksData = await cachedRequest('heatmap_chunks', () => corpusApi.getAllChunks());
        setAllChunks(chunksData.chunks);
        
        logSuccess(`All chunks loaded: ${chunksData.total_count} chunks`, {
          component: 'Heatmap',
          action: 'CHUNKS_LOAD_SUCCESS',
          data: {
            total_chunks: chunksData.total_count,
            cached: true // Indicates this may have been cached
          }
        });
      } catch (err: any) {
        logError('Failed to load all chunks', {
          component: 'Heatmap',
          action: 'CHUNKS_LOAD_ERROR',
          data: {
            error: err.message
          }
        });
      }
    };

    // Only fetch once on mount - allChunks is static data
    fetchAllChunks();
  }, [cachedRequest]); // Include cachedRequest in dependencies

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        logInfo('Loading analysis results for heatmap visualization', {
          component: 'Heatmap',
          action: 'RESULTS_LOAD_START'
        });
        
        // Use cached request for analysis results
        const data = await cachedRequest('heatmap_analysis', () => resultsApi.getAnalysis());
        setResults(data);
        
        logSuccess(`Heatmap data loaded: ${data.overall.total_questions} questions`, {
          component: 'Heatmap', 
          action: 'RESULTS_LOAD_SUCCESS',
          data: {
            total_questions: data.overall.total_questions,
            avg_quality_score: data.overall.avg_quality_score,
            cached: true // Indicates this may have been cached
          }
        });
        
      } catch (err: any) {
        const userMessage = 'Failed to load analysis results for heatmap';
        setError(userMessage);
        
        logError(`Heatmap loading failed: ${userMessage}`, {
          component: 'Heatmap',
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
  }, [cachedRequest]);

  const handleHeatmapConfigChange = useCallback((newConfig: Partial<HeatmapConfig>) => {
    setHeatmapConfig(prev => ({ ...prev, ...newConfig }));
    logInfo('Heatmap configuration changed', {
      component: 'Heatmap',
      action: 'HEATMAP_CONFIG_CHANGE',
      data: newConfig
    });
  }, []);

  const handleHeatmapPointClick = useCallback((point: HeatmapPoint) => {
    setSelectedHeatmapPoint(point);
    logInfo('Heatmap point clicked', {
      component: 'Heatmap',
      action: 'HEATMAP_POINT_CLICK',
      data: {
        pointType: point.data.type,
        pointId: point.id,
        perspective: heatmapConfig.perspective
      }
    });

    // Set drill-down data for display
    if (point.data.type === 'question') {
      setDrillDownData(`Question: "${point.data.questionText}"`);
    } else if (point.data.type === 'chunk') {
      const contentPreview = point.data.content ? 
        (point.data.content.length > 20 ? `${point.data.content.substring(0, 20)}...` : point.data.content) : 
        'No content available';
      setDrillDownData(`Chunk: ${point.data.chunkId} from ${point.data.docId} - "${contentPreview}"`);
    } else if (point.data.type === 'chunk-to-role') {
      const contentPreview = point.data.content ? 
        (point.data.content.length > 20 ? `${point.data.content.substring(0, 20)}...` : point.data.content) : 
        'No content available';
      setDrillDownData(`Chunk: ${point.data.chunkId} from ${point.data.docId} - "${contentPreview}"`);
    } else {
      setDrillDownData(`Data point selected`);
    }
  }, [heatmapConfig.perspective]);

  const handleBackToResults = () => {
    logNavigation('Heatmap', 'Results', {
      component: 'Heatmap',
      action: 'NAVIGATE_TO_RESULTS'
    });
    router.push('/results');
  };

  const handleBackToDashboard = () => {
    logNavigation('Heatmap', 'Dashboard', {
      component: 'Heatmap',
      action: 'NAVIGATE_TO_DASHBOARD'
    });
    router.push('/dashboard');
  };

  // Calculate total chunks for heatmap controls
  const totalChunks = React.useMemo(() => {
    if (!results) return 0;
    const uniqueChunks = new Set();
    results.per_question.forEach(question => {
      question.retrieved_docs.forEach(doc => {
        if (doc.chunk_id) {
          uniqueChunks.add(doc.chunk_id);
        }
      });
    });
    return uniqueChunks.size;
  }, [results]);

  // Calculate total roles for heatmap controls
  const totalRoles = React.useMemo(() => {
    if (!results) return 0;
    const uniqueRoles = new Set();
    results.per_question.forEach(question => {
      if (question.role_name) {
        uniqueRoles.add(question.role_name);
      }
    });
    return uniqueRoles.size;
  }, [results]);

  // Calculate Unretrieved chunk statistics
  const chunkCoverageStats = React.useMemo(() => {
    if (!results || !allChunks) return { 
      totalChunks: 0, 
      retrievedChunks: 0, 
      UnretrievedChunks: 0, 
      coveragePercentage: 0,
      UnretrievedPercentage: 0
    };

    const retrievedChunkIds = new Set();
    results.per_question.forEach(question => {
      question.retrieved_docs.forEach(doc => {
        if (doc.chunk_id) {
          retrievedChunkIds.add(doc.chunk_id);
        }
      });
    });

    const totalChunks = allChunks.length;
    const retrievedChunks = retrievedChunkIds.size;
    const UnretrievedChunks = totalChunks - retrievedChunks;
    const coveragePercentage = totalChunks > 0 ? Math.round((retrievedChunks / totalChunks) * 100) : 0;
    const UnretrievedPercentage = totalChunks > 0 ? Math.round((UnretrievedChunks / totalChunks) * 100) : 0;

    return {
      totalChunks,
      retrievedChunks,
      UnretrievedChunks,
      coveragePercentage,
      UnretrievedPercentage
    };
  }, [results, allChunks]);

  // Helper function to get quality score status
  const getStatusText = (score: number) => {
    if (score >= 7.0) return 'GOOD';
    if (score >= 5.0) return 'WEAK';
    return 'POOR';
  };

  // Calculate advanced insights
  const advancedInsights = React.useMemo(() => {
    if (!results) return null;

    const llmScore = results.per_group.llm?.avg_quality_score || 0;
    const ragasScore = results.per_group.ragas?.avg_quality_score || 0;
    const performanceDiff = Math.abs(llmScore - ragasScore);
    const betterPerformer = llmScore > ragasScore ? 'LLM' : 'RAGAS';
    
    const rolePerformance = Object.entries(results.per_group).flatMap(([groupName, groupData]) => 
      Object.entries(groupData.roles || {}).map(([roleName, roleData]) => ({
        role: roleName,
        group: groupName,
        score: roleData.avg_quality_score
      }))
    ).sort((a, b) => b.score - a.score);

    const topRole = rolePerformance[0];
    const worstRole = rolePerformance[rolePerformance.length - 1];

    return {
      performanceDiff: performanceDiff.toFixed(1),
      betterPerformer,
      topRole,
      worstRole,
      roleSpread: rolePerformance.length > 1 ? (topRole.score - worstRole.score).toFixed(1) : 0
    };
  }, [results]);

  if (loading) {
    return (
      <div>
        <NavigationHeader currentPage="heatmap" />
        <div className="card">
          <h2>🗺️ Loading Interactive Data Visualization...</h2>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', color: '#666' }}>Please wait...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <NavigationHeader currentPage="heatmap" />
        <div className="card">
          <h2>Error Loading Heatmap Data</h2>
          <div style={{ color: '#dc3545', padding: '20px' }}>
            {error}
          </div>
          <div style={{ marginTop: '20px' }}>
            <button className="button button-secondary" onClick={handleBackToResults}>
              ← Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!results || results.overall.total_questions === 0) {
    return (
      <div>
        <NavigationHeader currentPage="heatmap" />
        <div className="card">
          <h2>🗺️ Interactive Data Visualization</h2>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '24px', color: '#666', marginBottom: '20px' }}>
              No Data Available for Visualization
            </div>
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '30px' }}>
              Run an experiment first to generate heatmap visualizations.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <button className="button" onClick={handleBackToResults}>
                ← Back to Results
              </button>
              <button className="button button-secondary" onClick={handleBackToDashboard}>
                🏠 Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavigationHeader currentPage="heatmap" />
      <div className="card">
        <h2>🗺️ Interactive Data Visualization</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          Explore question-chunk relationships through interactive scatter plot heatmaps with dual perspectives
        </p>
        
        {/* Summary Statistics */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '15px', 
            marginBottom: '20px'
          }}>
            {/* Average Quality Score Card */}
            <div style={{ backgroundColor: '#e6f7e6', border: '2px solid #28a745', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#155724', fontSize: '0.9rem' }}>🎯 Quality Score</h4>
              <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                <span style={{ color: '#28a745', fontSize: '1.8rem', fontWeight: 'bold', display: 'block' }}>
                  {results.overall.avg_quality_score ? results.overall.avg_quality_score.toFixed(1) : 0}
                </span>
                <div style={{ 
                  backgroundColor: results.overall.avg_quality_score >= 7.0 ? '#28a745' : results.overall.avg_quality_score >= 5.0 ? '#e67e22' : '#dc3545',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  marginTop: '3px',
                  display: 'inline-block'
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

            {/* Total Chunks Card */}
            <div style={{ backgroundColor: '#e6f7ff', border: '2px solid #0c7cd5', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#064785', fontSize: '0.9rem' }}>📄 Total Chunks</h4>
              <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                <span style={{ color: '#0c7cd5', fontSize: '1.8rem', fontWeight: 'bold', display: 'block' }}>
                  {chunkCoverageStats.totalChunks}
                </span>
                <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>Document Chunks Available</div>
              </div>
            </div>
          </div>

          {/* Perspective-specific Coverage Statistics */}
          {(heatmapConfig.perspective === 'chunks-to-questions' || heatmapConfig.perspective === 'chunks-to-roles') && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px'
            }}>
              {/* Coverage Percentage Card */}
              <div style={{ backgroundColor: '#f0f8ff', border: '2px solid #007bff', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#0056b3', fontSize: '0.9rem' }}>📊 Chunk Coverage</h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span style={{ color: '#007bff', fontSize: '1.6rem', fontWeight: 'bold', display: 'block' }}>
                    {chunkCoverageStats.coveragePercentage}%
                  </span>
                  <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>
                    {chunkCoverageStats.retrievedChunks} of {chunkCoverageStats.totalChunks} Chunks Retrieved
                  </div>
                </div>
              </div>

              {/* Unretrieved Chunks Card */}
              <div style={{ backgroundColor: '#f8f9fa', border: '2px solid #6c757d', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#495057', fontSize: '0.9rem' }}>🔍 Unretrieved Chunks</h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span style={{ color: '#6c757d', fontSize: '1.6rem', fontWeight: 'bold', display: 'block' }}>
                    {chunkCoverageStats.UnretrievedPercentage}%
                  </span>
                  <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>
                    {chunkCoverageStats.UnretrievedChunks} Chunks Never Retrieved
                  </div>
                </div>
              </div>

              {/* Unique Roles Card (only for chunks-to-roles) */}
              {heatmapConfig.perspective === 'chunks-to-roles' && (
                <div style={{ backgroundColor: '#fff8dc', border: '2px solid #b8860b', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#5c4b00', fontSize: '0.9rem' }}>👥 User Roles</h4>
                  <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                    <span style={{ color: '#b8860b', fontSize: '1.6rem', fontWeight: 'bold', display: 'block' }}>
                      {totalRoles}
                    </span>
                    <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>Distinct User Roles</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Smart Insights Section */}
          {advancedInsights && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px',
              marginTop: '15px'
            }}>
              {/* Performance Gap Insight */}
              <div style={{ backgroundColor: '#fff3cd', border: '2px solid #ffc107', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#856404', fontSize: '0.9rem' }}>⚡ Performance Gap</h4>
                <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                  <span style={{ color: '#ffc107', fontSize: '1.4rem', fontWeight: 'bold', display: 'block' }}>
                    {advancedInsights.performanceDiff}
                  </span>
                  <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>
                    Points between {advancedInsights.betterPerformer} & others
                  </div>
                </div>
              </div>

              {/* Role Performance Spread */}
              {advancedInsights.topRole && advancedInsights.worstRole && (
                <div style={{ backgroundColor: '#e7f3ff', border: '2px solid #0066cc', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#004099', fontSize: '0.9rem' }}>🎭 Role Spread</h4>
                  <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                    <span style={{ color: '#0066cc', fontSize: '1.4rem', fontWeight: 'bold', display: 'block' }}>
                      {advancedInsights.roleSpread}
                    </span>
                    <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>
                      Best: {advancedInsights.topRole.role} vs Worst: {advancedInsights.worstRole.role}
                    </div>
                  </div>
                </div>
              )}

              {/* Coverage Efficiency (for chunk views) */}
              {(heatmapConfig.perspective === 'chunks-to-questions' || heatmapConfig.perspective === 'chunks-to-roles') && (
                <div style={{ backgroundColor: '#f0fff0', border: '2px solid #28a745', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#155724', fontSize: '0.9rem' }}>🎯 Efficiency</h4>
                  <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                    <span style={{ color: '#28a745', fontSize: '1.4rem', fontWeight: 'bold', display: 'block' }}>
                      {chunkCoverageStats.coveragePercentage > 80 ? '🏆' : chunkCoverageStats.coveragePercentage > 60 ? '👍' : '⚠️'}
                    </span>
                    <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>
                      {chunkCoverageStats.coveragePercentage > 80 ? 'Excellent Coverage' 
                       : chunkCoverageStats.coveragePercentage > 60 ? 'Good Coverage' 
                       : 'Coverage Needs Improvement'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Heatmap Controls */}
        <HeatmapControls
          config={heatmapConfig}
          onConfigChange={handleHeatmapConfigChange}
          totalQuestions={results.overall.total_questions}
          totalChunks={totalChunks}
          totalRoles={totalRoles}
        />

        {/* Main Visualization Area */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 280px', 
          gap: '8px', 
          marginBottom: '20px',
          minHeight: '500px'
        }}>
          
          {/* Heatmap Visualization */}
          <div className="card" style={{ padding: '10px' }}>
            <ScatterHeatmap
              questionResults={results.per_question}
              perspective={heatmapConfig.perspective}
              qualityFilter={heatmapConfig.qualityFilter}
              onPointClick={heatmapConfig.showTooltips ? handleHeatmapPointClick : undefined}
              width={780}
              height={460}
              allChunks={allChunks || undefined}
              totalChunks={chunkCoverageStats.totalChunks}
            />
          </div>
          
          {/* Legend and Actions Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <HeatmapLegend
              perspective={heatmapConfig.perspective}
              style={{ height: 'fit-content' }}
            />
            
            {/* Quick Actions Panel */}
            <div className="card" style={{ padding: '10px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '0.8rem' }}>
                🔗 Quick Actions
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button 
                  className="button button-secondary"
                  onClick={handleBackToResults}
                  style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                >
                  📊 Analysis Results
                </button>
                <button 
                  className="button button-secondary"
                  onClick={handleBackToDashboard}
                  style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                >
                  🏠 Dashboard
                </button>
              </div>
            </div>
            
            {/* Drill-down Information Panel */}
            {selectedHeatmapPoint && (
              <div className="card" style={{ padding: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '0.85rem' }}>
                  🎯 Selected Point Details
                </h4>
                <div style={{
                  backgroundColor: '#e8f4fd',
                  border: '1px solid #bee5eb',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '0.8rem',
                  lineHeight: '1.4'
                }}>
                  <strong>Type:</strong> {selectedHeatmapPoint.data.type === 'question' ? 'Question' : selectedHeatmapPoint.data.type === 'chunk' ? 'Document Chunk' : selectedHeatmapPoint.data.type === 'role' ? 'User Role' : 'Chunk Role Analysis'}<br/>
                  <strong>Details:</strong> {drillDownData}<br/>
                  {selectedHeatmapPoint.data.type === 'question' ? (
                    <>
                      <strong>Source:</strong> {selectedHeatmapPoint.data.source.toUpperCase()}<br/>
                      <strong>Quality Score:</strong> {selectedHeatmapPoint.data.qualityScore.toFixed(1)}<br/>
                      <strong>Chunks Retrieved:</strong> {selectedHeatmapPoint.data.chunkFrequency}
                    </>
                  ) : selectedHeatmapPoint.data.type === 'chunk' ? (
                    <>
                      <strong>Retrieval Frequency:</strong> {selectedHeatmapPoint.data.retrievalFrequency} questions<br/>
                      <strong>Avg Similarity:</strong> {selectedHeatmapPoint.data.avgSimilarity.toFixed(3)}<br/>
                      <strong>Best Match:</strong> {selectedHeatmapPoint.data.bestQuestion.similarity.toFixed(3)}
                    </>
                  ) : selectedHeatmapPoint.data.type === 'role' ? (
                    <>
                      <strong>Avg Quality Score:</strong> {selectedHeatmapPoint.data.avgQualityScore.toFixed(1)}<br/>
                      <strong>Questions:</strong> {selectedHeatmapPoint.data.questionCount}<br/>
                      <strong>Unique Chunks:</strong> {selectedHeatmapPoint.data.totalChunksRetrieved}
                    </>
                  ) : selectedHeatmapPoint.data.type === 'chunk-to-role' ? (
                    <>
                      <strong>Total Retrievals:</strong> {selectedHeatmapPoint.data.totalRetrievals}<br/>
                      <strong>Avg Similarity:</strong> {selectedHeatmapPoint.data.avgSimilarity.toFixed(3)}<br/>
                      <strong>Dominant Role:</strong> {selectedHeatmapPoint.data.dominantRole.roleName}
                    </>
                  ) : selectedHeatmapPoint.data.type === 'unassociated-cluster' ? (
                    <>
                      <strong>Cluster:</strong> {selectedHeatmapPoint.data.clusterId}<br/>
                      <strong>Chunks in Cluster:</strong> {selectedHeatmapPoint.data.chunkCount}<br/>
                      <strong>Documents:</strong> {selectedHeatmapPoint.data.documentBreakdown.length}
                    </>
                  ) : null}
                </div>
                <button
                  onClick={() => {
                    setSelectedHeatmapPoint(null);
                    setDrillDownData('');
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    width: '100%'
                  }}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '30px',
          borderTop: '1px solid #dee2e6',
          paddingTop: '20px'
        }}>
          <button 
            className="button button-secondary" 
            onClick={handleBackToResults}
          >
            ← Back to Analysis Results
          </button>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="button button-secondary" 
              onClick={handleBackToDashboard}
              style={{ backgroundColor: '#28a745' }}
            >
              🏠 Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveHeatmapVisualization;