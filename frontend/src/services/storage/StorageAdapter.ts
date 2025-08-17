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
  avg_quality_score: number;
}

export interface StorageAdapter {
  saveExperiment(data: ExperimentData): Promise<{ success: boolean; filename?: string; message: string }>;
  loadExperiment(filename: string): Promise<{ success: boolean; message: string; count?: number }>;
  listExperiments(): Promise<{ success: boolean; experiments: ExperimentFile[] }>;
  deleteExperiment(filename: string): Promise<{ success: boolean; message: string }>;
  clearResults(): Promise<{ success: boolean; message: string }>;
}