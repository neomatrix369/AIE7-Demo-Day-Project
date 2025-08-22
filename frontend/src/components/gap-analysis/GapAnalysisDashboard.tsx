import React, { useCallback } from 'react';
import usePageData from '../../hooks/usePageData';
import { resultsApi } from '../../services/api';
import { GapAnalysis } from '../../types';
import GapAnalysisOverview from './GapAnalysisOverview';
import WeakCoverageAreas from './WeakCoverageAreas';
import RecommendationCards from './RecommendationCards';

const GapAnalysisDashboard: React.FC = () => {
  // Stable data loader function
  const dataLoader = useCallback(() => resultsApi.getGapAnalysis(), []);

  // Data loading with standard pattern
  const { data: gapData, loading, error, reload } = usePageData<GapAnalysis>(
    dataLoader,
    {
      component: 'GapAnalysis',
      loadAction: 'GAP_ANALYSIS_LOAD_START',
      successAction: 'GAP_ANALYSIS_LOAD_SUCCESS',
      errorAction: 'GAP_ANALYSIS_LOAD_ERROR',
      userErrorMessage: 'Failed to load gap analysis',
      successMessage: (data: GapAnalysis) => 
        `Gap analysis complete: ${data.gapSummary.totalGaps} gaps found, ${data.recommendations.length} recommendations`,
      successData: (data: GapAnalysis) => ({
        total_gaps: data.gapSummary.totalGaps,
        critical_gaps: data.gapSummary.criticalGaps,
        recommendations_count: data.recommendations.length,
        improvement_potential: data.gapSummary.improvementPotential
      })
    }
  );

  if (loading) {
    return (
      <div className="gap-analysis-loading" style={{
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '8px',
        border: '2px solid #e9ecef'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '15px' }}>🔍</div>
        <h3 style={{ color: '#007bff', marginBottom: '10px' }}>Analyzing Content Gaps...</h3>
        <p style={{ color: '#666', margin: 0 }}>
          Running rule-based gap detection on your experiment results
        </p>
        <div className="loading-animation" style={{
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '5px'
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#007bff',
              borderRadius: '50%',
              animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite alternate`
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gap-analysis-error" style={{
        textAlign: 'center',
        padding: '40px',
        background: '#fff5f5',
        borderRadius: '8px',
        border: '2px solid #dc3545'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⚠️</div>
        <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>Gap Analysis Failed</h3>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          {error}
        </p>
        <button 
          onClick={reload}
          className="button"
          style={{ fontSize: '14px', padding: '10px 20px' }}
        >
          🔄 Retry Analysis
        </button>
      </div>
    );
  }

  if (!gapData) return null;

  return (
    <div className="gap-analysis-dashboard">
      <style jsx>{`
        @keyframes pulse {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
        
        .gap-section {
          margin-bottom: 30px;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e9ecef;
        }
        
        .section-title {
          color: #333;
          margin: 0;
          font-size: 1.3rem;
        }
        
        .section-icon {
          font-size: 1.5rem;
        }
      `}</style>

      {/* Gap Analysis Overview */}
      <div className="gap-section">
        <div className="section-header">
          <span className="section-icon">📊</span>
          <h3 className="section-title">Gap Analysis Overview</h3>
        </div>
        <GapAnalysisOverview gapData={gapData} />
      </div>

      {/* Weak Coverage Areas */}
      {gapData.weakCoverageAreas.length > 0 && (
        <div className="gap-section">
          <div className="section-header">
            <span className="section-icon">🎯</span>
            <h3 className="section-title">Weak Coverage Areas ({gapData.weakCoverageAreas.length})</h3>
          </div>
          <WeakCoverageAreas weakAreas={gapData.weakCoverageAreas} />
        </div>
      )}

      {/* Uncovered Topics */}
      {gapData.uncoveredTopics.length > 0 && (
        <div className="gap-section">
          <div className="section-header">
            <span className="section-icon">🔍</span>
            <h3 className="section-title">Uncovered Topics ({gapData.uncoveredTopics.length})</h3>
          </div>
          <div className="uncovered-topics" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {gapData.uncoveredTopics.map((topic) => (
              <div key={topic} className="topic-tag" style={{
                background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
                color: '#856404',
                padding: '8px 15px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                border: '2px solid #ffc107',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span>🏷️</span>
                {topic}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Recommendations */}
      <div className="gap-section">
        <div className="section-header">
          <span className="section-icon">💡</span>
          <h3 className="section-title">Actionable Recommendations</h3>
        </div>
        <RecommendationCards recommendations={gapData.recommendations} />
      </div>

      {/* Quick Actions */}
      <div className="gap-section">
        <div className="section-header">
          <span className="section-icon">⚡</span>
          <h3 className="section-title">Quick Actions</h3>
        </div>
        <div className="quick-actions" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '15px'
        }}>
          <button 
            className="button"
            onClick={() => window.open('/results', '_blank')}
            style={{
              background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
              padding: '15px 20px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: 'center'
            }}
          >
            <span>📋</span>
            View Detailed Results
          </button>
          
          <button 
            className="button"
            onClick={() => window.open('/heatmap', '_blank')}
            style={{
              background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
              padding: '15px 20px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: 'center'
            }}
          >
            <span>🗺️</span>
            Visualize in Heatmap
          </button>
          
          <button 
            className="button"
            onClick={reload}
            style={{
              background: 'linear-gradient(135deg, #6f42c1 0%, #563d7c 100%)',
              padding: '15px 20px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              justifyContent: 'center'
            }}
          >
            <span>🔄</span>
            Refresh Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default GapAnalysisDashboard;