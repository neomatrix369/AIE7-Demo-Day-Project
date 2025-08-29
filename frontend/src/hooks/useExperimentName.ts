import { useState, useCallback } from 'react';
import { experimentsApi } from '../services/api';
import { logInfo, logError, logSuccess } from '../utils/logger';

export const useExperimentName = (componentName: string) => {
  const [experimentName, setExperimentName] = useState<string | null>(null);

  const loadExperimentName = useCallback(async (experimentFilename: string) => {
    if (!experimentFilename || experimentFilename === 'undefined') {
      return;
    }

    try {
      logInfo(`Loading experiment: ${experimentFilename}`, {
        component: componentName,
        action: 'LOAD_SPECIFIC_EXPERIMENT',
        data: { experiment_filename: experimentFilename }
      });
      
      await experimentsApi.load(experimentFilename);
      
      // Get experiment metadata to fetch the actual name
      const experimentsResponse = await experimentsApi.list();
      if (experimentsResponse.success) {
        const experiment = experimentsResponse.experiments.find(exp => exp.filename === experimentFilename);
        if (experiment) {
          setExperimentName(experiment.name);
        }
      }
      
      logSuccess(`Experiment loaded: ${experimentFilename}`, {
        component: componentName,
        action: 'EXPERIMENT_LOADED',
        data: { experiment_filename: experimentFilename }
      });
    } catch (error: any) {
      logError(`Failed to load experiment ${experimentFilename}: ${error?.message || 'Unknown error'}`, {
        component: componentName,
        action: 'LOAD_EXPERIMENT_ERROR',
        data: { experiment_filename: experimentFilename, error: error?.message }
      });
      // Continue with current results if loading fails
    }
  }, [componentName]);

  return { experimentName, loadExperimentName };
};