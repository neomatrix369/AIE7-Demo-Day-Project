export interface CorpusStatus {
  corpus_loaded: boolean;
  document_count: number;
  chunk_count: number;
  embedding_model: string;
  corpus_metadata: {
    total_size_mb: number;
    document_types: { [key: string]: number };
    avg_doc_length: number;
  };
}

export interface Question {
  text: string;
  focus: string;
}

export interface QuestionCategory {
  role_id: string;
  role: string;
  emoji: string;
  description: string;
  questions: Question[];
}

export type QuestionGroup = QuestionCategory[];

export interface ExperimentConfig {
  selected_groups: string[];
  top_k: number;
  similarity_threshold: number;
}

export interface QuestionResult {
  id: string;
  text: string;
  source: string;
  role_name?: string;
  quality_score: number;
  status: 'good' | 'weak' | 'poor';
  retrieved_docs: Array<{
    doc_id: string;
    chunk_id?: string;
    similarity: number;
    title: string;
  }>;
}

export interface AnalysisResults {
  overall: {
    avg_quality_score: number;
    success_rate: number;
    total_questions: number;
    corpus_health: string;
    key_insight: string;
  };
  per_group: {
    [group_name: string]: {
      avg_quality_score: number;
      distribution: number[];
      roles: {
        [role_name: string]: {
          avg_quality_score: number;
          distribution: number[];
        };
      };
    };
  };
  per_question: QuestionResult[];
}

export interface ExperimentFile {
  filename: string;
  timestamp: string;
  total_questions: number;
  sources: string[];
  avg_quality_score: number;
  file_size: number;
}

// Heatmap-specific interfaces
export type HeatmapPerspective = 'questions-to-chunks' | 'chunks-to-questions' | 'roles-to-chunks' | 'chunks-to-roles';

export interface HeatmapConfig {
  perspective: HeatmapPerspective;
  qualityFilter: 'all' | 'good' | 'weak' | 'poor';
  showTooltips: boolean;
  pointSize: 'small' | 'medium' | 'large';
  colorIntensity: number; // 0.5 - 1.5 multiplier
}

export interface HeatmapDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface TooltipPosition {
  x: number;
  y: number;
  visible: boolean;
}