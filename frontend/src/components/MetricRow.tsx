import React from 'react';
import { MetricRowProps } from '../types';
import { formatImprovement } from '../utils/comparisonCalculations';

interface ExtendedMetricRowProps extends MetricRowProps {
  backgroundColor?: string;
}

const MetricRow: React.FC<ExtendedMetricRowProps> = ({ 
  label, 
  before, 
  after, 
  improvement, 
  impact, 
  isLast = false,
  backgroundColor = '#f8fff8'
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
          color: '#dc3545'
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
          color: '#28a745'
        }}>
          {after}
        </span>
        
        {calculatedImprovement && (
          <span style={{
            backgroundColor: '#d4edda',
            color: '#155724',
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
          <span style={{ color: '#28a745', fontSize: '18px', marginTop: '2px' }}>✅</span>
          <span style={{ lineHeight: '1.5' }}>{improvement}</span>
        </div>
      )}
    </div>
  );
};

export default MetricRow;
