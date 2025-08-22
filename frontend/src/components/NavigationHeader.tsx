import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { logNavigation } from '../utils/logger';
import { LABEL_DASHBOARD, LABEL_RESULTS, LABEL_HEATMAP } from '../utils/constants';

interface NavigationHeaderProps {
  currentPage: string;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = React.memo(({ currentPage }) => {
  const router = useRouter();

  const handleNavigation = useCallback((page: string) => {
    logNavigation(currentPage, page, {
      component: 'NavigationHeader',
      action: 'NAVIGATE',
      data: { from: currentPage, to: page }
    });
    router.push(`/${page}`);
  }, [currentPage, router]);

  const isActive = useCallback((page: string) => {
    return router.pathname === `/${page}`;
  }, [router.pathname]);

  const navButtons = useMemo(() => [
    { id: 'dashboard', label: `🏠 ${LABEL_DASHBOARD}`, color: '#007bff' },
    { id: 'questions', label: '❓ Questions', color: '#666' },
    { id: 'experiment', label: '🧪 Run an Experiment', color: '#666' },
    { id: 'experiments', label: '📁 Experiments', color: '#6f42c1' },
    { id: 'results', label: `📊 Last ${LABEL_RESULTS}`, color: '#666' },
    { id: 'gap-analysis', label: '📊 Gap Analysis', color: '#0d6efd' },
    { id: 'heatmap', label: `🗺️ ${LABEL_HEATMAP}`, color: '#28a745' }
  ], []);

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #dee2e6',
      padding: '10px 0',
      marginBottom: '10px'
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
          🔍 RagCheck
        </div>
        
        <nav style={{ display: 'flex', gap: '15px' }}>
          {navButtons.map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => handleNavigation(id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: isActive(id) ? color : 'transparent',
                color: isActive(id) ? 'white' : color,
                fontWeight: isActive(id) ? 'bold' : 'normal'
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
});

NavigationHeader.displayName = 'NavigationHeader';

export default NavigationHeader;
