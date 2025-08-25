import React from 'react';
import { getStatusColor } from '../utils/qualityScore';

interface QualityScoreLegendProps {
  format?: 'horizontal' | 'compact' | 'table';
  showTitle?: boolean;
  style?: React.CSSProperties;
}

const QualityScoreLegend: React.FC<QualityScoreLegendProps> = React.memo(({
  format = 'horizontal',
  showTitle = true,
  style = {}
}) => {
  const titleText = showTitle ? '🏷️ RagCheck Quality Score' : '';

  if (format === 'compact') {
    return (
      <div style={{ 
        fontSize: '0.9rem', 
        color: '#666', 
        display: 'flex', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        gap: '32px',
        ...style 
      }}>
        {titleText && <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{titleText}:</span>}
        <span style={{ color: getStatusColor(7.0), display: 'flex', alignItems: 'center', gap: '4px' }}>
          🟢 <strong>GOOD</strong> (≥7.0)
        </span>
        <span style={{ color: getStatusColor(6.0), display: 'flex', alignItems: 'center', gap: '4px' }}>
          🟡 <strong>DEVELOPING</strong> (&#8805;5.0 &amp; &lt;7.0)
        </span>
        <span style={{ color: getStatusColor(4.0), display: 'flex', alignItems: 'center', gap: '4px' }}>
          🔴 <strong>POOR</strong> (&lt;5.0)
        </span>
      </div>
    );
  }

  if (format === 'table') {
    return (
      <div style={{ 
        border: '1px solid #dee2e6', 
        borderRadius: '6px', 
        backgroundColor: '#f8f9fa',
        padding: '12px',
        ...style 
      }}>
        {titleText && (
          <div style={{ 
            fontSize: '0.9rem', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: '#333' 
          }}>
            {titleText} Classification
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #dee2e6' }}>
              <th style={{ padding: '6px', textAlign: 'left', color: '#666' }}>Status</th>
              <th style={{ padding: '6px', textAlign: 'left', color: '#666' }}>Score Range</th>
              <th style={{ padding: '6px', textAlign: 'center', color: '#666' }}>Indicator</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '6px', fontWeight: 'bold' }}>🟢 GOOD</td>
              <td style={{ padding: '6px' }}>≥ 7.0</td>
              <td style={{ padding: '6px', textAlign: 'center' }}>
                <span style={{ backgroundColor: getStatusColor(7.0), color: 'white', padding: '2px 8px', borderRadius: '3px', fontSize: '0.8rem' }}>
                  HIGH
                </span>
              </td>
            </tr>
            <tr style={{ backgroundColor: '#fff' }}>
              <td style={{ padding: '6px', fontWeight: 'bold' }}>🟡 DEVELOPING</td>
              <td style={{ padding: '6px' }}>≥ 5.0 and &lt; 7.0</td>
              <td style={{ padding: '6px', textAlign: 'center' }}>
                <span style={{ backgroundColor: getStatusColor(6.0), color: 'white', padding: '2px 8px', borderRadius: '3px', fontSize: '0.8rem' }}>
                  MED
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '6px', fontWeight: 'bold' }}>🔴 POOR</td>
              <td style={{ padding: '6px' }}>&lt; 5.0</td>
              <td style={{ padding: '6px', textAlign: 'center' }}>
                <span style={{ backgroundColor: getStatusColor(4.0), color: 'white', padding: '2px 8px', borderRadius: '3px', fontSize: '0.8rem' }}>
                  LOW
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // Default: horizontal format
  return (
    <div style={{ 
      fontSize: '0.8rem', 
      color: '#666', 
      display: 'flex !important', 
      alignItems: 'center', 
      gap: '30px',
      flexWrap: 'wrap',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      width: '100%',
      ...style 
    }}>
      {titleText && <span style={{ fontWeight: 'bold' }}>{titleText}:</span>}
      <span style={{ 
        color: getStatusColor(7.0), 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px',
        whiteSpace: 'nowrap'
      }}>
        <span style={{ fontSize: '1.2em' }}>■</span> <strong>GOOD</strong> (≥7.0)
      </span>
      <span style={{ 
        color: getStatusColor(6.0), 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px',
        whiteSpace: 'nowrap'
      }}>
        <span style={{ fontSize: '1.2em' }}>■</span> <strong>DEVELOPING</strong> (≥ 5.0 and &lt; 7.0)
      </span>
      <span style={{ 
        color: getStatusColor(4.0), 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px',
        whiteSpace: 'nowrap'
      }}>
        <span style={{ fontSize: '1.2em' }}>■</span> <strong>POOR</strong> (&lt;5.0)
      </span>
    </div>
  );
});

QualityScoreLegend.displayName = 'QualityScoreLegend';

export default QualityScoreLegend;