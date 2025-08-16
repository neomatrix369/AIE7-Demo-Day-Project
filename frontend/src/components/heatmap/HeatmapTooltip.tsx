import React from 'react';
import { HeatmapPoint, QuestionHeatmapData, ChunkHeatmapData, RoleHeatmapData, ChunkToRoleHeatmapData } from '../../utils/heatmapData';
import { HeatmapPerspective, TooltipPosition } from '../../types';

interface HeatmapTooltipProps {
  point: HeatmapPoint;
  position: TooltipPosition;
  perspective: HeatmapPerspective;
  onDismiss?: () => void;
}

const HeatmapTooltip: React.FC<HeatmapTooltipProps> = React.memo(({
  point,
  position,
  perspective,
  onDismiss
}) => {
  if (!position.visible || !point) return null;

  const getStatusColor = (score: number) => {
    if (score >= 7.0) return '#28a745';
    if (score >= 5.0) return '#e67e22';
    return '#dc3545';
  };

  const getStatusText = (score: number) => {
    if (score >= 7.0) return 'GOOD';
    if (score >= 5.0) return 'WEAK';
    return 'POOR';
  };

  const renderQuestionTooltip = (data: QuestionHeatmapData) => (
    <div>
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '0.9rem',
        marginBottom: '8px',
        color: '#333',
        borderBottom: '1px solid #eee',
        paddingBottom: '5px'
      }}>
        📝 Question Details
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Source:</strong> 
        <span style={{ 
          backgroundColor: data.source === 'llm' ? '#007bff' : '#28a745',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '3px',
          fontSize: '0.7rem',
          marginLeft: '6px',
          textTransform: 'uppercase'
        }}>
          {data.source}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Question:</strong>
        <div style={{ 
          fontSize: '0.85rem',
          padding: '4px 8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '3px',
          marginTop: '3px',
          maxWidth: '300px',
          lineHeight: '1.3'
        }}>
          {data.questionText.length > 150 
            ? `${data.questionText.substring(0, 150)}...` 
            : data.questionText
          }
        </div>
      </div>

      <div style={{ marginBottom: '6px' }}>
        <strong>Quality Score:</strong>
        <span style={{ 
          color: getStatusColor(data.qualityScore || 0),
          fontWeight: 'bold',
          marginLeft: '8px'
        }}>
          {(data.qualityScore || 0).toFixed(1)} ({getStatusText(data.qualityScore || 0)})
        </span>
      </div>

      <div style={{ marginBottom: '6px' }}>
        <strong>Retrieved Chunks:</strong> {data.chunkFrequency || 0}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Avg Similarity:</strong> {(data.avgSimilarity || 0).toFixed(3)}
      </div>

      {data.retrievedChunks.length > 0 && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '6px' }}>
          <strong style={{ fontSize: '0.8rem' }}>Top Retrieved Chunks:</strong>
          <div style={{ marginTop: '4px' }}>
            {data.retrievedChunks.slice(0, 3).map((chunk, idx) => (
              <div key={idx} style={{ 
                fontSize: '0.75rem',
                padding: '2px 0',
                color: '#666',
                borderLeft: '2px solid #007bff',
                paddingLeft: '6px',
                marginBottom: '2px'
              }}>
                <div><strong>Chunk:</strong> {chunk.chunkId.substring(0, 8)}...</div>
                <div><strong>Similarity:</strong> {(chunk.similarity || 0).toFixed(3)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderChunkTooltip = (data: ChunkHeatmapData) => {
    if (data.isOrphaned) {
      // Minimal tooltip for orphaned chunks
      return (
        <div>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '0.9rem',
            marginBottom: '8px',
            color: '#6c757d',
            borderBottom: '1px solid #eee',
            paddingBottom: '5px'
          }}>
            🔍 Orphaned Chunk
          </div>
          
          <div style={{ marginBottom: '6px' }}>
            <strong>Chunk ID:</strong>
            <div style={{ 
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#666',
              marginTop: '2px'
            }}>
              {data.chunkId}
            </div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <strong>Document:</strong> {data.docId}
          </div>

          <div style={{ marginBottom: '8px' }}>
            <strong>Document Title:</strong>
            <div style={{ 
              fontSize: '0.85rem',
              padding: '4px 8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '3px',
              marginTop: '3px',
              maxWidth: '300px',
              lineHeight: '1.3'
            }}>
              {data.title.length > 100 
                ? `${data.title.substring(0, 100)}...` 
                : data.title
              }
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '0.8rem',
            color: '#6c757d',
            fontStyle: 'italic'
          }}>
            ⚠️ This chunk has never been retrieved by any question in the current experiment
          </div>
        </div>
      );
    }

    // Regular tooltip for retrieved chunks
    return (
      <div>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '0.9rem',
          marginBottom: '8px',
          color: '#333',
          borderBottom: '1px solid #eee',
          paddingBottom: '5px'
        }}>
          📄 Chunk Details
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <strong>Chunk ID:</strong>
          <div style={{ 
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            color: '#666',
            marginTop: '2px'
          }}>
            {data.chunkId}
          </div>
        </div>

        <div style={{ marginBottom: '6px' }}>
          <strong>Document:</strong> {data.docId}
        </div>

        <div style={{ marginBottom: '8px' }}>
          <strong>Document Title:</strong>
          <div style={{ 
            fontSize: '0.85rem',
            padding: '4px 8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '3px',
            marginTop: '3px',
            maxWidth: '300px',
            lineHeight: '1.3'
          }}>
            {data.title.length > 100 
              ? `${data.title.substring(0, 100)}...` 
              : data.title
            }
          </div>
        </div>

        <div style={{ marginBottom: '6px' }}>
          <strong>Retrieval Frequency:</strong> {data.retrievalFrequency || 0} questions
        </div>

        <div style={{ marginBottom: '8px' }}>
          <strong>Avg Similarity:</strong> 
          <span style={{ 
            color: getStatusColor(data.avgSimilarity || 0),
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            {(data.avgSimilarity || 0).toFixed(3)} ({getStatusText(data.avgSimilarity || 0)})
          </span>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <strong>Best Question Match:</strong>
          <div style={{ 
            fontSize: '0.8rem',
            padding: '4px 8px',
            backgroundColor: '#e8f5e8',
            borderRadius: '3px',
            marginTop: '3px',
            maxWidth: '300px',
            lineHeight: '1.3'
          }}>
            {data.bestQuestion.questionText.length > 120 
              ? `${data.bestQuestion.questionText.substring(0, 120)}...` 
              : data.bestQuestion.questionText
            }
            <div style={{ marginTop: '2px', fontSize: '0.75rem', color: '#666' }}>
              Similarity: {(data.bestQuestion.similarity || 0).toFixed(3)}
              {data.bestQuestion.roleName && (
                <span style={{ marginLeft: '8px' }}>
                  Role: <span style={{ 
                    backgroundColor: '#f8f9fa', 
                    color: '#495057',
                    padding: '1px 4px', 
                    borderRadius: '2px', 
                    fontSize: '0.7rem'
                  }}>
                    {data.bestQuestion.roleName}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {data.retrievingQuestions.length > 1 && (
          <div style={{ borderTop: '1px solid #eee', paddingTop: '6px' }}>
            <strong style={{ fontSize: '0.8rem' }}>
              Other Retrieving Questions ({data.retrievingQuestions.length - 1}):
            </strong>
            <div style={{ marginTop: '4px' }}>
              {data.retrievingQuestions.slice(1, 3).map((question, idx) => (
                <div key={idx} style={{ 
                  fontSize: '0.75rem',
                  padding: '2px 0',
                  color: '#666',
                  borderLeft: '2px solid #28a745',
                  paddingLeft: '6px',
                  marginBottom: '2px'
                }}>
                  <div>{question.questionText.substring(0, 80)}...</div>
                  <div><strong>Similarity:</strong> {(question.similarity || 0).toFixed(3)}</div>
                  {question.roleName && (
                    <div><strong>Role:</strong> 
                      <span style={{ 
                        backgroundColor: '#f8f9fa', 
                        color: '#495057',
                        padding: '1px 4px', 
                        borderRadius: '2px', 
                        fontSize: '0.7rem',
                        marginLeft: '4px'
                      }}>
                        {question.roleName}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRoleTooltip = (data: RoleHeatmapData) => (
    <div>
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '0.9rem',
        marginBottom: '8px',
        color: '#333',
        borderBottom: '1px solid #eee',
        paddingBottom: '5px'
      }}>
        👥 {data.roleName}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Avg Quality Score:</span>
          <span style={{ 
            color: getStatusColor(data.avgQualityScore || 0),
            fontWeight: 'bold',
            fontSize: '0.8rem'
          }}>
            {(data.avgQualityScore || 0).toFixed(1)} ({getStatusText(data.avgQualityScore || 0)})
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.8rem' }}>Questions:</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{data.questionCount}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.8rem' }}>Unique Chunks:</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{data.totalChunksRetrieved}</span>
        </div>
      </div>

      {data.topChunks.length > 0 && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '6px' }}>
          <strong style={{ fontSize: '0.8rem' }}>Top Retrieved Chunks:</strong>
          <div style={{ marginTop: '4px' }}>
            {data.topChunks.slice(0, 3).map((chunk, idx) => (
              <div key={idx} style={{ 
                fontSize: '0.75rem',
                padding: '3px 0',
                color: '#666',
                borderLeft: '2px solid #007bff',
                paddingLeft: '6px',
                marginBottom: '3px'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  {chunk.title.length > 40 ? `${chunk.title.substring(0, 40)}...` : chunk.title}
                </div>
                <div>Retrieved {chunk.retrievalCount}x, Avg Similarity: {(chunk.avgSimilarity || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.questions.length > 0 && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '6px' }}>
          <strong style={{ fontSize: '0.8rem' }}>
            Sample Questions ({data.questions.length} total):
          </strong>
          <div style={{ marginTop: '4px' }}>
            {data.questions.slice(0, 2).map((question, idx) => (
              <div key={idx} style={{ 
                fontSize: '0.75rem',
                padding: '3px 0',
                color: '#666',
                marginBottom: '3px'
              }}>
                <div>{question.questionText.length > 60 ? `${question.questionText.substring(0, 60)}...` : question.questionText}</div>
                <div><strong>Quality:</strong> {(question.qualityScore || 0).toFixed(1)}, <strong>Chunks:</strong> {question.chunksRetrieved}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderChunkToRoleTooltip = (data: ChunkToRoleHeatmapData) => (
    <div>
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '0.9rem',
        marginBottom: '8px',
        color: '#333',
        borderBottom: '1px solid #eee',
        paddingBottom: '5px'
      }}>
        📄 {data.title.length > 40 ? `${data.title.substring(0, 40)}...` : data.title}
      </div>

      {data.isOrphaned ? (
        <div style={{ 
          color: '#6c757d',
          fontSize: '0.8rem',
          textAlign: 'center',
          padding: '10px',
          fontStyle: 'italic'
        }}>
          This chunk has never been retrieved by any questions
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Avg Similarity:</span>
              <span style={{ 
                color: getStatusColor(data.avgSimilarity || 0),
                fontWeight: 'bold',
                fontSize: '0.8rem'
              }}>
                {(data.avgSimilarity || 0).toFixed(1)} ({getStatusText(data.avgSimilarity || 0)})
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem' }}>Total Retrievals:</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{data.totalRetrievals}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem' }}>Dominant Role:</span>
              <span style={{ 
                fontSize: '0.8rem', 
                fontWeight: 'bold',
                color: '#007bff'
              }}>
                {data.dominantRole.roleName} ({data.dominantRole.percentage}%)
              </span>
            </div>
          </div>

          {data.roleAccess.length > 0 && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: '6px' }}>
              <strong style={{ fontSize: '0.8rem' }}>Role Access Patterns:</strong>
              <div style={{ marginTop: '4px' }}>
                {data.roleAccess.slice(0, 3).map((role, idx) => (
                  <div key={idx} style={{ 
                    fontSize: '0.75rem',
                    padding: '3px 0',
                    color: '#666',
                    borderLeft: '2px solid #007bff',
                    paddingLeft: '6px',
                    marginBottom: '3px'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>
                      👤 {role.roleName}
                    </div>
                    <div>
                      {role.accessCount} retrieval{role.accessCount > 1 ? 's' : ''}, 
                      Avg Similarity: {(role.avgSimilarity || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.roleAccess.length > 0 && data.roleAccess[0].sampleQuestions.length > 0 && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: '6px' }}>
              <strong style={{ fontSize: '0.8rem' }}>
                Sample Questions:
              </strong>
              <div style={{ marginTop: '4px' }}>
                {data.roleAccess[0].sampleQuestions.slice(0, 2).map((question, idx) => (
                  <div key={idx} style={{ 
                    fontSize: '0.75rem',
                    padding: '3px 0',
                    color: '#666',
                    marginBottom: '3px'
                  }}>
                    <div>{question.questionText.length > 60 ? `${question.questionText.substring(0, 60)}...` : question.questionText}</div>
                    <div><strong>Similarity:</strong> {(question.similarity || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const handleTooltipClick = () => {
    // Hide tooltip when clicked
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      onClick={handleTooltipClick}
      style={{
        position: 'absolute',
        left: position.x + 10,
        top: position.y - 10,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: '6px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: '0.8rem',
        maxWidth: '350px',
        minWidth: '250px',
        lineHeight: '1.4',
        // Ensure tooltip doesn't go off screen
        transform: position.x > window.innerWidth - 400 ? 'translateX(-100%)' : 'none',
        // Optimize rendering performance
        willChange: 'transform',
        cursor: 'pointer' // Show it's clickable
      }}
    >
      {point.data.type === 'question' 
        ? renderQuestionTooltip(point.data as QuestionHeatmapData)
        : point.data.type === 'chunk'
        ? renderChunkTooltip(point.data as ChunkHeatmapData)
        : point.data.type === 'role'
        ? renderRoleTooltip(point.data as RoleHeatmapData)
        : renderChunkToRoleTooltip(point.data as ChunkToRoleHeatmapData)
      }
      
      <div style={{ 
        fontSize: '0.7rem',
        color: '#999',
        marginTop: '8px',
        borderTop: '1px solid #eee',
        paddingTop: '4px',
        textAlign: 'center'
      }}>
        💡 Click tooltip to dismiss | Click point to drill down
      </div>
    </div>
  );
});

HeatmapTooltip.displayName = 'HeatmapTooltip';

export default HeatmapTooltip;
