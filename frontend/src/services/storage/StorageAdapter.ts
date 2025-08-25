import { ExperimentFile } from '../../types';

export interface ExperimentData {
  timestamp: string;
  config: {
    selected_groups: string[];
    top_k: number;
    similarity_threshold: number;
  };
  results: any;
  total_questions: number;
  sources: string[];
  selected_documents?: string[];  // Actual document filenames used in the experiment
  avg_quality_score: number;
}

export interface DocumentConfig {
  version: string;
  last_updated: string;
  documents: Record<string, {
    is_selected: boolean;
    is_ingested: boolean;
    ingested_at: string;
    hash: string;
    size_bytes: number;
    modified: string;
    chunk_count: number;
    auto_discovered?: boolean;
    discovery_source?: string;
  }>;
  settings: {
    auto_ingest_new: boolean;
    retain_deselected: boolean;
    auto_generated?: boolean;
    generation_timestamp?: string;
  };
}

export interface StorageAdapter {
  // Existing experiment management methods
  saveExperiment(data: ExperimentData): Promise<{ success: boolean; filename?: string; message: string }>;
  loadExperiment(filename: string): Promise<{ success: boolean; message: string; count?: number; data?: any }>;
  listExperiments(): Promise<{ success: boolean; experiments: ExperimentFile[] }>;
  deleteExperiment(filename: string): Promise<{ success: boolean; message: string }>;
  clearResults(): Promise<{ success: boolean; message: string }>;
  
  // Document configuration management methods
  saveDocumentConfig(config: DocumentConfig): Promise<{ success: boolean; message: string }>;
  loadDocumentConfig(): Promise<{ success: boolean; config?: DocumentConfig; message: string }>;
}