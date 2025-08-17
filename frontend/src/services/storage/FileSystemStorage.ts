import { StorageAdapter, ExperimentData } from './StorageAdapter';
import { experimentsApi } from '../api';

export class FileSystemStorage implements StorageAdapter {
  async saveExperiment(data: ExperimentData): Promise<{ success: boolean; filename?: string; message: string }> {
    // For local development, we don't directly save via this adapter
    // The backend handles saving when experiments are run
    return {
      success: true,
      message: 'Experiment will be saved by backend after completion'
    };
  }

  async loadExperiment(filename: string): Promise<{ success: boolean; message: string; count?: number }> {
    return experimentsApi.load(filename);
  }

  async listExperiments() {
    return experimentsApi.list();
  }

  async deleteExperiment(filename: string): Promise<{ success: boolean; message: string }> {
    return experimentsApi.delete(filename);
  }

  async clearResults(): Promise<{ success: boolean; message: string }> {
    // Import here to avoid circular dependency
    const { resultsApi } = await import('../api');
    return resultsApi.clearResults();
  }
}