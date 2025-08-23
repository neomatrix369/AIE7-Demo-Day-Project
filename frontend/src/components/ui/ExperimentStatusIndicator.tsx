import React, { useCallback, useEffect, useState } from 'react';
import { resultsApi } from '../../services/api';

interface ExperimentStatusIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'small' | 'tiny';
}

const ExperimentStatusIndicator: React.FC<ExperimentStatusIndicatorProps> = ({ 
  position = 'top-right',
  size = 'tiny'
}) => {
  const [hasExperimentData, setHasExperimentData] = useState<boolean | null>(null);

  // Check for experiment data availability
  useEffect(() => {
    const checkExperimentData = async () => {
      try {
        const results = await resultsApi.getAnalysis();
        const hasData = results && results.overall && results.overall.total_questions > 0;
        setHasExperimentData(hasData);
      } catch (error) {
        // If API fails, assume no data
        setHasExperimentData(false);
      }
    };

    checkExperimentData();
  }, []);

  if (hasExperimentData === null) {
    // Loading state - show nothing to avoid flash
    return null;
  }

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1000,
      fontSize: size === 'tiny' ? '10px' : '11px',
      padding: size === 'tiny' ? '3px 6px' : '4px 8px',
      borderRadius: '10px',
      fontWeight: '500' as const,
      letterSpacing: '0.5px',
      textTransform: 'uppercase' as const,
      lineHeight: '1',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid',
      cursor: 'default' as const,
    };

    const positionStyles = {
      'top-right': { top: '15px', right: '15px' },
      'top-left': { top: '15px', left: '15px' },
      'bottom-right': { bottom: '15px', right: '15px' },
      'bottom-left': { bottom: '15px', left: '15px' },
    };

    return { ...baseStyles, ...positionStyles[position] };
  };

  const getStatusStyles = () => {
    if (hasExperimentData) {
      return {
        backgroundColor: '#d4edda',
        color: '#155724',
        borderColor: '#c3e6cb',
      };
    } else {
      return {
        backgroundColor: '#fff3cd',
        color: '#856404',
        borderColor: '#ffeaa7',
      };
    }
  };

  const getStatusText = () => {
    return hasExperimentData ? 'Data Available' : 'No Experiment Data';
  };

  const getStatusIcon = () => {
    return hasExperimentData ? '●' : '○';
  };

  return (
    <div 
      style={{
        ...getPositionStyles(),
        ...getStatusStyles(),
      }}
      title={hasExperimentData 
        ? 'Experiment data is loaded and available for analysis' 
        : 'No experiment data available. Load one from the Experiments page or run an experiment from the Run Experiments page to see results.'}
    >
      <span style={{ marginRight: '3px' }}>{getStatusIcon()}</span>
      {getStatusText()}
    </div>
  );
};

export default ExperimentStatusIndicator;