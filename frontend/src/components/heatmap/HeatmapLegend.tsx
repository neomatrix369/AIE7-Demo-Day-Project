import React from 'react';
import { HeatmapPerspective } from '../../types';
import { getHeatmapColor, getScaledSize } from '../../utils/heatmapData';

interface HeatmapLegendProps {
  perspective: HeatmapPerspective;
  style?: React.CSSProperties;
}

const HeatmapLegend: React.FC<HeatmapLegendProps> = ({
  perspective,
  style = {}
}) => {
  const colorLegendItems = perspective === 'chunks-to-questions' ? [
    { value: 0.9, label: 'Excellent (≥7.0)', color: '#28a745' },
    { value: 0.6, label: 'Weak (5.0-7.0)', color: '#e67e22' },
    { value: 0.3, label: 'Poor (<5.0)', color: '#dc3545' },
    { value: 0.0, label: 'Orphaned (never retrieved)', color: '#6c757d' }
  ] : [
    { value: 0.9, label: 'Excellent (≥7.0)', color: '#28a745' },
    { value: 0.6, label: 'Weak (5.0-7.0)', color: '#e67e22' },
    { value: 0.3, label: 'Poor (<5.0)', color: '#dc3545' }
  ];

  const sizeLegendItems = perspective === 'chunks-to-questions' ? [
    { size: 1.0, label: 'High retrieval frequency' },
    { size: 0.6, label: 'Medium retrieval frequency' },
    { size: 0.4, label: 'Low retrieval frequency' },
    { size: 0.15, label: 'Orphaned (no retrieval)' }
  ] : [
    { size: 1.0, label: 'High' },
    { size: 0.6, label: 'Medium' },
    { size: 0.3, label: 'Low' }
  ];

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      fontSize: '0.85rem',
      ...style
    }}>
      
      {/* Title */}
      <div style={{ 
        fontWeight: 'bold',
        fontSize: '0.9rem',
        color: '#333',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '8px'
      }}>
        🗺️ Heatmap Legend
      </div>

      {/* Color Legend */}
      <div>
        <div style={{ 
          fontWeight: 'bold',
          fontSize: '0.8rem',
          color: '#555',
          marginBottom: '8px'
        }}>
          🎨 Color Intensity ({perspective === 'questions-to-chunks' ? 'Quality Score' : 'Average Similarity'})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {colorLegendItems.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <div style={{ 
                width: '16px',
                height: '16px',
                backgroundColor: item.color,
                borderRadius: '50%',
                border: '1px solid #fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }} />
              <span style={{ color: '#666' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Size Legend */}
      <div>
        <div style={{ 
          fontWeight: 'bold',
          fontSize: '0.8rem',
          color: '#555',
          marginBottom: '8px'
        }}>
          📏 Point Size ({perspective === 'questions-to-chunks' ? 'Chunks Retrieved' : 'Retrieval Frequency'})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sizeLegendItems.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px'
            }}>
              <div style={{ 
                width: `${getScaledSize(item.size, 8, 20)}px`,
                height: `${getScaledSize(item.size, 8, 20)}px`,
                backgroundColor: '#6c757d',
                borderRadius: '50%',
                border: '1px solid #fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }} />
              <span style={{ color: '#666' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

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
              <strong>Edge Scatter:</strong> Orphaned chunks (smaller, grey)<br/>
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
        • Click points to drill down to analysis<br/>
        • Use controls above to switch perspectives
      </div>
    </div>
  );
};

export default HeatmapLegend;