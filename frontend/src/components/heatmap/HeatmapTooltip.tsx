import React from 'react';
import { HeatmapPoint, QuestionHeatmapData, ChunkHeatmapData } from '../../utils/heatmapData';
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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
        : renderChunkTooltip(point.data as ChunkHeatmapData)
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

export default HeatmapTooltip;