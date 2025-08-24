import React, { useCallback, useEffect, useState } from 'react';
import { corpusApi } from '../../services/api';

interface VectorDbStatusIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'small' | 'tiny';
}

const VectorDbStatusIndicator: React.FC<VectorDbStatusIndicatorProps> = ({ 
  position = 'top-left',
  size = 'tiny'
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Check Vector Database connection
  useEffect(() => {
    const checkVectorDbConnection = async () => {
      try {
        const status = await corpusApi.getStatus();
        console.log('VectorDb Status Check:', status); // Debug log
        // Check if the response indicates successful database connection
        const connected = status && (
          status.corpus_loaded === true &&
          status.chunk_count > 0 &&
          status.document_count > 0
        );
        setIsConnected(connected);
      } catch (error) {
        console.log('VectorDb Status Error:', error); // Debug log
        // If API fails, assume no connection
        setIsConnected(false);
      }
    };

    checkVectorDbConnection();
    
    // Recheck every 2 minutes to maintain connection status (reduced frequency)
    const interval = setInterval(checkVectorDbConnection, 120000);
    
    return () => clearInterval(interval);
  }, []);

  if (isConnected === null) {
    // Loading state - show nothing to avoid flash
    return null;
  }

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 999, // Lower than experiment status indicator
      fontSize: size === 'tiny' ? '9px' : '10px',
      padding: size === 'tiny' ? '2px 5px' : '3px 6px',
      borderRadius: '8px',
      fontWeight: '500' as const,
      letterSpacing: '0.3px',
      textTransform: 'uppercase' as const,
      lineHeight: '1',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
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
    if (isConnected) {
      return {
        backgroundColor: '#d1f2eb',
        color: '#0c5460',
        borderColor: '#a3e4d7',
      };
    } else {
      return {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        borderColor: '#f5c6cb',
      };
    }
  };

  const getStatusText = () => {
    return isConnected ? 'Vector DB' : 'DB Offline';
  };

  const getStatusIcon = () => {
    return isConnected ? '●' : '○';
  };

  const getTooltipText = () => {
    if (isConnected) {
      return 'Connected to Qdrant Vector Database with corpus loaded - All document embeddings and search functionality available';
    } else {
      return 'Vector Database not ready - Check if Qdrant is running and corpus is loaded. Start with: ./scripts/setup_qdrant.sh';
    }
  };

  return (
    <div 
      style={{
        ...getPositionStyles(),
        ...getStatusStyles(),
      }}
      title={getTooltipText()}
    >
      <span style={{ marginRight: '2px' }}>{getStatusIcon()}</span>
      {getStatusText()}
    </div>
  );
};

export default VectorDbStatusIndicator;