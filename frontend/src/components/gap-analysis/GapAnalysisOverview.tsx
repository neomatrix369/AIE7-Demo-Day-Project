import React from 'react';
import { GapAnalysis, QuestionResult } from '../../types';
import QualityScoreLegend from '../QualityScoreLegend';
import BalloonTooltip from '../ui/BalloonTooltip';
import { exportQuestionsByStatus } from '../../utils/csvExport';

interface GapAnalysisOverviewProps {
  gapData: GapAnalysis;
  questions: QuestionResult[];
}

const GapAnalysisOverview: React.FC<GapAnalysisOverviewProps> = ({ gapData, questions }) => {
  const { gapSummary } = gapData;

  const getSeverityColor = (percentage: number) => {
    if (percentage >= 30) return '#dc3545'; // Red for high gap percentage
    if (percentage >= 15) return '#e67e22'; // Orange for medium gap percentage
    return '#28a745'; // Green for low gap percentage
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
          background: 'linear-gradient(135deg, #fef3e2 0%, #f9e4c8 100%)',
          borderLeft: '4px solid #e67e22'
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
          <div className="stat-value" style={{ 
            fontSize: '1.8rem', 
            fontWeight: 'bold', 
            color: '#e67e22'
          }}>
            {gapSummary.weakQuestionsCount || gapSummary.weakCount || 0}
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Weak Questions</span>
            <BalloonTooltip
              content={
                'Questions with quality score 5.0-6.9 (below GOOD threshold but above POOR). These need content improvements to reach good performance.'
              }
              maxWidth={320}
              cursor="help"
            >
              <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
            </BalloonTooltip>
          </div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
            Score 5.0-6.9 ({gapSummary.weakQuestionsCount || gapSummary.weakCount || 0 > 0 ? Math.round(((gapSummary.weakQuestionsCount || gapSummary.weakCount || 0) / gapSummary.totalQuestions) * 100) : 0}%)
          </div>
          <BalloonTooltip
            content={`Download ${gapSummary.weakQuestionsCount || gapSummary.weakCount || 0} weak questions (score 5.0-6.9) as CSV file`}
            maxWidth={300}
            cursor="help"
          >
            <button
              onClick={() => exportQuestionsByStatus(questions, 'weak')}
              disabled={(gapSummary.weakQuestionsCount || gapSummary.weakCount || 0) === 0}
              className="button button-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: (gapSummary.weakQuestionsCount || gapSummary.weakCount || 0) === 0 ? 0.5 : 1,
                cursor: (gapSummary.weakQuestionsCount || gapSummary.weakCount || 0) === 0 ? 'not-allowed' : 'pointer',
                backgroundColor: '#e67e22',
                color: 'white',
                border: '1px solid #e67e22',
                borderRadius: '4px',
                margin: '0 auto'
              }}
            >
              📥 Download CSV
            </button>
          </BalloonTooltip>
        </div>

        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
          borderLeft: '4px solid #dc3545'
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
          <div className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#dc3545' }}>
            {gapSummary.poorQuestionsCount || gapSummary.poorCount || 0}
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
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
            Score &lt; 5.0 ({gapSummary.poorQuestionsCount || gapSummary.poorCount || 0 > 0 ? Math.round(((gapSummary.poorQuestionsCount || gapSummary.poorCount || 0) / gapSummary.totalQuestions) * 100) : 0}%)
          </div>
          <BalloonTooltip
            content={`Download ${gapSummary.poorQuestionsCount || gapSummary.poorCount || 0} poor questions (score <5.0) as CSV file`}
            maxWidth={300}
            cursor="help"
          >
            <button
              onClick={() => exportQuestionsByStatus(questions, 'poor')}
              disabled={(gapSummary.poorQuestionsCount || gapSummary.poorCount || 0) === 0}
              className="button button-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: (gapSummary.poorQuestionsCount || gapSummary.poorCount || 0) === 0 ? 0.5 : 1,
                cursor: (gapSummary.poorQuestionsCount || gapSummary.poorCount || 0) === 0 ? 'not-allowed' : 'pointer',
                backgroundColor: '#dc3545',
                color: 'white',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                margin: '0 auto'
              }}
            >
              📥 Download CSV
            </button>
          </BalloonTooltip>
        </div>

        {/* Questions Analyzed - neutral blue theme to complement quality score cards */}
        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #f0f8ff 0%, #e1f0fe 100%)',
          borderLeft: '4px solid #007bff'
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
          <div className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#007bff' }}>
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
          background: 'linear-gradient(135deg, #f8fffe 0%, #e8f7f5 100%)',
          borderLeft: '4px solid #17a2b8'
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
          <div className="stat-value" style={{ 
            fontSize: '1.8rem', 
            fontWeight: 'bold', 
            color: '#17a2b8'
          }}>
            {formatImprovementPotential(gapSummary)}
          </div>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Avg Target Score</span>
            <BalloonTooltip
              content={
                'Average target score after improvements, with boost amount in brackets. Format: target (+boost)'
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