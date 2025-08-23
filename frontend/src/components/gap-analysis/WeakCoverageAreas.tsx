import React, { useState } from 'react';
import BalloonTooltip from '../ui/BalloonTooltip';
import { ContentGap } from '../../types';

interface WeakCoverageAreasProps {
  weakAreas: ContentGap[];
}

const WeakCoverageAreas: React.FC<WeakCoverageAreasProps> = ({ weakAreas }) => {
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const getRoleIcon = (roleName: string) => {
    // Match exact role names from Questions page API
    switch (roleName) {
      case 'Current Student': return '🎓';
      case 'Recent Graduate': return '👨‍🎓';  
      case 'Parent/Family': return '👨‍👩‍👧‍👦';
      case 'Active Borrower': return '💳';
      case 'Public Service Worker': return '🏛️';
      case 'Financial Difficulty': return '😰';
      case 'General User': return '👤';
      case 'Disabled Student': return '♿';
      // Fallback for topic-based roles (from gap analysis service)
      case 'payment': return '💰';
      case 'forgiveness': return '✋';
      case 'interest': return '📈';
      case 'eligibility': return '✅';
      case 'application': return '📝';
      case 'consolidation': return '🔗';
      case 'deferment': return '⏸️';
      case 'default': return '⚠️';
      case 'servicer': return '🏢';
      default: return '📊';
    }
  };

  const getQualityStatusFromScore = (avgScore: number) => {
    if (avgScore >= 7.0) return { status: 'GOOD', color: '#28a745' };
    if (avgScore >= 5.0) return { status: 'WEAK', color: '#ffc107' };
    return { status: 'POOR', color: '#dc3545' };
  };

  if (weakAreas.length === 0) {
    return (
      <div className="no-weak-areas" style={{
        textAlign: 'center',
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
        borderRadius: '8px',
        border: '2px dashed #28a745'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>✅</div>
        <h3 style={{ color: '#28a745', marginBottom: '10px' }}>No Weak Question Roles</h3>
        <p style={{ color: '#666', margin: 0 }}>
          All question role categories show good performance levels. Your corpus provides consistent coverage across different borrower types and topics.
        </p>
      </div>
    );
  }

  return (
    <div className="weak-coverage-areas">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3fr 1fr 1fr 0.8fr',
        gap: '8px',
        alignItems: 'center',
        background: '#f8f9fa',
        border: '2px solid #dee2e6',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '10px',
        fontWeight: 'bold',
        color: '#495057'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Question Role</span>
          <BalloonTooltip content={'Question role categories from your experiment - shows which borrower types or topics have poor performance.'} maxWidth={280} cursor="help">
            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
          </BalloonTooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Quality Score</span>
          <BalloonTooltip content={'Average quality score for this role (0–10) with status indicator - same as Results page.'} maxWidth={280} cursor="help">
            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
          </BalloonTooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Questions</span>
          <BalloonTooltip content={'Number of questions in this role showing poor performance.'} maxWidth={280} cursor="help">
            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
          </BalloonTooltip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Details</span>
          <BalloonTooltip content={'Expand to see sample questions and performance breakdown.'} maxWidth={280} cursor="help">
            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
          </BalloonTooltip>
        </div>
      </div>

      {weakAreas.map((area) => {
        const qualityStatus = getQualityStatusFromScore(area.avgScore);
        const isExpanded = expandedArea === area.topic;

        return (
          <React.Fragment key={area.topic}>
            <div
              className="coverage-area-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '3fr 1fr 1fr 0.8fr',
                gap: '8px',
                alignItems: 'center',
                background: 'white',
                border: `2px solid ${qualityStatus.color}20`,
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '8px'
              }}
            >
              {/* Role with icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  fontSize: '1.2rem',
                  background: `${qualityStatus.color}20`,
                  border: `1px solid ${qualityStatus.color}40`,
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 auto'
                }}>
                  {getRoleIcon(area.topic)}
                </div>
                <div style={{
                  fontWeight: 600,
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize'
                }} title={area.topic}>
                  {area.topic}
                </div>
              </div>

              {/* Quality score with status pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: qualityStatus.color }}>
                  {area.avgScore}
                </span>
                <span style={{
                  fontSize: '0.8rem',
                  background: qualityStatus.color + '20',
                  color: qualityStatus.color,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontWeight: 'bold'
                }}>
                  {qualityStatus.status}
                </span>
              </div>

              {/* Query count */}
              <div style={{ color: '#666', textAlign: 'center' }}>{area.queryCount}</div>

              {/* Expand/collapse */}
              <div>
                <button
                  onClick={() => setExpandedArea(isExpanded ? null : area.topic)}
                  className="button button-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                >
                  {isExpanded ? 'Hide' : 'View'}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div
                className="coverage-area-detail"
                style={{
                  background: '#f8f9fa',
                  border: `2px solid ${qualityStatus.color}30`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '-4px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div>
                    <h5 style={{ color: '#555', margin: '0 0 6px 0' }}>📋 Sample Questions in This Role</h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {area.affectedQueries.map((query, i) => (
                        <span key={i} style={{
                          background: 'white',
                          border: '1px solid #dee2e6',
                          padding: '6px 8px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          color: '#495057',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={query}>
                          {query.length > 80 ? query.substring(0, 80) + '…' : query}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    background: `${qualityStatus.color}10`,
                    borderLeft: `4px solid ${qualityStatus.color}`,
                    padding: '10px',
                    borderRadius: '6px'
                  }}>
                    <strong style={{ color: qualityStatus.color }}>
                      📊 Performance Summary: 
                    </strong>
                    <span style={{ color: '#333' }}>
                      This role has {area.queryCount} questions with an average quality score of {area.avgScore}/10. 
                      Status: {qualityStatus.status}. Review these questions for improvement opportunities.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WeakCoverageAreas;