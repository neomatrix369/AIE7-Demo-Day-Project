import React from 'react';
import { GapAnalysis } from '../../types';
import QualityScoreLegend from '../QualityScoreLegend';
import BalloonTooltip from '../ui/BalloonTooltip';
import usePageNavigation from '../../hooks/usePageNavigation';
import { LABEL_RESULTS, LABEL_HEATMAP } from '../../utils/constants';

interface GapAnalysisOverviewProps {
  gapData: GapAnalysis;
}

const GapAnalysisOverview: React.FC<GapAnalysisOverviewProps> = ({ gapData }) => {
  const { gapSummary } = gapData;
  const { goTo } = usePageNavigation('GapAnalysis');

  const getSeverityColor = (percentage: number) => {
    if (percentage >= 30) return '#dc3545'; // Red for high gap percentage
    if (percentage >= 15) return '#e67e22'; // Orange for medium gap percentage
    return '#28a745'; // Green for low gap percentage
  };

  const getImprovementColor = (potential: number) => {
    if (potential >= 7.0) return '#28a745'; // Green for high improvement potential
    if (potential >= 5.0) return '#e67e22'; // Orange for medium improvement potential
    return '#dc3545'; // Red for low improvement potential
  };

  const formatImprovementPotential = (gapSummary: any) => {
    // Calculate average current score of poor questions (< 5.0)
    // Since we don't have direct access to per-question data here, 
    // we'll estimate based on the gap summary
    const avgCurrentScore = gapSummary.totalGaps > 0 ? gapSummary.avgGapScore : 0;
    const targetScore = gapSummary.improvementPotential;
    const improvement = targetScore - avgCurrentScore;
    const sign = improvement >= 0 ? '+' : '';
    
    return `${targetScore} (${sign}${improvement.toFixed(1)})`;
  };

  return (
    <div className="gap-analysis-overview">
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderLeft: `4px solid ${getSeverityColor(gapSummary.belowGoodPercentage)}`
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
          <div className="stat-value" style={{ 
            fontSize: '1.8rem', 
            fontWeight: 'bold', 
            color: getSeverityColor(gapSummary.belowGoodPercentage)
          }}>
            {gapSummary.belowGoodCount}
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Weak Questions</span>
            <BalloonTooltip
              content={
                'Questions with quality score < 7.0 (below GOOD threshold). These need content improvements to reach good performance.'
              }
              maxWidth={320}
              cursor="help"
            >
              <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
            </BalloonTooltip>
          </div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666' }}>
            Score &lt; 7.0 ({gapSummary.belowGoodPercentage}%)
          </div>
        </div>

        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
          borderLeft: '4px solid #dc3545'
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
          <div className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#dc3545' }}>
            {gapSummary.totalGaps}
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Poor Questions</span>
            <BalloonTooltip
              content={
                'Questions with quality score < 5.0 indicating poor retrieval results requiring immediate content improvements.'
              }
              maxWidth={320}
              cursor="help"
            >
              <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
            </BalloonTooltip>
          </div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666' }}>
            Score &lt; 5.0 ({gapSummary.gapPercentage}%)
          </div>
        </div>

        {/* Below GOOD threshold - aligns with Results page success rate complement */}
        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
          borderLeft: '4px solid #ffc107'
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
          <div className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#856404' }}>
            {gapSummary.totalQuestions || 0}
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Questions Analyzed</span>
            <BalloonTooltip
              content={
                'Total number of questions analyzed in this gap assessment.'
              }
              maxWidth={320}
              cursor="help"
            >
              <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
            </BalloonTooltip>
          </div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666' }}>
            Processing Volume
          </div>
        </div>


        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
          borderLeft: `4px solid ${getImprovementColor(gapSummary.improvementPotential)}`
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
          <div className="stat-value" style={{ 
            fontSize: '1.8rem', 
            fontWeight: 'bold', 
            color: getImprovementColor(gapSummary.improvementPotential)
          }}>
            {formatImprovementPotential(gapSummary)}
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Avg Target Score</span>
            <BalloonTooltip
              content={
                'Average target quality score achievable by implementing the recommended improvements.'
              }
              maxWidth={320}
              cursor="help"
            >
              <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
            </BalloonTooltip>
          </div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666' }}>
            After Improvements
          </div>
        </div>
      </div>

      {/* Shared legend for quality thresholds (consistent with Results/Heatmap) */}
      <div style={{ marginTop: '12px' }}>
        <QualityScoreLegend format="horizontal" showTitle={false} />
      </div>

      {/* Legend clarifying metrics */}
      <div style={{
        marginTop: '10px',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '6px',
        padding: '8px',
        color: '#495057',
        fontSize: '0.85rem'
      }}>
        <strong style={{ color: '#333' }}>Focus:</strong> This analysis highlights content gaps and improvement opportunities. 
        Poor questions indicate where your corpus needs additional or better content.
      </div>

      {/* Quick Actions - reuse consistent bar style from Results */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #dee2e6',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <strong style={{ fontSize: '0.9rem', color: '#333', marginRight: '6px' }}>🚀 Quick Actions:</strong>
        <button 
          className="button button-secondary"
          onClick={() => goTo('/results', LABEL_RESULTS, { action: 'NAVIGATE_TO_RESULTS_FROM_GAP', data: { gap_percentage: gapSummary.gapPercentage } })}
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
        >
          📊 View Results
        </button>
        <button 
          className="button"
          onClick={() => goTo('/heatmap', LABEL_HEATMAP, { action: 'NAVIGATE_TO_HEATMAP_FROM_GAP', data: { total_questions: gapSummary.totalQuestions } })}
          style={{ fontSize: '0.8rem', padding: '6px 12px', backgroundColor: '#007bff' }}
        >
          🗺️ Open Heatmap
        </button>
      </div>

      {gapSummary.totalGaps === 0 && (
        <div className="no-gaps-message" style={{
          textAlign: 'center',
          padding: '30px',
          background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
          borderRadius: '8px',
          marginTop: '20px',
          border: '2px solid #28a745'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎉</div>
          <h3 style={{ color: '#28a745', marginBottom: '10px' }}>No Significant Gaps Detected!</h3>
          <p style={{ color: '#666', margin: 0 }}>
            Your corpus appears to have good coverage for the tested queries. 
            Consider running experiments with additional question types to ensure comprehensive coverage.
          </p>
        </div>
      )}
    </div>
  );
};

export default GapAnalysisOverview;