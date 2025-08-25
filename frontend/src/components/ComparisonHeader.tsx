import React from 'react';
import { ComparisonData } from '../types';
import { getOverallImprovement, formatDate, formatTime } from '../utils/comparisonCalculations';
import { getStatusColorScheme } from '../utils/statusColors';

interface ComparisonHeaderProps {
  data: ComparisonData;
}

const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({ data }) => {
  const overallImprovement = getOverallImprovement(data);
  
  // Get background color based on theme
  const getBadgeBackgroundColor = (theme: 'positive' | 'negative' | 'neutral') => {
    switch (theme) {
      case 'positive':
        return 'rgba(40, 167, 69, 0.25)'; // Green with transparency
      case 'negative':
        return 'rgba(220, 53, 69, 0.25)'; // Red with transparency
      case 'neutral':
        return 'rgba(255, 255, 255, 0.25)'; // White with transparency
      default:
        return 'rgba(255, 255, 255, 0.25)';
    }
  };
  
  const getBadgeBorderColor = (theme: 'positive' | 'negative' | 'neutral') => {
    switch (theme) {
      case 'positive':
        return 'rgba(40, 167, 69, 0.4)'; // Green border
      case 'negative':
        return 'rgba(220, 53, 69, 0.4)'; // Red border
      case 'neutral':
        return 'rgba(255, 255, 255, 0.3)'; // White border
      default:
        return 'rgba(255, 255, 255, 0.3)';
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '28px',
      borderRadius: '12px',
      marginBottom: '24px',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)'
    }}>
      {/* Main Title */}
      <h1 style={{
        margin: '0 0 20px 0',
        fontSize: '28px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '16px', opacity: 0.9 }}>
          <span style={{ color: '#ff6b6b' }}>📊 Baseline</span>
          <span style={{ margin: '0 12px', color: 'rgba(255, 255, 255, 0.8)' }}>→</span>
          <span style={{ color: '#51cf66' }}>📈 Enhanced</span>
        </div>
        <span style={{ color: '#ff6b6b' }}>{data.experimentA.name}</span>
        <span style={{ margin: '0 12px', color: 'rgba(255, 255, 255, 0.8)' }}>vs</span>
        <span style={{ color: '#51cf66' }}>{data.experimentB.name}</span>
      </h1>

      {/* Overall Improvement Badge */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: getBadgeBackgroundColor(overallImprovement.theme),
          padding: '20px 32px',
          borderRadius: '16px',
          display: 'inline-block',
          border: `2px solid ${getBadgeBorderColor(overallImprovement.theme)}`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '6px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            lineHeight: '1.3',
            whiteSpace: 'pre-line'
          }}>
            {overallImprovement.text}
          </div>
          <div style={{
            fontSize: '16px',
            opacity: 0.95,
            fontWeight: '500'
          }}>
            {overallImprovement.narrative}
          </div>
        </div>
      </div>

      {/* Status Transformation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '24px',
        marginBottom: '28px'
      }}>
        <div style={{
          backgroundColor: getStatusColorScheme(data.experimentA.status).primary,
          color: getStatusColorScheme(data.experimentA.status).text,
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
          border: `2px solid ${getStatusColorScheme(data.experimentA.status).secondary}`
        }}>
          {data.experimentA.status}
        </div>
        
        <span style={{ 
          fontSize: '28px',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
        }}>🎯</span>
        
        <div style={{
          backgroundColor: getStatusColorScheme(data.experimentB.status).primary,
          color: getStatusColorScheme(data.experimentB.status).text,
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
          border: `2px solid ${getStatusColorScheme(data.experimentB.status).secondary}`
        }}>
          {data.experimentB.status}
        </div>
      </div>

      {/* Experiment Timeline Cards */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '16px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '16px',
          borderRadius: '10px',
          flex: 1,
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
            {data.experimentA.name}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '2px' }}>
            {formatDate(data.experimentA.date)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>
            {data.experimentA.time}
          </div>
          <div style={{
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            BASELINE
          </div>
        </div>

        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          margin: '0 12px'
        }}>
          →
        </div>

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '16px',
          borderRadius: '10px',
          flex: 1,
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
            {data.experimentB.name}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '2px' }}>
            {formatDate(data.experimentB.date)}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>
            {data.experimentB.time}
          </div>
          <div style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold'
          }}>
            ENHANCED
          </div>
        </div>
      </div>

      {/* Meta Information Tags */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <span style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          padding: '6px 12px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {data.experimentA.questionCount} Questions Each
        </span>
        
        {/* Quality improvement tag - show if there's any improvement */}
        {(data.metrics.overallQuality.after > data.metrics.overallQuality.before || 
          data.metrics.successRate.after > data.metrics.successRate.before) && (
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            Quality Improvement
          </span>
        )}
        

        
        {/* Dynamic success rate tag */}
        {data.metrics.successRate.after > data.metrics.successRate.before && 
         ((data.metrics.successRate.after - data.metrics.successRate.before) / Math.max(data.metrics.successRate.before, 1)) > 0.25 && (
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            Success Rate Boost
          </span>
        )}
        
        {/* Show same corpus tag if questions are the same */}
        {data.experimentA.questionCount === data.experimentB.questionCount && (
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            Same Corpus Used
          </span>
        )}
      </div>
    </div>
  );
};

export default ComparisonHeader;
