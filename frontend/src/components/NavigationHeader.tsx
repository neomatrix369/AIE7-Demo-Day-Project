import React from 'react';
import { useRouter } from 'next/router';
import { logNavigation } from '../utils/logger';

interface NavigationHeaderProps {
  currentPage: string;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({ currentPage }) => {
  const router = useRouter();

  const handleNavigation = (page: string) => {
    logNavigation(currentPage, page, {
      component: 'NavigationHeader',
      action: 'NAVIGATE',
      data: { from: currentPage, to: page }
    });
    router.push(`/${page}`);
  };

  const isActive = (page: string) => {
    return router.pathname === `/${page}`;
  };

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      padding: '10px 0',
      marginBottom: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
          🧪 RagCheck
        </div>
        
        <nav style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={() => handleNavigation('dashboard')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: isActive('dashboard') ? '#007bff' : 'transparent',
              color: isActive('dashboard') ? 'white' : '#666',
              fontWeight: isActive('dashboard') ? 'bold' : 'normal'
            }}
          >
            🏠 Dashboard
          </button>
          
          <button
            onClick={() => handleNavigation('questions')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: isActive('questions') ? '#007bff' : 'transparent',
              color: isActive('questions') ? 'white' : '#666',
              fontWeight: isActive('questions') ? 'bold' : 'normal'
            }}
          >
            ❓ Questions
          </button>
          
          <button
            onClick={() => handleNavigation('experiment')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: isActive('experiment') ? '#007bff' : 'transparent',
              color: isActive('experiment') ? 'white' : '#666',
              fontWeight: isActive('experiment') ? 'bold' : 'normal'
            }}
          >
            🧪 Experiment
          </button>
          
          <button
            onClick={() => handleNavigation('experiments')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: isActive('experiments') ? '#6f42c1' : 'transparent',
              color: isActive('experiments') ? 'white' : '#6f42c1',
              fontWeight: isActive('experiments') ? 'bold' : 'normal'
            }}
          >
            📁 Experiments
          </button>
          
          <button
            onClick={() => handleNavigation('results')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: isActive('results') ? '#007bff' : 'transparent',
              color: isActive('results') ? 'white' : '#666',
              fontWeight: isActive('results') ? 'bold' : 'normal'
            }}
          >
            📊 Results
          </button>
        </nav>
      </div>
    </div>
  );
};

export default NavigationHeader;
