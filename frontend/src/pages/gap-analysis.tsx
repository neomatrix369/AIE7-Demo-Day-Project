import React, { useCallback } from 'react';
import { useRouter } from 'next/router';
import usePageNavigation from '../hooks/usePageNavigation';
import { LABEL_RESULTS, LABEL_HEATMAP, LABEL_DASHBOARD } from '../utils/constants';
import GapAnalysisDashboard from '../components/gap-analysis/GapAnalysisDashboard';
import PageWrapper from '../components/ui/PageWrapper';
import QuickActions from '../components/ui/QuickActions';
import { experimentsApi } from '../services/api';
import { logInfo, logError, logSuccess } from '../utils/logger';

const GapAnalysisPage: React.FC = () => {
  const { goTo } = usePageNavigation('Gap Analysis');
  const router = useRouter();

  // Get experiment filename from query parameter
  const experimentFilename = router.query.experiment as string;

  // Load specific experiment if provided in URL
  const loadSpecificExperiment = useCallback(async () => {
    if (experimentFilename && experimentFilename !== 'undefined') {
      try {
        logInfo(`Loading experiment for gap analysis: ${experimentFilename}`, {
          component: 'GapAnalysis',
          action: 'LOAD_SPECIFIC_EXPERIMENT',
          data: { experiment_filename: experimentFilename }
        });
        
        await experimentsApi.load(experimentFilename);
        
        logSuccess(`Experiment loaded for gap analysis: ${experimentFilename}`, {
          component: 'GapAnalysis',
          action: 'EXPERIMENT_LOADED',
          data: { experiment_filename: experimentFilename }
        });
      } catch (error: any) {
        logError(`Failed to load experiment for gap analysis ${experimentFilename}: ${error?.message || 'Unknown error'}`, {
          component: 'GapAnalysis',
          action: 'LOAD_EXPERIMENT_ERROR',
          data: { experiment_filename: experimentFilename, error: error?.message }
        });
        // Continue with current results if loading fails
      }
    }
  }, [experimentFilename]);

  // Load experiment when component mounts or experiment changes
  React.useEffect(() => {
    loadSpecificExperiment();
  }, [loadSpecificExperiment]);

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


