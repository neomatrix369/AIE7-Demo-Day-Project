import React, { useState } from 'react';
import { RecommendationCard } from '../../types';

interface RecommendationCardsProps {
  recommendations: RecommendationCard[];
}

const RecommendationCards: React.FC<RecommendationCardsProps> = ({ recommendations }) => {
  const [implementedIds, setImplementedIds] = useState<Set<string>>(new Set());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#dc3545';
      case 'Medium': return '#e67e22';
      case 'Low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content_addition': return '📝';
      case 'content_improvement': return '✏️';
      case 'retrieval_optimization': return '🔧';
      default: return '💡';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'content_addition': return 'Content Addition';
      case 'content_improvement': return 'Content Improvement';
      case 'retrieval_optimization': return 'Retrieval Optimization';
      default: return 'General';
    }
  };

  const handleImplement = (id: string) => {
    setImplementedIds(prev => new Set(prev).add(id));
    // TODO: In a real implementation, this would trigger actual implementation workflow
    console.log(`📋 Recommendation ${id} marked as implemented`);
  };

  const handleDismiss = (id: string) => {
    // TODO: In a real implementation, this would remove the recommendation
    console.log(`❌ Recommendation ${id} dismissed`);
  };

  if (recommendations.length === 0) {
    return (
      <div className="no-recommendations" style={{
        textAlign: 'center',
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%)',
        borderRadius: '8px',
        border: '2px dashed #28a745'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🎯</div>
        <h3 style={{ color: '#28a745', marginBottom: '10px' }}>No Recommendations Available</h3>
        <p style={{ color: '#666', margin: 0 }}>
          Great news! Your corpus appears to be performing well. Run an experiment to generate specific recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="recommendation-cards">
      <div className="recommendations-header" style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#333', margin: 0, fontSize: '1.2rem' }}>
          💡 Actionable Recommendations (Gap Analysis) ({recommendations.length})
        </h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: '5px 0 0 0' }}>
          Ranked by impact-to-effort ratio • Derived from gap findings • Click to expand details
        </p>
      </div>

      <div className="cards-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {recommendations.map((rec) => {
          const isImplemented = implementedIds.has(rec.id);
          const priorityColor = getPriorityColor(rec.priorityLevel);

          return (
            <div key={rec.id} className={`recommendation-card ${isImplemented ? 'implemented' : ''}`} style={{
              background: isImplemented ? '#f8f9fa' : 'white',
              borderRadius: '12px',
              padding: '20px',
              border: `3px solid ${isImplemented ? '#28a745' : priorityColor}`,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              opacity: isImplemented ? 0.7 : 1,
              position: 'relative' as const
            }}>
              
              {isImplemented && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#28a745',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '15px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  ✓ Implemented
                </div>
              )}

              <div className="card-header" style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{getCategoryIcon(rec.category)}</span>
                  <div>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: priorityColor, 
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {rec.priorityLevel} Priority • {getCategoryLabel(rec.category)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                      Score: {rec.priorityScore} • Impact: {rec.impact} • Effort: {rec.implementationEffort}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-content">
                <h5 style={{ 
                  color: '#333', 
                  marginBottom: '10px',
                  fontSize: '1.1rem',
                  lineHeight: '1.3'
                }}>
                  🎯 {rec.gapDescription}
                </h5>
                
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#007bff' }}>💡 Suggested Action:</strong>
                  <p style={{ 
                    margin: '5px 0',
                    color: '#333',
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '6px',
                    borderLeft: '4px solid #007bff'
                  }}>
                    {rec.suggestedContent}
                  </p>
                </div>

                <div className="impact-metrics" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    background: '#e8f5e8',
                    padding: '10px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    border: '2px solid #28a745'
                  }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#28a745' }}>
                      +{rec.expectedImprovement.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Expected Score Boost</div>
                  </div>
                  
                  <div style={{
                    background: '#fff3cd',
                    padding: '10px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    border: '2px solid #ffc107'
                  }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#856404' }}>
                      {rec.affectedQueries.length}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Queries Affected</div>
                  </div>
                </div>

                <details style={{ marginBottom: '15px' }}>
                  <summary style={{ 
                    cursor: 'pointer', 
                    color: '#007bff',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                  }}>
                    📋 View Affected Queries ({rec.affectedQueries.length})
                  </summary>
                  <div style={{ 
                    background: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '6px',
                    marginTop: '10px',
                    maxHeight: '150px',
                    overflowY: 'auto' as const
                  }}>
                    {rec.affectedQueries.map((query, i) => (
                      <div key={i} style={{
                        fontSize: '0.85rem',
                        color: '#555',
                        padding: '5px 0',
                        borderBottom: i < rec.affectedQueries.length - 1 ? '1px solid #e0e0e0' : 'none'
                      }}>
                        &ldquo;{query.length > 80 ? query.substring(0, 80) + '...' : query}&rdquo;
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              {!isImplemented && (
                <div className="card-actions" style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '20px'
                }}>
                  <button 
                    onClick={() => handleImplement(rec.id)}
                    style={{
                      flex: 1,
                      background: priorityColor,
                      color: 'white',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    ✅ Mark as Implemented
                  </button>
                  
                  <button 
                    onClick={() => handleDismiss(rec.id)}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#545b62'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
                  >
                    ❌ Dismiss
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendationCards;