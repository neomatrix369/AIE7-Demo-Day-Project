import React from 'react';
import usePageNavigation from '../hooks/usePageNavigation';
import { LABEL_RESULTS, LABEL_HEATMAP, LABEL_DASHBOARD } from '../utils/constants';
import GapAnalysisDashboard from '../components/gap-analysis/GapAnalysisDashboard';
import PageWrapper from '../components/ui/PageWrapper';
import QuickActions from '../components/ui/QuickActions';

const GapAnalysisPage: React.FC = () => {
  const { goTo } = usePageNavigation('Gap Analysis');

  return (
    <PageWrapper currentPage="gap-analysis">
      <div className="card">
        {/* Quick Actions */}
        <QuickActions
          actions={[
            {
              label: 'Dashboard',
              icon: '🏠',
              onClick: () => goTo('/', LABEL_DASHBOARD, { 
                action: 'NAVIGATE_TO_DASHBOARD_FROM_GAP_ANALYSIS'
              })
            },
            {
              label: 'View Results',
              icon: '📊',
              onClick: () => goTo('/results', LABEL_RESULTS, { 
                action: 'NAVIGATE_TO_RESULTS_FROM_GAP_ANALYSIS'
              })
            },
            {
              label: 'Interactive Heatmap',
              icon: '🗺️',
              variant: 'primary',
              onClick: () => goTo('/heatmap', LABEL_HEATMAP, { 
                action: 'NAVIGATE_TO_HEATMAP_FROM_GAP_ANALYSIS'
              })
            },
            {
              label: 'Run Experiment',
              icon: '⚗️',
              variant: 'accent',
              onClick: () => goTo('/experiment', 'Experiment', { 
                action: 'NAVIGATE_TO_EXPERIMENT_FROM_GAP_ANALYSIS'
              })
            }
          ]}
          style={{ marginBottom: '20px' }}
        />

        {/* Gap Analysis Dashboard Content */}
        <GapAnalysisDashboard />
      </div>
    </PageWrapper>
  );
};

export default GapAnalysisPage;


