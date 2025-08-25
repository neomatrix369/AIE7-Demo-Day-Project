import React, { useCallback } from 'react';
import BalloonTooltip from '../ui/BalloonTooltip';
import RuleBasedBadge from '../ui/RuleBasedBadge';
import { SHOW_RULE_BASED_BADGE } from '../../utils/constants';
import usePageData from '../../hooks/usePageData';
import { resultsApi } from '../../services/api';
import { GapAnalysis } from '../../types';
import GapAnalysisOverview from './GapAnalysisOverview';
import DevelopingCoverageAreas from './DevelopingCoverageAreas';
import RecommendationCards from './RecommendationCards';

const GapAnalysisDashboard: React.FC = () => {
  // Stable data loader function for gap analysis
  const gapDataLoader = useCallback(() => resultsApi.getGapAnalysis(), []);
  
  // Stable data loader function for analysis results (to get all questions)
  const analysisDataLoader = useCallback(() => resultsApi.getAnalysis(), []);

  // Data loading with standard pattern
  const { data: gapData, loading: gapLoading, error: gapError, reload: gapReload } = usePageData<GapAnalysis>(
    gapDataLoader,
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

  // Load analysis results to get all questions for export
  const { data: analysisData, loading: analysisLoading } = usePageData(
    analysisDataLoader,
    {
      component: 'AnalysisResults',
      loadAction: 'ANALYSIS_RESULTS_LOAD_START',
      successAction: 'ANALYSIS_RESULTS_LOAD_SUCCESS',
      errorAction: 'ANALYSIS_RESULTS_LOAD_ERROR',
      userErrorMessage: 'Failed to load analysis results'
    }
  );

  const loading = gapLoading || analysisLoading;
  const error = gapError;
  const reload = gapReload;

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

  // Check if no experiment data is available
  if (gapData.gapSummary.totalQuestions === 0) {
    return (
      <div className="gap-analysis-no-data" style={{
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '8px',
        border: '2px dashed #dee2e6'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📊</div>
        <h3 style={{ color: '#666', marginBottom: '15px' }}>No Experiment Data Available</h3>
        <p style={{ color: '#888', marginBottom: '20px', fontSize: '16px' }}>
          Load an experiment first to generate gap analysis insights and recommendations.
        </p>
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
          Gap analysis requires experiment results to identify content gaps and generate actionable recommendations.
        </p>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '6px', 
          border: '1px solid #dee2e6',
          textAlign: 'left',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <h4 style={{ color: '#495057', margin: '0 0 10px 0', fontSize: '14px' }}>💡 How to get started:</h4>
          <ol style={{ color: '#6c757d', fontSize: '13px', margin: '0', paddingLeft: '20px' }}>
            <li>Go to the <strong>Experiments</strong> page</li>
            <li>Load an existing experiment or run a new one</li>
            <li>Return to this page to view gap analysis</li>
          </ol>
        </div>
      </div>
    );
  }

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
        <div className="section-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="section-icon">📊</span>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              Gap Analysis Overview
              <BalloonTooltip
                content={'Summary of gap metrics derived from low-performing queries and recommendations.'}
                maxWidth={340}
                cursor="help"
              >
                <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
              </BalloonTooltip>
            </h3>
          </div>
          {SHOW_RULE_BASED_BADGE && (
            <RuleBasedBadge text="Rule-Based Analysis (non-ML)" />
          )}
        </div>
        <GapAnalysisOverview gapData={gapData} questions={analysisData?.per_question || []} />
      </div>

      {/* Developing Coverage Areas */}
      {gapData.developingCoverageAreas.length > 0 && (
        <div className="gap-section">
          <div className="section-header">
            <span className="section-icon">🎯</span>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Developing Coverage Areas ({gapData.developingCoverageAreas.length})
              <BalloonTooltip
                content={'Topic clusters with low average quality score and multiple affected queries.'}
                maxWidth={340}
                cursor="help"
              >
                <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
              </BalloonTooltip>
            </h3>
          </div>
          <DevelopingCoverageAreas developingAreas={gapData.developingCoverageAreas} />
        </div>
      )}

      {/* Uncovered Topics */}
      {gapData.uncoveredTopics.length > 0 && (
        <div className="gap-section">
          <div className="section-header">
            <span className="section-icon">🔍</span>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Uncovered Topics ({gapData.uncoveredTopics.length})
              <BalloonTooltip
                content={'Detected topics with consistently poor performance; likely content coverage gaps.'}
                maxWidth={340}
                cursor="help"
              >
                <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
              </BalloonTooltip>
            </h3>
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
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Actionable Recommendations
            <BalloonTooltip
              content={'Prioritized actions generated from gaps; sorted by impact-to-effort.'}
              maxWidth={340}
              cursor="help"
            >
              <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
            </BalloonTooltip>
          </h3>
        </div>
        <RecommendationCards recommendations={gapData.recommendations} />
      </div>

    </div>
  );
};

export default GapAnalysisDashboard;