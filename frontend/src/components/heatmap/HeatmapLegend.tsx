import React from 'react';
import { HeatmapPerspective } from '../../types';
import { getScaledSize } from '../../utils/heatmapData';

interface HeatmapLegendProps {
  perspective: HeatmapPerspective;
  style?: React.CSSProperties;
}

const HeatmapLegend: React.FC<HeatmapLegendProps> = React.memo(({
  perspective,
  style = {}
}) => {
  const colorLegendItems = perspective === 'documents-to-chunks' ? [
    { value: 0.9, label: 'Document: High Avg Quality (≥7.0)', color: '#28a745' },
    { value: 0.6, label: 'Document: Medium Avg Quality (5.0-7.0)', color: '#e67e22' },
    { value: 0.3, label: 'Document: Low Avg Quality (<5.0)', color: '#dc3545' },
    { value: 0.0, label: 'Document: No Retrieved Chunks', color: '#9e9e9e' }
  ] : perspective === 'chunks-to-questions' ? [
    { value: 0.9, label: 'Excellent (≥7.0)', color: '#28a745' },
    { value: 0.6, label: 'Weak (5.0-7.0)', color: '#e67e22' },
    { value: 0.3, label: 'Poor (<5.0)', color: '#dc3545' },
    { value: 0.0, label: 'Unretrieved chunk clusters (darker)', color: '#6d4c41' }
  ] : [
    { value: 0.9, label: 'Excellent (≥7.0)', color: '#28a745' },
    { value: 0.6, label: 'Weak (5.0-7.0)', color: '#e67e22' },
    { value: 0.3, label: 'Poor (<5.0)', color: '#dc3545' }
  ];

  const sizeLegendItems = perspective === 'documents-to-chunks' ? [
    { size: 1.2, label: 'Document: Many Chunks (50+ chunks)', shape: 'hexagon' },
    { size: 0.8, label: 'Document: Medium Chunks (20-50 chunks)', shape: 'hexagon' },
    { size: 0.5, label: 'Document: Few Chunks (<20 chunks)', shape: 'hexagon' }
  ] : perspective === 'chunks-to-questions' ? [
    { size: 1.0, label: 'High retrieval frequency' },
    { size: 0.6, label: 'Medium retrieval frequency' },
    { size: 0.4, label: 'Low retrieval frequency' },
    { size: 1.0, label: 'Unretrieved chunk clusters (size = quantity)' }
  ] : perspective === 'roles-to-chunks' ? [
    { size: 1.0, label: 'High chunk count' },
    { size: 0.6, label: 'Medium chunk count' },
    { size: 0.4, label: 'Low chunk count' },
    { size: 0.15, label: 'Unretrieved chunks only' }
  ] : [
    { size: 1.0, label: 'Many questions' },
    { size: 0.6, label: 'Some questions' },
    { size: 0.3, label: 'Few questions' }
  ];

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      fontSize: '0.8rem',
      ...style
    }}>
      
      {/* Title */}
      <div style={{ 
        fontWeight: 'bold',
        fontSize: '0.85rem',
        color: '#333',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '6px'
      }}>
        🗺️ Legend
      </div>

      {/* Color Legend */}
      <div>
        <div style={{ 
          fontWeight: 'bold',
          fontSize: '0.75rem',
          color: '#555',
          marginBottom: '6px'
        }}>
          🎨 Color
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {colorLegendItems.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px'
            }}>
              <div style={{ 
                width: '12px',
                height: '12px',
                backgroundColor: item.color,
                borderRadius: '50%',
                border: '1px solid #fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }} />
              <span style={{ color: '#666', fontSize: '0.75rem' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Size Legend */}
      <div>
        <div style={{ 
          fontWeight: 'bold',
          fontSize: '0.75rem',
          color: '#555',
          marginBottom: '6px'
        }}>
          📏 Size
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {sizeLegendItems.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <div style={{ 
                width: `${getScaledSize(item.size, 6, 16)}px`,
                height: `${getScaledSize(item.size, 6, 16)}px`,
                backgroundColor: '#6c757d',
                borderRadius: perspective === 'documents-to-chunks' && (item as any).shape === 'hexagon' ? '0%' : '50%',
                border: '1px solid #fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                clipPath: perspective === 'documents-to-chunks' && (item as any).shape === 'hexagon' 
                  ? 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)' 
                  : undefined
              }} />
              <span style={{ color: '#666', fontSize: '0.75rem' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inner Chunks Legend for Documents-to-Chunks */}
      {perspective === 'documents-to-chunks' && (
        <div>
          <div style={{ 
            fontWeight: 'bold',
            fontSize: '0.75rem',
            color: '#555',
            marginBottom: '6px'
          }}>
            🔷 Inner Chunks (Hexagonal)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '10px',
                height: '10px',
                backgroundColor: '#28a745',
                clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                border: '1px solid #fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }} />
              <span style={{ color: '#666', fontSize: '0.75rem' }}>Associated Chunks (Retrieved by questions)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '10px',
                height: '10px',
                backgroundColor: '#9e9e9e',
                clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                border: '1px solid #fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }} />
              <span style={{ color: '#666', fontSize: '0.75rem' }}>Unassociated Chunks (Never retrieved)</span>
            </div>
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#888', 
              fontStyle: 'italic', 
              marginTop: '4px',
              paddingLeft: '16px'
            }}>
              • Clickable with detailed tooltips<br/>
              • Hover to enlarge and see details<br/>
              • Color indicates quality score<br/>
              • Arranged in concentric rings
            </div>
          </div>
        </div>
      )}

      {/* Perspective-specific explanation */}
      <div style={{
        borderTop: '1px solid #dee2e6',
        paddingTop: '10px',
        fontSize: '0.75rem',
        color: '#666',
        lineHeight: '1.4'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          📊 Current View: {perspective === 'questions-to-chunks' ? 'Questions → Chunks' : 'Chunks → Questions'}
        </div>
        <div>
          {perspective === 'questions-to-chunks' ? (
            <>
              <strong>Scatter Space:</strong> 2D distribution of questions<br/>
              <strong>Each point:</strong> Represents one question<br/>
              <strong>Position:</strong> Organic scatter layout
            </>
          ) : (
            <>
              <strong>Scatter Space:</strong> Optimized center-edge distribution<br/>
              <strong>Center Cluster:</strong> Retrieved chunks (larger, colored)<br/>
              <strong>Edge Scatter:</strong> Unretrieved chunks (smaller, grey)<br/>
              <strong>Spacing:</strong> Auto-optimized to prevent overlaps
            </>
          )}
        </div>
      </div>

      {/* Interactive hints */}
      <div style={{
        backgroundColor: '#e8f4fd',
        border: '1px solid #bee5eb',
        borderRadius: '4px',
        padding: '8px',
        fontSize: '0.75rem',
        color: '#0c5460'
      }}>
        <strong>💡 Interactive Features:</strong><br/>
        • Hover points for detailed information<br/>
        • Click tooltip to dismiss<br/>
        • Click points to show details about chunks<br/>
        • Use controls above to switch perspectives
      </div>
    </div>
  );
});

HeatmapLegend.displayName = 'HeatmapLegend';

export default HeatmapLegend;