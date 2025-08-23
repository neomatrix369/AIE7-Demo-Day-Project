import React, { useState, useMemo } from 'react';
import BalloonTooltip from '../ui/BalloonTooltip';
import { RecommendationCard } from '../../types';

interface RecommendationCardsProps {
  recommendations: RecommendationCard[];
}

const RecommendationCards: React.FC<RecommendationCardsProps> = ({ recommendations }) => {
  const [implementedIds, setImplementedIds] = useState<Set<string>>(new Set());
  // Cards view removed; defaulting to table-only view

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
      case 'role_improvement': return '🎯';
      case 'content_improvement': return '✏️';
      case 'quality_boost': return '📈';
      case 'content_addition': return '📝';
      case 'retrieval_optimization': return '🔧';
      default: return '💡';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'role_improvement': return 'Role Performance Issues';
      case 'content_improvement': return 'Content Quality Issues';
      case 'quality_boost': return 'Quality Score Improvements';
      case 'content_addition': return 'Missing Content';
      case 'retrieval_optimization': return 'Search Optimization';
      default: return 'General Improvements';
    }
  };

  // Extract a standard label and the rest of the text from the description
  const parseGapDescription = (description: string) => {
    const desc = description || '';
    const lower = desc.toLowerCase();
    if (lower.includes('critical query failure')) {
      const idx = desc.indexOf(':');
      const text = idx >= 0 ? desc.substring(idx + 1).trim() : desc;
      return { label: 'Critical Question', color: '#dc3545', text };
    }
    if (lower.includes('shows poor performance') || lower.includes('poor performance')) {
      return { label: 'Poor Role Performance', color: '#e67e22', text: desc };
    }
    if (lower.includes('role')) {
      return { label: 'Role Issue', color: '#007bff', text: desc };
    }
    return { label: 'Quality Issue', color: '#6c757d', text: desc };
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

  const formatExpectedImprovement = (rec: RecommendationCard) => {
    // Extract current score from gap description
    let currentScore = 0;
    
    if (rec.gapDescription.includes('Critical query failure')) {
      // Critical queries start at 0
      currentScore = 0;
    } else if (rec.gapDescription.includes('averaging')) {
      // Role-based recommendations - extract score from "averaging X.X/10"
      const match = rec.gapDescription.match(/averaging ([\d.]+)\/10/);
      currentScore = match ? parseFloat(match[1]) : 3.0;
    }
    
    const targetScore = rec.expectedImprovement;
    const improvement = targetScore - currentScore;
    const sign = improvement >= 0 ? '+' : '';
    
    return `${targetScore.toFixed(1)} (${sign}${improvement.toFixed(1)})`;
  };

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, { label: string; icon: string; items: RecommendationCard[] }>
      = {};
    const categories: Array<RecommendationCard['category']> = [
      'role_improvement',
      'content_improvement', 
      'quality_boost',
      'content_addition',
      'retrieval_optimization'
    ];
    categories.forEach((cat) => {
      groups[cat] = { label: getCategoryLabel(cat), icon: getCategoryIcon(cat), items: [] };
    });
    for (const rec of recommendations) {
      if (!groups[rec.category]) {
        groups[rec.category] = { label: getCategoryLabel(rec.category), icon: getCategoryIcon(rec.category), items: [] };
      }
      groups[rec.category].items.push(rec);
    }
    // Sort items within each category by priority score (high to low)
    Object.values(groups).forEach(group => {
      group.items.sort((a, b) => b.priorityScore - a.priorityScore);
    });
    
    // Sort categories by overall impact (highest priority recommendations first)
    const sortedGroups: Record<string, { label: string; icon: string; items: RecommendationCard[] }> = {};
    const sortedCategories = Object.entries(groups)
      .filter(([_, group]) => group.items.length > 0) // Only include categories with items
      .sort(([_, groupA], [__, groupB]) => {
        // Calculate average priority score for each group
        const avgScoreA = groupA.items.reduce((sum, item) => sum + item.priorityScore, 0) / groupA.items.length;
        const avgScoreB = groupB.items.reduce((sum, item) => sum + item.priorityScore, 0) / groupB.items.length;
        return avgScoreB - avgScoreA; // Sort high to low
      })
      .map(([category, group]) => category);
    
    // Rebuild groups in sorted order
    sortedCategories.forEach(category => {
      sortedGroups[category] = groups[category];
    });
    
    return sortedGroups;
  }, [recommendations]);

  const summarize = (items: RecommendationCard[]) => {
    const total = items.length;
    const avgExpectedImprovement = total > 0
      ? items.reduce((s, x) => s + x.expectedImprovement, 0) / total
      : 0;
    const counts = items.reduce((acc, x) => {
      acc[x.priorityLevel] = (acc[x.priorityLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, avgExpectedImprovement, counts };
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
          💡 Improvement Recommendations ({recommendations.length})
        </h4>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: '5px 0 0 0' }}>
          Prioritized suggestions based on poor-performing roles and questions • Click to expand details
        </p>
        {/* Cards view and toggle removed */}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Object.entries(groupedByCategory).map(([category, data]) => {
          if (!data.items.length) return null;
          const summary = summarize(data.items);
          return (
            <div key={category} className="category-block" style={{ background: 'white', border: '1px solid #e9ecef', borderRadius: '8px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderBottom: '1px solid #f1f3f5', background: '#f8f9fa', borderTopLeftRadius: '8px', borderTopRightRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#343a40', fontWeight: 600 }}>
                  <span style={{ fontSize: '1.1rem' }}>{data.icon}</span>
                  {data.label}
                  <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>({summary.total})</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', background: '#f1f8ff', border: '1px solid #d0e3ff', color: '#0d6efd', padding: '3px 8px', borderRadius: '12px' }}>
                    Avg Target: {summary.avgExpectedImprovement.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#fff5f5', border: '1px solid #ffc9c9', color: '#c92a2a', padding: '3px 8px', borderRadius: '12px' }}>
                    High: {summary.counts['High'] || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#fff4e6', border: '1px solid #ffd8a8', color: '#e8590c', padding: '3px 8px', borderRadius: '12px' }}>
                    Medium: {summary.counts['Medium'] || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: '#ebfbee', border: '1px solid #c3e6cb', color: '#2b8a3e', padding: '3px 8px', borderRadius: '12px' }}>
                    Low: {summary.counts['Low'] || 0}
                  </span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fcfcfd' }}>
                      <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f1f3f5', color: '#495057' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          Gap
                          <BalloonTooltip content={'Short description of the gap with a colored label indicating type/severity.'} maxWidth={320} cursor="help">
                            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                          </BalloonTooltip>
                        </span>
                      </th>
                      <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f1f3f5', color: '#495057' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          Priority
                          <BalloonTooltip content={'High/Medium/Low priority computed from impact vs effort.'} maxWidth={320} cursor="help">
                            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                          </BalloonTooltip>
                        </span>
                      </th>
                      <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #f1f3f5', color: '#495057' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          Target Score
                          <BalloonTooltip content={'Target quality score after improvement, with boost amount in brackets. Format: target (+boost)'} maxWidth={320} cursor="help">
                            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                          </BalloonTooltip>
                        </span>
                      </th>
                      <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f1f3f5', color: '#495057' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          Impact
                          <BalloonTooltip content={'Relative impact of the recommendation if implemented.'} maxWidth={320} cursor="help">
                            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                          </BalloonTooltip>
                        </span>
                      </th>
                      <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f1f3f5', color: '#495057' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          Effort
                          <BalloonTooltip content={'Estimated effort: Low / Medium / High.'} maxWidth={300} cursor="help">
                            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                          </BalloonTooltip>
                        </span>
                      </th>
                      <th style={{ textAlign: 'right', padding: '10px', borderBottom: '1px solid #f1f3f5', color: '#495057' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          Queries
                          <BalloonTooltip content={'Number of example queries associated with this gap.'} maxWidth={300} cursor="help">
                            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                          </BalloonTooltip>
                        </span>
                      </th>
                      <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #f1f3f5', color: '#495057' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          Actions
                          <BalloonTooltip content={'Mark implemented or dismiss to manage this recommendation.'} maxWidth={320} cursor="help">
                            <span style={{ fontSize: '1.1rem', color: '#007bff', opacity: 0.8 }}>ℹ️</span>
                          </BalloonTooltip>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((rec) => {
                      const priorityColor = getPriorityColor(rec.priorityLevel);
                      const isImplemented = implementedIds.has(rec.id);
                      const parsed = parseGapDescription(rec.gapDescription);
                      return (
                        <tr key={rec.id} style={{ background: 'white', borderBottom: '1px solid #f1f3f5' }}>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 600, color: '#2b2d31', marginBottom: '6px' }}>
                              <span style={{
                                fontSize: '0.75rem',
                                background: `${parsed.color}20`,
                                color: parsed.color,
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                marginRight: '6px'
                              }}>
                                {parsed.label}
                              </span>
                              <span>{parsed.text}</span>
                            </div>
                            <details>
                              <summary style={{ cursor: 'pointer', color: '#0d6efd', fontSize: '0.85rem' }}>View Suggested Action</summary>
                              <div style={{ marginTop: '6px', background: '#f9fbff', border: '1px solid #dbeafe', borderRadius: '6px', padding: '8px', color: '#2f3237' }}>
                                {rec.suggestedContent}
                              </div>
                            </details>
                          </td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            <span style={{ fontSize: '0.8rem', background: `${priorityColor}20`, color: priorityColor, padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                              {rec.priorityLevel}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', verticalAlign: 'top', color: '#2e7d32', fontWeight: 600 }}>
                            {formatExpectedImprovement(rec)}
                          </td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>{rec.impact}</td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>{rec.implementationEffort}</td>
                          <td style={{ padding: '10px', textAlign: 'right', verticalAlign: 'top' }}>{rec.affectedQueries.length}</td>
                          <td style={{ padding: '10px', verticalAlign: 'top' }}>
                            {!isImplemented ? (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button 
                                  onClick={() => setImplementedIds(prev => new Set(prev).add(rec.id))}
                                  style={{
                                    background: 'transparent',
                                    color: priorityColor,
                                    border: `2px solid ${priorityColor}`,
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✓ Implement
                                </button>
                                <button 
                                  onClick={() => handleDismiss(rec.id)}
                                  style={{
                                    background: 'transparent',
                                    color: '#6c757d',
                                    border: '2px solid #6c757d',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✕ Dismiss
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.85rem', background: '#eaf7ee', border: '1px solid #cdeccd', color: '#2c7a2c', padding: '4px 8px', borderRadius: '12px' }}>
                                ✓ Implemented
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      {/* Cards view removed */}
    </div>
  );
};

export default RecommendationCards;