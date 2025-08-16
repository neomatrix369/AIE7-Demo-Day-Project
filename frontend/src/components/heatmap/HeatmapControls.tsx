import React from 'react';
import { HeatmapPerspective, HeatmapConfig } from '../../types';

interface HeatmapControlsProps {
  config: HeatmapConfig;
  onConfigChange: (newConfig: Partial<HeatmapConfig>) => void;
  totalQuestions: number;
  totalChunks: number;
}

const HeatmapControls: React.FC<HeatmapControlsProps> = React.memo(({
  config,
  onConfigChange,
  totalQuestions,
  totalChunks
}) => {
  const handlePerspectiveChange = (perspective: HeatmapPerspective) => {
    onConfigChange({ perspective });
  };

  const handleQualityFilterChange = (qualityFilter: 'all' | 'good' | 'weak' | 'poor') => {
    onConfigChange({ qualityFilter });
  };

  const handlePointSizeChange = (pointSize: 'small' | 'medium' | 'large') => {
    onConfigChange({ pointSize });
  };

  const handleTooltipToggle = () => {
    onConfigChange({ showTooltips: !config.showTooltips });
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '6px',
      marginBottom: '20px'
    }}>
      
      {/* Perspective Toggle */}
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '0.9rem' }}>
          🔄 Visualization Perspective
        </h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={config.perspective === 'questions-to-chunks' ? 'button' : 'button button-secondary'}
            style={{ 
              padding: '8px 16px',
              fontSize: '0.85rem',
              backgroundColor: config.perspective === 'questions-to-chunks' ? '#007bff' : '#6c757d',
              minWidth: '160px'
            }}
            onClick={() => handlePerspectiveChange('questions-to-chunks')}
          >
            📝 Questions → Chunks
            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>
              ({totalQuestions} questions)
            </div>
          </button>
          <button
            className={config.perspective === 'chunks-to-questions' ? 'button' : 'button button-secondary'}
            style={{ 
              padding: '8px 16px',
              fontSize: '0.85rem',
              backgroundColor: config.perspective === 'chunks-to-questions' ? '#007bff' : '#6c757d',
              minWidth: '160px'
            }}
            onClick={() => handlePerspectiveChange('chunks-to-questions')}
          >
            📄 Chunks → Questions
            <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>
              ({totalChunks} retrieved chunks)
            </div>
          </button>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
          {config.perspective === 'questions-to-chunks' 
            ? 'View how questions map to document chunks they retrieve'
            : 'View how document chunks are retrieved by different questions (includes orphaned chunks that were never retrieved)'
          }
        </div>
      </div>

      {/* Control Row */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        alignItems: 'center',
        flexWrap: 'wrap',
        borderTop: '1px solid #dee2e6',
        paddingTop: '15px'
      }}>
        
        {/* Quality Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.85rem', color: '#555' }}>🎯 Filter:</strong>
          <select
            value={config.qualityFilter}
            onChange={(e) => handleQualityFilterChange(e.target.value as any)}
            className="form-control"
            style={{ width: '100px', padding: '4px 8px', fontSize: '0.85rem' }}
          >
            <option value="all">All</option>
            <option value="good">Good</option>
            <option value="weak">Weak</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        {/* Point Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.85rem', color: '#555' }}>📏 Size:</strong>
          <select
            value={config.pointSize}
            onChange={(e) => handlePointSizeChange(e.target.value as any)}
            className="form-control"
            style={{ width: '100px', padding: '4px 8px', fontSize: '0.85rem' }}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        {/* Tooltips Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '0.85rem',
            color: '#555',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={config.showTooltips}
              onChange={handleTooltipToggle}
              style={{ transform: 'scale(1.1)' }}
            />
            <strong>💬 Tooltips</strong>
          </label>
        </div>

        {/* Help Text */}
        <div style={{ 
          marginLeft: 'auto',
          fontSize: '0.8rem',
          color: '#666',
          fontStyle: 'italic'
        }}>
          💡 Hover points for details, click to drill down
        </div>
      </div>

      {/* Perspective-specific info */}
      <div style={{ 
        fontSize: '0.8rem',
        color: '#495057',
        backgroundColor: '#e9ecef',
        padding: '8px 12px',
        borderRadius: '4px',
        borderLeft: '3px solid #007bff'
      }}>
        {config.perspective === 'questions-to-chunks' ? (
          <>
            <strong>📊 Data Points:</strong> Each point represents a question. 
            <strong> Size</strong> = chunks retrieved, <strong>Color</strong> = quality score, 
            <strong> Y-axis</strong> = average similarity.
          </>
        ) : (
          <>
            <strong>📊 Data Points:</strong> Each point represents a document chunk with optimized spacing. 
            <strong> Size</strong> = retrieval frequency (smaller for orphaned), <strong>Color</strong> = average similarity (grey for orphaned), 
            <strong> Position</strong> = center cluster (retrieved) vs edge scatter (orphaned). 
            <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Auto-spaced to prevent overlaps while maintaining center/edge distribution.</span>
          </>
        )}
      </div>
    </div>
  );
});

HeatmapControls.displayName = 'HeatmapControls';

export default HeatmapControls;