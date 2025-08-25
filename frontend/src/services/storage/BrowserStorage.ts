import { StorageAdapter, ExperimentData, DocumentConfig } from './StorageAdapter';
import { ExperimentFile } from '../../types';

const STORAGE_PREFIX = 'ragcheck_experiment_';
const METADATA_KEY = 'ragcheck_experiments_metadata';
const DOCUMENT_CONFIG_KEY = 'ragcheck_document_config';

export class BrowserStorage implements StorageAdapter {
  async saveExperiment(data: ExperimentData): Promise<{ success: boolean; filename?: string; message: string }> {
    try {
      const filename = `experiment_${data.timestamp.replace(/[:\s]/g, '_')}.json`;
      const storageKey = STORAGE_PREFIX + filename;
      
      // Save experiment data
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      // Update metadata for listing
      const metadata = this.getMetadata();
      const experimentFile: ExperimentFile = {
        filename,
        name: filename.replace(/^experiment_/, '').replace(/\.json$/, '').replace(/_/g, ' '),
        timestamp: data.timestamp,
        total_questions: data.total_questions,
        sources: data.sources,
        selected_documents: data.selected_documents || [],
        avg_quality_score: data.avg_quality_score,
        file_size: JSON.stringify(data).length,
        // Extract timing information if available
        start_time: data.results?.start_time,
        end_time: data.results?.end_time,
        duration_seconds: data.results?.processing_time_seconds
      };
      
      metadata[filename] = experimentFile;
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      
      return {
        success: true,
        filename,
        message: `Experiment saved to browser storage as ${filename}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to save experiment: ${error}`
      };
    }
  }

  async loadExperiment(filename: string): Promise<{ success: boolean; message: string; count?: number; data?: any }> {
    try {
      const storageKey = STORAGE_PREFIX + filename;
      const dataStr = localStorage.getItem(storageKey);
      
      if (!dataStr) {
        return {
          success: false,
          message: `Experiment ${filename} not found in browser storage`
        };
      }
      
      const data = JSON.parse(dataStr);
      
      // In browser mode, we'll store the loaded experiment in a special key
      // for the results page to access
      localStorage.setItem('ragcheck_current_results', JSON.stringify(data.results));
      
      return {
        success: true,
        message: `Loaded experiment ${filename} from browser storage`,
        count: data.total_questions,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to load experiment: ${error}`
      };
    }
  }

  async listExperiments(): Promise<{ success: boolean; experiments: ExperimentFile[] }> {
    try {
      const metadata = this.getMetadata();
      const experiments = Object.values(metadata);
      
      return {
        success: true,
        experiments
      };
    } catch (error) {
      return {
        success: true,
        experiments: []
      };
    }
  }

  async deleteExperiment(filename: string): Promise<{ success: boolean; message: string }> {
    try {
      const storageKey = STORAGE_PREFIX + filename;
      localStorage.removeItem(storageKey);
      
      // Update metadata
      const metadata = this.getMetadata();
      delete metadata[filename];
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      
      return {
        success: true,
        message: `Deleted experiment ${filename} from browser storage`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete experiment: ${error}`
      };
    }
  }

  async clearResults(): Promise<{ success: boolean; message: string }> {
    try {
      localStorage.removeItem('ragcheck_current_results');
      return {
        success: true,
        message: 'Cleared current results from browser storage'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear results: ${error}`
      };
    }
  }

  async saveDocumentConfig(config: DocumentConfig): Promise<{ success: boolean; message: string }> {
    try {
      config.last_updated = new Date().toISOString();
      localStorage.setItem(DOCUMENT_CONFIG_KEY, JSON.stringify(config));
      return {
        success: true,
        message: 'Document configuration saved to browser storage'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to save document configuration: ${error}`
      };
    }
  }

  async loadDocumentConfig(): Promise<{ success: boolean; config?: DocumentConfig; message: string }> {
    try {
      const configStr = localStorage.getItem(DOCUMENT_CONFIG_KEY);
      
      if (!configStr) {
        return {
          success: false,
          message: 'No document configuration found in browser storage'
        };
      }
      
      const config = JSON.parse(configStr);
      
      return {
        success: true,
        config,
        message: 'Document configuration loaded from browser storage'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to load document configuration: ${error}`
      };
    }
  }

  private getMetadata(): Record<string, ExperimentFile> {
    try {
      const metadataStr = localStorage.getItem(METADATA_KEY);
      return metadataStr ? JSON.parse(metadataStr) : {};
    } catch {
      return {};
    }
  }
}