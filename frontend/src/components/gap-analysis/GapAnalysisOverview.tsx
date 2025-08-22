import React from 'react';
import { GapAnalysis } from '../../types';

interface GapAnalysisOverviewProps {
  gapData: GapAnalysis;
}

const GapAnalysisOverview: React.FC<GapAnalysisOverviewProps> = ({ gapData }) => {
  const { gapSummary } = gapData;

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

  return (
    <div className="gap-analysis-overview">
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderLeft: `4px solid ${getSeverityColor(gapSummary.gapPercentage)}`
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
          <div className="stat-value" style={{ 
            fontSize: '1.8rem', 
            fontWeight: 'bold', 
            color: getSeverityColor(gapSummary.gapPercentage)
          }}>
            {gapSummary.totalGaps}
          </div>
          <div className="stat-label">Total Gaps (Gap Analysis)</div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666' }}>
            {gapSummary.gapPercentage}% of queries
          </div>
        </div>

        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
          borderLeft: '4px solid #dc3545'
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
          <div className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#dc3545' }}>
            {gapSummary.criticalGaps}
          </div>
          <div className="stat-label">Critical Gaps (Gap Analysis)</div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666' }}>
            Score &lt; 3.0
          </div>
        </div>

        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #f0f8ff 0%, #cce7ff 100%)',
          borderLeft: '4px solid #007bff'
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
          <div className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#007bff' }}>
            {gapSummary.avgGapScore}
          </div>
          <div className="stat-label">Avg Gap Quality Score (Gap Analysis)</div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666' }}>
            Out of 10.0
          </div>
        </div>

        <div className="stat-item" style={{ 
          background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
          borderLeft: `4px solid ${getImprovementColor(gapSummary.improvementPotential)}`
        }}>
          <div className="stat-icon" style={{ fontSize: '2rem', marginBottom: '8px' }}>📈</div>
          <div className="stat-value" style={{ 
            fontSize: '1.8rem', 
            fontWeight: 'bold', 
            color: getImprovementColor(gapSummary.improvementPotential)
          }}>
            {gapSummary.improvementPotential}
          </div>
          <div className="stat-label">Improvement Potential (Gap Analysis)</div>
          <div className="stat-sublabel" style={{ fontSize: '0.8rem', color: '#666' }}>
            Expected score increase
          </div>
        </div>
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
        <strong style={{ color: '#333' }}>Legend:</strong> Metrics labeled “(Gap Analysis)” are computed from low-performing queries only. 
        “Avg Quality Score” here refers to the average of queries identified as gaps, not the overall results average.
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