import React from 'react';

interface LoadingDisplayProps {
  title?: string;
  message?: string;
  subMessage?: string;
}

const LoadingDisplay: React.FC<LoadingDisplayProps> = React.memo(({
  title = 'Loading...',
  message = 'Please wait while we load your data',
  subMessage = 'This may take a few moments'
}) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          {message}
        </div>
        {subMessage && (
          <div style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
            {subMessage}
          </div>
        )}
      </div>
    </div>
  );
});

LoadingDisplay.displayName = 'LoadingDisplay';

export default LoadingDisplay;