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

const InteractiveHeatmapVisualization: React.FC = () => {
  const [results, setResults] = useState<AnalysisResultsType | null>(null);
  const [allChunks, setAllChunks] = useState<Array<{chunk_id: string; doc_id: string; title: string; content: string}> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>({
    perspective: 'questions-to-chunks',
    qualityFilter: 'all',
    showTooltips: true,
    pointSize: 'medium',
    colorIntensity: 1.0
  });
  const [selectedHeatmapPoint, setSelectedHeatmapPoint] = useState<HeatmapPoint | null>(null);
  const [drillDownData, setDrillDownData] = useState<string>('');
  const router = useRouter();

  // Load all chunks once (static data used for chunks-to-questions perspective)
  useEffect(() => {
    const fetchAllChunks = async () => {
      try {
        logInfo('Loading all chunks for heatmap visualization', {
          component: 'Heatmap',
          action: 'CHUNKS_LOAD_START'
        });
        
        const chunksData = await corpusApi.getAllChunks();
        setAllChunks(chunksData.chunks);
        
        logSuccess(`All chunks loaded: ${chunksData.total_count} chunks`, {
          component: 'Heatmap',
          action: 'CHUNKS_LOAD_SUCCESS',
          data: {
            total_chunks: chunksData.total_count
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
  }, []); // Empty dependency array - only fetch once

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        logInfo('Loading analysis results for heatmap visualization', {
          component: 'Heatmap',
          action: 'RESULTS_LOAD_START'
        });
        
        const data = await resultsApi.getAnalysis();
        setResults(data);
        
        logSuccess(`Heatmap data loaded: ${data.overall.total_questions} questions`, {
          component: 'Heatmap', 
          action: 'RESULTS_LOAD_SUCCESS',
          data: {
            total_questions: data.overall.total_questions,
            avg_quality_score: data.overall.avg_quality_score
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
  }, []);

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
    } else {
      setDrillDownData(`Chunk: ${point.data.chunkId} from ${point.data.docId}`);
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
              {results.overall.total_questions}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Total Questions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              {totalChunks}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Unique Chunks</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6f42c1' }}>
              {results.overall.avg_quality_score ? results.overall.avg_quality_score.toFixed(1) : 0}
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Average Quality Score</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e67e22' }}>
              {Math.round(results.overall.success_rate * 100)}%
            </div>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>Success Rate</div>
          </div>
        </div>

        {/* Heatmap Controls */}
        <HeatmapControls
          config={heatmapConfig}
          onConfigChange={handleHeatmapConfigChange}
          totalQuestions={results.overall.total_questions}
          totalChunks={totalChunks}
        />

        {/* Main Visualization Area */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 320px', 
          gap: '20px', 
          marginBottom: '20px',
          minHeight: '500px'
        }}>
          
          {/* Heatmap Visualization */}
          <div className="card" style={{ padding: '20px' }}>
            <ScatterHeatmap
              questionResults={results.per_question}
              perspective={heatmapConfig.perspective}
              qualityFilter={heatmapConfig.qualityFilter}
              onPointClick={heatmapConfig.showTooltips ? handleHeatmapPointClick : undefined}
              width={900}
              height={500}
              allChunks={allChunks || undefined}
            />
          </div>
          
          {/* Legend and Drill-down Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <HeatmapLegend
              perspective={heatmapConfig.perspective}
              style={{ height: 'fit-content' }}
            />
            
            {/* Drill-down Information Panel */}
            {selectedHeatmapPoint && (
              <div className="card" style={{ padding: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '0.9rem' }}>
                  🎯 Selected Point Details
                </h4>
                <div style={{
                  backgroundColor: '#e8f4fd',
                  border: '1px solid #bee5eb',
                  borderRadius: '4px',
                  padding: '10px',
                  fontSize: '0.85rem',
                  lineHeight: '1.4'
                }}>
                  <strong>Type:</strong> {selectedHeatmapPoint.data.type === 'question' ? 'Question' : 'Document Chunk'}<br/>
                  <strong>Details:</strong> {drillDownData}<br/>
                  {selectedHeatmapPoint.data.type === 'question' ? (
                    <>
                      <strong>Source:</strong> {selectedHeatmapPoint.data.source.toUpperCase()}<br/>
                      <strong>Quality Score:</strong> {selectedHeatmapPoint.data.qualityScore.toFixed(1)}<br/>
                      <strong>Chunks Retrieved:</strong> {selectedHeatmapPoint.data.chunkFrequency}
                    </>
                  ) : (
                    <>
                      <strong>Retrieval Frequency:</strong> {selectedHeatmapPoint.data.retrievalFrequency} questions<br/>
                      <strong>Avg Similarity:</strong> {selectedHeatmapPoint.data.avgSimilarity.toFixed(3)}<br/>
                      <strong>Best Match:</strong> {selectedHeatmapPoint.data.bestQuestion.similarity.toFixed(3)}
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedHeatmapPoint(null);
                    setDrillDownData('');
                  }}
                  style={{
                    marginTop: '10px',
                    padding: '6px 12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    width: '100%'
                  }}
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="card" style={{ padding: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '0.9rem' }}>
                🔗 Quick Actions
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className="button button-secondary"
                  onClick={handleBackToResults}
                  style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                >
                  📊 View Analysis Results
                </button>
                <button 
                  className="button button-secondary"
                  onClick={handleBackToDashboard}
                  style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                >
                  🏠 Back to Dashboard
                </button>
              </div>
            </div>
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