import React from 'react';
import { HeatmapPoint, QuestionHeatmapData, ChunkHeatmapData, RoleHeatmapData, ChunkToRoleHeatmapData, UnassociatedClusterHeatmapData, DocumentHeatmapData } from '../../utils/heatmapData';
import { HeatmapPerspective, TooltipPosition } from '../../types';
import BalloonTooltip from '../ui/BalloonTooltip';

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

  const renderDocumentTooltip = (data: DocumentHeatmapData) => {
    const retrievedChunks = data.chunks.filter(c => !c.isUnretrieved);
    const unassociatedChunks = data.chunks.filter(c => c.isUnretrieved);

    return (
      <div>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '1.1rem', 
          marginBottom: '8px',
          borderBottom: '1px solid #e9ecef',
          paddingBottom: '6px',
          color: '#495057'
        }}>
          📄 {data.title}
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <strong style={{ color: '#495057' }}>Document Overview:</strong>
          <div style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#6c757d' }}>
            • Total Chunks: <strong>{data.chunkCount}</strong><br/>
            • Retrieved Chunks: <strong style={{ color: '#28a745' }}>{retrievedChunks.length}</strong><br/>
            • Unassociated Chunks: <strong style={{ color: '#6c757d' }}>{unassociatedChunks.length}</strong><br/>
            • Total Retrievals: <strong>{data.totalRetrievals}</strong>
          </div>
        </div>

        {data.avgSimilarity > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#495057' }}>Average Quality Score:</strong>
            <span style={{ 
              color: getStatusColor(data.avgSimilarity),
              fontWeight: 'bold',
              marginLeft: '6px'
            }}>
              {data.avgSimilarity.toFixed(1)}/10 ({getStatusText(data.avgSimilarity)})
            </span>
          </div>
        )}

        {data.topRetrievingQuestions.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#495057' }}>Top Retrieving Questions:</strong>
            {data.topRetrievingQuestions.slice(0, 3).map((q, index) => (
              <div key={index} style={{ 
                marginLeft: '10px', 
                fontSize: '0.85rem',
                color: '#495057',
                borderLeft: '2px solid #007bff',
                paddingLeft: '8px',
                marginTop: '4px',
                backgroundColor: '#f8f9fa',
                padding: '4px 8px',
                borderRadius: '3px'
              }}>
                {q.questionText.length > 50 ? `${q.questionText.substring(0, 50)}...` : q.questionText}
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '2px' }}>
                  {q.roleName && `${q.roleName} • `}{q.chunksRetrieved} chunks • Score: {q.avgSimilarity.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        )}

        {unassociatedChunks.length > 0 && (
          <div>
            <strong style={{ color: '#6c757d' }}>Unassociated Chunks:</strong>
            <div style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#6c757d' }}>
              {unassociatedChunks.length} chunks never retrieved by any question
            </div>
          </div>
        )}
      </div>
    );
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
    if (data.isUnretrieved) {
      // Minimal tooltip for Unretrieved chunks
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
            🔍 Unretrieved Chunk
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
            <strong>Retrieved Document:</strong> {data.docId}
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
          <strong>Retrieved Document:</strong> {data.docId}
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

        <div style={{ marginBottom: '8px' }}>
          <strong>Content:</strong>
          <BalloonTooltip
            content={data.content || 'No content available'}
            maxWidth={500}
            cursor="help"
            position="bottom"
          >
            <div style={{ 
              fontSize: '0.85rem',
              padding: '4px 8px',
              backgroundColor: '#f8f9fa',
              borderRadius: '3px',
              marginTop: '3px',
              maxWidth: '300px',
              lineHeight: '1.3'
            }}>
              {data.content ? (
                data.content.length > 20 ? `${data.content.substring(0, 20)}...` : data.content
              ) : (
                <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No content available</span>
              )}
            </div>
          </BalloonTooltip>
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

  const renderRoleTooltip = (data: RoleHeatmapData) => {
    const retrievedChunks = data.chunks.filter(c => !c.isUnretrieved);
    const unassociatedChunks = data.chunks.filter(c => c.isUnretrieved);
    return (
      <div>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '1.1rem', 
          marginBottom: '8px',
          borderBottom: '1px solid #e9ecef',
          paddingBottom: '6px',
          color: '#495057'
        }}>
          👥 {data.roleName}
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <strong style={{ color: '#495057' }}>Role Overview:</strong>
          <div style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#6c757d' }}>
            • Total Chunks: <strong>{data.chunkCount}</strong><br/>
            • Retrieved Chunks: <strong style={{ color: '#28a745' }}>{retrievedChunks.length}</strong><br/>
            • Unassociated Chunks: <strong style={{ color: '#6c757d' }}>{unassociatedChunks.length}</strong><br/>
            • Total Retrievals: <strong>{data.totalRetrievals}</strong>
          </div>
        </div>
        
        {data.avgSimilarity > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#495057' }}>Average Quality Score:</strong>
            <span style={{ 
              color: getStatusColor(data.avgSimilarity),
              fontWeight: 'bold',
              marginLeft: '6px'
            }}>
              {data.avgSimilarity.toFixed(1)}/10 ({getStatusText(data.avgSimilarity)})
            </span>
          </div>
        )}
        
        {data.topRetrievingQuestions.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#495057' }}>Top Retrieving Questions:</strong>
            {data.topRetrievingQuestions.slice(0, 3).map((q, index) => (
              <div key={index} style={{ 
                marginLeft: '10px', 
                fontSize: '0.85rem',
                color: '#495057',
                borderLeft: '2px solid #007bff',
                paddingLeft: '8px',
                marginTop: '4px',
                backgroundColor: '#f8f9fa',
                padding: '4px 8px',
                borderRadius: '3px'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  {q.questionText.length > 60 ? `${q.questionText.substring(0, 60)}...` : q.questionText}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '2px' }}>
                  {q.source.toUpperCase()} • {q.chunksRetrieved} chunks • Avg Score: {q.avgSimilarity.toFixed(1)}/10
                </div>
              </div>
            ))}
          </div>
        )}

        {unassociatedChunks.length > 0 && (
          <div>
            <strong style={{ color: '#6c757d' }}>Unassociated Chunks:</strong>
            <div style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#6c757d' }}>
              {unassociatedChunks.length} chunks never retrieved by any question from this role
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderClusterTooltip = (data: UnassociatedClusterHeatmapData) => (
    <div>
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '0.9rem',
        marginBottom: '8px',
        color: '#6c757d',
        borderBottom: '1px solid #eee',
        paddingBottom: '5px'
      }}>
        🔍 Unassociated Chunk Group
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Contains:</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6c757d' }}>
            {data.chunkCount} document chunks
          </span>
        </div>
      </div>

      {data.documentBreakdown.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ fontSize: '0.8rem' }}>📋 Documents:</strong>
          <div style={{ marginTop: '4px' }}>
            {data.documentBreakdown.slice(0, 5).map((doc, idx) => (
              <div key={idx} style={{ 
                fontSize: '0.75rem',
                padding: '2px 0',
                color: '#666',
                borderLeft: '2px solid #6c757d',
                paddingLeft: '6px',
                marginBottom: '2px'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  {doc.title.length > 40 ? `${doc.title.substring(0, 40)}...` : doc.title}
                </div>
                <div>{doc.chunkCount} chunk{doc.chunkCount > 1 ? 's' : ''}</div>
              </div>
            ))}
            {data.documentBreakdown.length > 5 && (
              <div style={{ 
                fontSize: '0.7rem',
                color: '#999',
                fontStyle: 'italic',
                marginTop: '4px'
              }}>
                ... and {data.documentBreakdown.length - 5} more documents
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ 
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '8px',
        fontSize: '0.8rem',
        color: '#6c757d',
        fontStyle: 'italic'
      }}>
        ⚠️ Status: Never retrieved by any question in the current experiment
      </div>

      <div style={{ 
        fontSize: '0.7rem',
        color: '#999',
        marginTop: '6px',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        This cluster represents {data.chunkCount} unassociated chunks grouped for cleaner visualization
      </div>
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

      <div style={{ marginBottom: '8px' }}>
        <strong>Content:</strong>
        <BalloonTooltip
          content={data.content || 'No content available'}
          maxWidth={500}
          cursor="help"
          position="bottom"
        >
          <div style={{ 
            fontSize: '0.85rem',
            padding: '4px 8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '3px',
            marginTop: '3px',
            maxWidth: '300px',
            lineHeight: '1.3'
          }}>
            {data.content ? (
              data.content.length > 20 ? `${data.content.substring(0, 20)}...` : data.content
            ) : (
              <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No content available</span>
            )}
          </div>
        </BalloonTooltip>
      </div>

      {data.isUnretrieved ? (
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

  // Calculate tooltip position to keep it within viewport
  const tooltipWidth = 350; // maxWidth
  // Use much larger height estimation for chunk tooltips which can be very tall
  const tooltipHeight = point.data.type === 'chunk' ? 500 : 250;
  const offset = 20; // increased offset for better spacing
  
  // Convert container-relative coordinates to absolute viewport coordinates
  let container: HTMLElement | null = document.querySelector('.heatmap-container');
  if (!container) {
    // Fallback to nearest parent of the tooltip if available
    container = document.body;
  }
  const containerRect = container.getBoundingClientRect();
  
  let left = containerRect.left + position.x + offset;
  let top = containerRect.top + position.y + offset;
  
  // Bounds use the container instead of the whole window so we don't overshoot the component
  const boundRight = containerRect.left + containerRect.width;
  const boundBottom = containerRect.top + containerRect.height;
  
  // Adjust horizontal position if tooltip would go off right edge
  if (left + tooltipWidth > boundRight - 30) { // 30px safety margin
    left = containerRect.left + position.x - tooltipWidth - offset;
  }
  
  // Adjust vertical position if tooltip would go off bottom edge
  if (top + tooltipHeight > boundBottom - 30) { // 30px safety margin
    top = containerRect.top + position.y - tooltipHeight - offset;
  }
  
  // Ensure tooltip doesn't go off left/top edges of the container
  if (left < containerRect.left + 10) {
    left = containerRect.left + 10;
  }
  if (top < containerRect.top + 10) {
    top = containerRect.top + 10;
  }
  
  // Final safety check - clamp inside container
  if (left + tooltipWidth > boundRight) left = boundRight - tooltipWidth - 10;
  if (top + tooltipHeight > boundBottom) top = boundBottom - tooltipHeight - 10;
  
  // Debug logging for tooltip positioning
  if (point.data.type === 'chunk') {
    console.log('🔍 Tooltip positioning debug (container-relative):', {
      originalPosition: { x: position.x, y: position.y },
      calculatedPosition: { left, top },
      container: { left: containerRect.left, top: containerRect.top, width: containerRect.width, height: containerRect.height },
      tooltipSize: { width: tooltipWidth, height: tooltipHeight },
      type: point.data.type
    });
  }

  return (
    <div
      onClick={handleTooltipClick}
      style={{
        position: 'fixed',
        left: left,
        top: top,
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
        // Optimize rendering performance
        willChange: 'transform',
        cursor: 'pointer' // Show it's clickable
      }}
    >
      {point.data.type === 'document' 
        ? renderDocumentTooltip(point.data as DocumentHeatmapData)
        : point.data.type === 'question' 
        ? renderQuestionTooltip(point.data as QuestionHeatmapData)
        : point.data.type === 'chunk'
        ? renderChunkTooltip(point.data as ChunkHeatmapData)
        : point.data.type === 'role'
        ? renderRoleTooltip(point.data as RoleHeatmapData)
        : point.data.type === 'unassociated-cluster'
        ? renderClusterTooltip(point.data as UnassociatedClusterHeatmapData)
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
        💡 Click tooltip to dismiss | Click point to show chunk details
      </div>
    </div>
  );
});

HeatmapTooltip.displayName = 'HeatmapTooltip';

export default HeatmapTooltip;