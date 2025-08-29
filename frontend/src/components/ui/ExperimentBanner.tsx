import React from 'react';

// Utility function to convert filename to human-readable name
const getExperimentDisplayName = (filename: string): string => {
  const baseName = filename.replace(/^experiment_/, '').replace(/\.json$/, '');
  
  // Convert underscores to spaces and format as a readable date/time
  const parts = baseName.split('_');
  if (parts.length >= 6) {
    // Format: YYYY_MM_DD_HH_MM_SS
    const [year, month, day, hour, minute, second] = parts;
    const readableName = `${year}/${month}/${day} at ${hour}:${minute}:${second}`;
    return `${readableName} (${filename})`;
  }
  
  // Fallback: just replace underscores with spaces
  return `${baseName.replace(/_/g, ' ')} (${filename})`;
};

interface ExperimentBannerProps {
  experimentFilename: string;
  experimentName: string | null;
  variant?: 'results' | 'heatmap' | 'gap-analysis';
}

const ExperimentBanner: React.FC<ExperimentBannerProps> = ({ 
  experimentFilename, 
  experimentName, 
  variant = 'results' 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'results':
        return {
          backgroundColor: '#e3f2fd',
          border: '1px solid #90caf9',
          labelColor: '#1976d2'
        };
      case 'heatmap':
        return {
          backgroundColor: '#e8f5e8',
          border: '1px solid #81c784',
          labelColor: '#2e7d32'
        };
      case 'gap-analysis':
        return {
          backgroundColor: '#fff3e0',
          border: '1px solid #ffab40',
          labelColor: '#e65100'
        };
      default:
        return {
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          labelColor: '#666'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div style={{
      backgroundColor: styles.backgroundColor,
      border: styles.border,
      borderRadius: '8px',
      padding: '8px 12px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px'
    }}>
      <span style={{ fontWeight: 'bold', color: styles.labelColor }}>🧪 Experiment:</span>
      <span style={{ color: '#424242' }}>
        {experimentName ? `${experimentName} (${experimentFilename})` : getExperimentDisplayName(experimentFilename)}
      </span>
    </div>
  );
};

export default ExperimentBanner;