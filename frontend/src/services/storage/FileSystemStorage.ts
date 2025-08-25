import { StorageAdapter, ExperimentData, DocumentConfig } from './StorageAdapter';
import { experimentsApi, documentsApi } from '../api';

export class FileSystemStorage implements StorageAdapter {
  async saveExperiment(data: ExperimentData): Promise<{ success: boolean; filename?: string; message: string }> {
    // For local development, we don't directly save via this adapter
    // The backend handles saving when experiments are run
    return {
      success: true,
      message: 'Experiment will be saved by backend after completion'
    };
  }

  async loadExperiment(filename: string): Promise<{ success: boolean; message: string; count?: number; data?: any }> {
    // First, load the experiment into the backend
    const loadResponse = await experimentsApi.load(filename);
    if (!loadResponse.success) {
      return loadResponse;
    }
    
    // Then get the full data for comparison purposes
    const dataResponse = await experimentsApi.getData(filename);
    if (dataResponse.success && dataResponse.data) {
      return {
        success: true,
        message: loadResponse.message,
        count: loadResponse.count || dataResponse.data.metadata?.total_questions || 0,
        data: dataResponse.data
      };
    }
    
    // Return the load response if getData fails
    return loadResponse;
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

  async saveDocumentConfig(_config: DocumentConfig): Promise<{ success: boolean; message: string }> {
    try {
      // In local development, document configuration is managed by the backend
      // file system directly, so we don't need to explicitly save it here
      return {
        success: true,
        message: 'Document configuration managed by backend file system'
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
      // In local development, we get document configuration from the status API
      const response = await documentsApi.getStatus();
      if (response.success && response.data) {
        // Convert DocumentStatus to DocumentConfig format
        const config: DocumentConfig = {
          version: "1.0",
          last_updated: response.data.last_updated || new Date().toISOString(),
          documents: {},
          settings: {
            auto_ingest_new: true,
            retain_deselected: true
          }
        };
        
        // Convert documents to config format
        response.data.documents.forEach((doc: any) => {
          config.documents[doc.filename] = {
            is_selected: doc.is_selected,
            is_ingested: doc.is_ingested,
            ingested_at: doc.ingested_at,
            hash: doc.hash,
            size_bytes: doc.size_bytes,
            modified: doc.modified,
            chunk_count: doc.chunk_count
          };
        });
        
        return {
          success: true,
          config,
          message: 'Document configuration derived from backend status'
        };
      } else {
        return {
          success: false,
          message: 'No document status available from backend'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to load document configuration: ${error}`
      };
    }
  }
}