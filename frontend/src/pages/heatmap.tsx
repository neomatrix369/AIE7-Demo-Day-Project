import React, { useState, useEffect, useCallback } from 'react';
import usePageNavigation from '../hooks/usePageNavigation';
import usePageData from '../hooks/usePageData';
import { resultsApi, corpusApi } from '../services/api';
import { AnalysisResults as AnalysisResultsType, HeatmapConfig } from '../types';
import { logSuccess, logError, logInfo, logNavigation } from '../utils/logger';
import PageWrapper from '../components/ui/PageWrapper';
import ScatterHeatmap from '../components/heatmap/ScatterHeatmap';
import HeatmapControls from '../components/heatmap/HeatmapControls';
import HeatmapLegend from '../components/heatmap/HeatmapLegend';
import { HeatmapPoint } from '../utils/heatmapData';
import useApiCache from '../hooks/useApiCache';
import { DEFAULT_CACHE_TTL_MS, DEFAULT_CACHE_MAX_SIZE, LABEL_DASHBOARD, LABEL_RESULTS } from '../utils/constants';
import QuickActions from '../components/ui/QuickActions';

const InteractiveHeatmapVisualization: React.FC = () => {
  // Complex UI state (kept separate from usePageData)
  const [allChunks, setAllChunks] = useState<Array<{chunk_id: string; doc_id: string; title: string; content: string}> | null>(null);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>({
    perspective: 'documents-to-chunks',
    qualityFilter: 'all',
    showTooltips: true,
    pointSize: 'medium',
    colorIntensity: 1.0
  });
  const [selectedHeatmapPoint, setSelectedHeatmapPoint] = useState<HeatmapPoint | null>(null);
  const [drillDownData, setDrillDownData] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  const { goTo } = usePageNavigation('Heatmap');

  // Stable data loader function
  const dataLoader = useCallback(() => resultsApi.getAnalysis(), []);

  // Main data loading with standard pattern
  const { data: results, loading, error, reload } = usePageData<AnalysisResultsType>(
    dataLoader,
    {
      component: 'Heatmap',
      loadAction: 'RESULTS_LOAD_START',
      successAction: 'RESULTS_LOAD_SUCCESS',
      errorAction: 'RESULTS_LOAD_ERROR',
      userErrorMessage: 'Failed to load analysis results for heatmap',
      successMessage: (data: AnalysisResultsType) => 
        `Heatmap data loaded: ${data.overall.total_questions} questions analyzed`,
      successData: (data: AnalysisResultsType) => ({
        total_questions: data.overall.total_questions,
        avg_quality_score: data.overall.avg_quality_score
      })
    }
  );
  
  // Initialize API cache with optimized settings for heatmap data
  const { cachedRequest } = useApiCache({
    ttl: DEFAULT_CACHE_TTL_MS,
    maxSize: DEFAULT_CACHE_MAX_SIZE
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
        const errorMessage = err.response?.data?.user_message || err.message || 'Failed to load chunk data';
        setChunkError(errorMessage);
        
        logError('Failed to load all chunks', {
          component: 'Heatmap',
          action: 'CHUNKS_LOAD_ERROR',
          data: {
            error: err.message,
            status: err.response?.status,
            database_connected: err.response?.data?.database_connected
          }
        });
      }
    };

    // Only fetch once on mount - allChunks is static data
    fetchAllChunks();
  }, [cachedRequest]); // Include cachedRequest in dependencies

  // Results loading moved to usePageData hook

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
    logNavigation('Heatmap', LABEL_RESULTS, {
      component: 'Heatmap',
      action: 'NAVIGATE_TO_RESULTS'
    });
    goTo('/results', 'Results');
  };

  const handleBackToDashboard = () => {
    logNavigation('Heatmap', LABEL_DASHBOARD, {
      component: 'Heatmap',
      action: 'NAVIGATE_TO_DASHBOARD'
    });
    goTo('/dashboard', 'Dashboard');
  };

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    logInfo('Heatmap visualization refreshed', {
      component: 'Heatmap',
      action: 'REFRESH_VISUALIZATION'
    });
  }, []);

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

  // Calculate total documents for heatmap controls (documents with chunks)
  const totalDocuments = React.useMemo(() => {
    if (!results || !allChunks) return 0;
    
    // Build document map exactly like the heatmap visualization does
    const documentMap = new Map<string, boolean>();
    
    // Add documents from retrieved chunks
    results.per_question.forEach(question => {
      (question.retrieved_docs || []).forEach(doc => {
        if (doc.doc_id) {
          documentMap.set(doc.doc_id, true);
        }
      });
    });
    
    // Add documents from all chunks (for unassociated chunks)
    allChunks.forEach(chunk => {
      if (chunk.doc_id) {
        documentMap.set(chunk.doc_id, true);
      }
    });
    
    return documentMap.size;
  }, [results, allChunks]);

  // Calculate Unretrieved chunk statistics
  const chunkCoverageStats = React.useMemo(() => {
    if (!results || !allChunks) return { 
      totalChunks: null, // Use null to indicate data not available
      retrievedChunks: null, 
      unretrievedChunks: null, 
      coveragePercentage: null,
      unretrievedPercentage: null,
      isDataAvailable: false
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
    const unretrievedChunks = totalChunks - retrievedChunks;
    const coveragePercentage = totalChunks > 0 ? Math.round((retrievedChunks / totalChunks) * 100) : 0;
    const unretrievedPercentage = totalChunks > 0 ? Math.round((unretrievedChunks / totalChunks) * 100) : 0;

    return {
      totalChunks,
      retrievedChunks,
      unretrievedChunks,
      coveragePercentage,
      unretrievedPercentage,
      isDataAvailable: true
    };
  }, [results, allChunks]);


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

  // Loading and error handling moved to PageWrapper below

  // Special case: no data available for visualization  
  if (!loading && !error && (!results || results.overall.total_questions === 0)) {
    return (
      <PageWrapper currentPage="heatmap">
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
      currentPage="heatmap"
      loading={loading}
      error={error}
      loadingMessage="🗺️ Loading Interactive Data Visualization..."
      errorTitle="Error Loading Heatmap Data"
      onRetry={reload}
    >
      {results && (
      <div className="card">
        <h2>🗺️ Interactive Data Visualization</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          Explore multi-dimensional RAG relationships through interactive scatter plot heatmaps with three distinct perspectives: document clustering, role-based access patterns, and chunk retrieval analysis
        </p>
        
        {/* Coverage Statistics - Essential visualization metrics */}
        <div style={{ marginBottom: '30px' }}>
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
                  {chunkCoverageStats.isDataAvailable ? `${chunkCoverageStats.coveragePercentage}%` : '⏳'}
                </span>
                <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>
                  {chunkCoverageStats.isDataAvailable 
                    ? `${chunkCoverageStats.retrievedChunks} of ${chunkCoverageStats.totalChunks} Chunks Retrieved`
                    : 'Calculating coverage...'}
                </div>
              </div>
            </div>

            {/* Unretrieved Chunks Card */}
            <div style={{ backgroundColor: '#f8f9fa', border: '2px solid #6c757d', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#495057', fontSize: '0.9rem' }}>🔍 Unretrieved Chunks</h4>
              <div style={{ backgroundColor: 'white', borderRadius: '4px', padding: '8px' }}>
                <span style={{ color: '#6c757d', fontSize: '1.6rem', fontWeight: 'bold', display: 'block' }}>
                  {chunkCoverageStats.isDataAvailable ? `${chunkCoverageStats.unretrievedPercentage}%` : '⏳'}
                </span>
                <div style={{ color: '#666', marginTop: '3px', fontSize: '0.8rem' }}>
                  {chunkCoverageStats.isDataAvailable 
                    ? `${chunkCoverageStats.unretrievedChunks} Chunks Never Retrieved`
                    : 'Loading unretrieved data...'}
                </div>
              </div>
            </div>

          </div>

          {/* Smart Insights Section */}
          {advancedInsights && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px',
              marginTop: '15px'
            }}>

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
          totalDocuments={totalDocuments}
          onRefresh={handleRefresh}
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
            {!chunkCoverageStats.isDataAvailable ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '460px',
                color: chunkError ? '#dc3545' : '#666',
                backgroundColor: chunkError ? '#fff5f5' : '#f8f9fa',
                border: `2px dashed ${chunkError ? '#f5c6cb' : '#dee2e6'}`,
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                  {chunkError ? '⚠️' : '⏳'}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  {chunkError ? 'Database Connection Issue' : 'Loading Heatmap Data'}
                </div>
                <div style={{ fontSize: '1rem', textAlign: 'center' }}>
                  {chunkError ? (
                    <>
                      {chunkError}
                      <br />
                      <small style={{ color: '#999' }}>
                        Please ensure Qdrant database is running: <code>./scripts/setup_qdrant.sh</code>
                      </small>
                    </>
                  ) : (
                    <>
                      Waiting for database connection and chunk data...
                      <br />
                      <small style={{ color: '#999' }}>
                        Please ensure Qdrant database is running and accessible
                      </small>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <ScatterHeatmap
                key={refreshKey}
                questionResults={results.per_question}
                perspective={heatmapConfig.perspective}
                qualityFilter={heatmapConfig.qualityFilter}
                onPointClick={heatmapConfig.showTooltips ? handleHeatmapPointClick : undefined}
                width={780}
                height={460}
                allChunks={allChunks || undefined}
                totalChunks={chunkCoverageStats.totalChunks!}
                showTooltips={heatmapConfig.showTooltips}
                pointSize={heatmapConfig.pointSize}
              />
            )}
          </div>
          
          {/* Legend and Actions Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <HeatmapLegend
              perspective={heatmapConfig.perspective}
              style={{ height: 'fit-content' }}
            />
            
            {/* Quick Actions Panel */}
            <QuickActions
              layout="vertical"
              size="compact"
              actions={[
                {
                  label: 'View Results',
                  icon: '📊',
                  onClick: handleBackToResults
                },
                {
                  label: 'Dashboard',
                  icon: '🏠',
                  onClick: handleBackToDashboard
                },
                {
                  label: 'Gap Analysis',
                  icon: '🎯',
                  variant: 'accent',
                  onClick: () => goTo('/gap-analysis', 'Gap Analysis', { 
                    action: 'NAVIGATE_TO_GAP_ANALYSIS_FROM_HEATMAP', 
                    data: { 
                      heatmap_perspective: heatmapConfig.perspective,
                      total_chunks: allChunks?.length || 0 
                    } 
                  })
                }
              ]}
              style={{ padding: '8px' }}
            />
            
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
                      {selectedHeatmapPoint.data.bestQuestion ? (
                        <><strong>Best Match:</strong> {selectedHeatmapPoint.data.bestQuestion.similarity.toFixed(3)}</>
                      ) : (
                        <><strong>Status:</strong> Unretrieved (no matching questions)</>
                      )}
                    </>
                  ) : selectedHeatmapPoint.data.type === 'role' ? (
                    <>
                      <strong>Avg Similarity:</strong> {selectedHeatmapPoint.data.avgSimilarity.toFixed(3)}<br/>
                      <strong>Total Retrievals:</strong> {selectedHeatmapPoint.data.totalRetrievals}<br/>
                      <strong>Chunks Accessible:</strong> {selectedHeatmapPoint.data.chunkCount}
                    </>
                  ) : selectedHeatmapPoint.data.type === 'chunk-to-role' ? (
                    <>
                      <strong>Total Retrievals:</strong> {selectedHeatmapPoint.data.totalRetrievals}<br/>
                      <strong>Avg Similarity:</strong> {selectedHeatmapPoint.data.avgSimilarity.toFixed(3)}<br/>
                      {selectedHeatmapPoint.data.dominantRole ? (
                        <><strong>Dominant Role:</strong> {selectedHeatmapPoint.data.dominantRole.roleName}</>
                      ) : (
                        <><strong>Status:</strong> No role access patterns</>
                      )}
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
      )}
    </PageWrapper>
  );
};

export default InteractiveHeatmapVisualization;