import React from 'react';
import { MetricRowProps } from '../types';
import { formatImprovement } from '../utils/comparisonCalculations';

interface ExtendedMetricRowProps extends MetricRowProps {
  backgroundColor?: string;
  lowerIsBetter?: boolean; // Flag to indicate if lower values are better (e.g., poor questions, developing coverage)
}

const MetricRow: React.FC<ExtendedMetricRowProps> = ({ 
  label, 
  before, 
  after, 
  improvement, 
  impact, 
  isLast = false,
  backgroundColor = '#f8fff8',
  lowerIsBetter = false
}) => {
  const getImpactBadgeColor = () => {
    switch (impact) {
      case 'HIGH':
        return '#dc3545'; // Red
      case 'MEDIUM':
        return '#ffc107'; // Yellow
      case 'LOW':
        return '#6c757d'; // Gray
      default:
        return '#6c757d';
    }
  };

  const getImpactBadgeBgColor = () => {
    switch (impact) {
      case 'HIGH':
        return '#f8d7da'; // Light red
      case 'MEDIUM':
        return '#fff3cd'; // Light yellow
      case 'LOW':
        return '#f8f9fa'; // Light gray
      default:
        return '#f8f9fa';
    }
  };

  const isNumeric = typeof before === 'number' && typeof after === 'number';
  const calculatedImprovement = isNumeric ? formatImprovement(before as number, after as number) : improvement;
  
  // Determine if the metric is improving or getting worse
  // For metrics where lower is better (like poor questions, developing coverage), invert the logic
  const isImproving = isNumeric ? 
    (lowerIsBetter ? (after as number) < (before as number) : (after as number) > (before as number)) : 
    true;
  const isWorse = isNumeric ? 
    (lowerIsBetter ? (after as number) > (before as number) : (after as number) < (before as number)) : 
    false;
  const isSame = isNumeric ? (after as number) === (before as number) : false;
  
  // Color coding based on improvement/degradation
  const getValueColor = (value: number | string, isAfter: boolean = false) => {
    if (!isNumeric) return '#333'; // Default color for non-numeric values
    
    if (isSame) return '#6c757d'; // Gray for no change
    
    if (isAfter) {
      return isImproving ? '#28a745' : '#dc3545'; // Green if improving, red if worse
    } else {
      return isImproving ? '#dc3545' : '#28a745'; // Red if improving (old value), green if worse (old value)
    }
  };

  return (
    <div style={{
      padding: '24px',
      borderBottom: isLast ? 'none' : '1px solid #e9ecef',
      backgroundColor: backgroundColor,
      textAlign: 'center'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        <span style={{
          backgroundColor: getImpactBadgeBgColor(),
          color: getImpactBadgeColor(),
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold',
          marginRight: '16px'
        }}>
          {impact} IMPACT
        </span>
        <h3 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '600',
          color: '#333'
        }}>
          {label}
        </h3>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px',
        gap: '12px'
      }}>
        <span style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: getValueColor(before as number, false)
        }}>
          {before}
        </span>
        <span style={{
          fontSize: '24px',
          color: '#6c757d'
        }}>
          →
        </span>
        <span style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: getValueColor(after as number, true)
        }}>
          {after}
        </span>
        
        {calculatedImprovement && (
          <span style={{
            backgroundColor: isImproving ? '#d4edda' : isWorse ? '#f8d7da' : '#e2e3e5',
            color: isImproving ? '#155724' : isWorse ? '#721c24' : '#6c757d',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            {calculatedImprovement}
          </span>
        )}
      </div>

      {improvement && (
        <div style={{
          fontSize: '16px',
          color: '#6c757d',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '12px',
          textAlign: 'left',
          maxWidth: '600px',
          margin: '12px auto 0 auto'
        }}>
          <span style={{ 
            color: isImproving ? '#28a745' : isWorse ? '#dc3545' : '#6c757d', 
            fontSize: '18px', 
            marginTop: '2px' 
          }}>
            {isImproving ? '✅' : isWorse ? '❌' : '➖'}
          </span>
          <span style={{ 
            lineHeight: '1.5',
            color: isImproving ? '#28a745' : isWorse ? '#dc3545' : '#6c757d'
          }}>
            {improvement}
          </span>
        </div>
      )}
    </div>
  );
};

export default MetricRow;
