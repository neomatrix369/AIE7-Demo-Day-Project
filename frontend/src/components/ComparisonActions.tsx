import React from 'react';

interface ComparisonActionsProps {
  onUseExperiment?: () => void;
  onViewDetails?: () => void;
  onExport?: () => void;
  onRunNew?: () => void;
}

const ComparisonActions: React.FC<ComparisonActionsProps> = ({
  onUseExperiment,
  onViewDetails,
  onExport,
  onRunNew
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      padding: '24px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <button
        onClick={onUseExperiment}
        style={{
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ✅ Use Experiment B
      </button>

      <button
        onClick={onViewDetails}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        📊 View Detailed Results
      </button>

      <button
        onClick={onExport}
        style={{
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        📤 Export Comparison
      </button>

      <button
        onClick={onRunNew}
        style={{
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        🔄 Run New Experiment
      </button>
    </div>
  );
};

export default ComparisonActions;
