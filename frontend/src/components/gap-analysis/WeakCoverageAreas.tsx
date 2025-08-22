import React, { useState } from 'react';
import { ContentGap } from '../../types';

interface WeakCoverageAreasProps {
  weakAreas: ContentGap[];
}

const WeakCoverageAreas: React.FC<WeakCoverageAreasProps> = ({ weakAreas }) => {
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  const getGapTypeIcon = (gapType: string) => {
    switch (gapType) {
      case 'coverage': return '📋';
      case 'quality': return '✏️';
      case 'retrieval': return '🔍';
      default: return '❓';
    }
  };

  const getGapTypeColor = (gapType: string) => {
    switch (gapType) {
      case 'coverage': return '#dc3545';
      case 'quality': return '#e67e22';
      case 'retrieval': return '#007bff';
      default: return '#6c757d';
    }
  };

  const getSeverityLevel = (avgScore: number) => {
    if (avgScore < 3.0) return { level: 'Critical', color: '#dc3545' };
    if (avgScore < 5.0) return { level: 'High', color: '#e67e22' };
    return { level: 'Medium', color: '#ffc107' };
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
        <h3 style={{ color: '#28a745', marginBottom: '10px' }}>No Weak Coverage Areas</h3>
        <p style={{ color: '#666', margin: 0 }}>
          All topic areas show good performance levels. Your corpus provides consistent coverage across different topics.
        </p>
      </div>
    );
  }

  return (
    <div className="weak-coverage-areas">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 0.6fr',
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
        <div>Topic</div>
        <div>Gap Type</div>
        <div>Severity</div>
        <div>Avg Quality Score</div>
        <div>Affected Queries</div>
        <div>Details</div>
      </div>

      {weakAreas.map((area) => {
        const severity = getSeverityLevel(area.avgScore);
        const isExpanded = expandedArea === area.topic;

        return (
          <React.Fragment key={area.topic}>
            <div
              className="coverage-area-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 0.6fr',
                gap: '8px',
                alignItems: 'center',
                background: 'white',
                border: `2px solid ${getGapTypeColor(area.gapType)}20`,
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '8px'
              }}
            >
              {/* Topic with icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  fontSize: '1.2rem',
                  background: `${getGapTypeColor(area.gapType)}20`,
                  border: `1px solid ${getGapTypeColor(area.gapType)}40`,
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 auto'
                }}>
                  {getGapTypeIcon(area.gapType)}
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

              {/* Type badge */}
              <div>
                <span style={{
                  fontSize: '0.8rem',
                  background: `${getGapTypeColor(area.gapType)}20`,
                  color: getGapTypeColor(area.gapType),
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  textTransform: 'capitalize'
                }}>
                  {area.gapType}
                </span>
              </div>

              {/* Severity pill */}
              <div>
                <span style={{
                  fontSize: '0.8rem',
                  background: severity.color + '20',
                  color: severity.color,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontWeight: 'bold'
                }}>
                  {severity.level}
                </span>
              </div>

              {/* Avg score */}
              <div style={{ fontWeight: 'bold', color: getGapTypeColor(area.gapType) }}>
                {area.avgScore}
              </div>

              {/* Query count */}
              <div style={{ color: '#666' }}>{area.queryCount}</div>

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
                  border: `2px solid ${getGapTypeColor(area.gapType)}30`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '-4px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div>
                    <h5 style={{ color: '#555', margin: '0 0 6px 0' }}>📝 Affected Queries</h5>
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
                    background: `${getGapTypeColor(area.gapType)}10`,
                    borderLeft: `4px solid ${getGapTypeColor(area.gapType)}`,
                    padding: '10px',
                    borderRadius: '6px'
                  }}>
                    <strong style={{ color: getGapTypeColor(area.gapType) }}>
                      {area.gapType === 'coverage' && '📋 Coverage Gap: '}
                      {area.gapType === 'quality' && '✏️ Quality Gap: '}
                      {area.gapType === 'retrieval' && '🔍 Retrieval Gap: '}
                    </strong>
                    <span style={{ color: '#333' }}>
                      {area.gapType === 'coverage' && 'Your corpus lacks sufficient content to answer these queries effectively.'}
                      {area.gapType === 'quality' && 'Existing content needs improvement in depth, clarity, or relevance.'}
                      {area.gapType === 'retrieval' && 'Content exists but retrieval optimization is needed for better matching.'}
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