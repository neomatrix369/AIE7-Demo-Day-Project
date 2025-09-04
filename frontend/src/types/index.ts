export interface CorpusStatus {
  corpus_loaded: boolean;
  document_count: number;
  chunk_count: number;
  embedding_model: string;
  corpus_metadata: {
    total_size_mb: number;
    document_types: { [key: string]: number };
    avg_doc_length: number;
    selected_by_type?: { [key: string]: number };
    deselected_by_type?: { [key: string]: number };
    // Error information (optional, for error states)
    error?: string;
    message?: string;
    database_connected?: boolean;
    database_error?: string;
  };
  // Selection-aware statistics (optional, added by enhanced document processor)
  selected_chunks?: number;
  deselected_chunks?: number;
  // Error status fields (optional, for error states)
  status?: 'error' | 'success' | 'partial';
  error_message?: string;
  database_connected?: boolean;
  database_error?: string;
  documents_loaded?: boolean;
  documents_tracked?: boolean;
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
  status: 'good' | 'developing' | 'poor';
  retrieved_docs: Array<{
    doc_id: string;
    chunk_id?: string;
    content: string;
    similarity: number;
    title: string;
  }>;
}

export interface AnalysisResults {
  overall: {
    avg_quality_score: number;
    success_rate: number;
    total_questions: number;

    key_insight: string;
    chunk_coverage?: {
      total_chunks: number;
      retrieved_chunks: number;
      unretrieved_chunks: number;
      coverage_percentage: number;
      unretrieved_percentage: number;
      total_retrieved_docs: number;
    };
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
  experiment_metadata?: {
    selected_documents_count: number;
    selected_documents: string[];
    total_selected_chunks: number;
  };
}

export interface ExperimentFile {
  filename: string;
  name: string;
  timestamp: string;
  total_questions: number;
  sources: string[];
  selected_documents?: string[];  // Actual document filenames used in the experiment
  avg_quality_score: number;
  file_size: number;
  // Timing information (optional, for experiments with timing data)
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
}

// Heatmap-specific interfaces
export type HeatmapPerspective = 'documents-to-chunks' | 'chunks-to-questions' | 'roles-to-chunks';

export interface HeatmapConfig {
  perspective: HeatmapPerspective;
  qualityFilter: 'all' | 'good' | 'developing' | 'poor';
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

// Gap Analysis and Recommendations interfaces
export interface ContentGap {
  topic: string;
  avgScore: number;
  queryCount: number;
  affectedQueries: string[];
  gapType: 'coverage' | 'quality' | 'retrieval';
}

export interface RecommendationCard {
  id: string;
  gapDescription: string;
  suggestedContent: string;
  improvementStrategies?: string[]; // Array of practical improvement strategies
  expectedImprovement: number; // 0-10 scale
  priorityLevel: 'High' | 'Medium' | 'Low';
  priorityScore: number; // impact * (1/effort)
  affectedQueries: string[];
  implementationEffort: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  category: 'content_addition' | 'content_improvement' | 'retrieval_optimization' | 'role_improvement' | 'quality_boost';
}

export interface GapAnalysis {
  lowScoreQueries: QuestionResult[];
  uncoveredTopics: string[];
  developingCoverageAreas: ContentGap[];
  recommendations: RecommendationCard[];
  gapSummary: {
    totalGaps: number;
    criticalGaps: number;
    avgGapScore: number;
    improvementPotential: number;
    gapPercentage: number;
    totalQuestions: number;
    belowGoodCount: number;
    belowGoodPercentage: number;
    goodCount: number;
    developingCount: number;
    poorCount: number;
    developingQuestionsCount: number;
    poorQuestionsCount: number;
  };
}

export interface ComparisonData {
  experimentA: {
    id: string; name: string; date: string; time: string; qualityScore: number; status: string; questionCount: number;
  };
  experimentB: {
    id: string; name: string; date: string; time: string; qualityScore: number; status: string; questionCount: number;
  };
  metrics: {
    overallQuality: { before: number; after: number; }; successRate: { before: number; after: number; }; highQualityAnswers: { before: number; after: number; }; developingCoverage: { before: number; after: number; }; poorQuestions: { before: number; after: number; }; chunkCoverage: { before: number; after: number; };
  };
  context: {
    questionsProcessed: { before: number; after: number; };
    totalDocuments: { before: number; after: number; };
    totalChunks: { before: number; after: number; };
    embeddingModel: { before: string; after: string; };
    totalSize: { before: string; after: string; };
    avgDocLength: { before: string; after: string; };
    chunkSize: { before: number; after: number; };
    chunkOverlap: { before: number; after: number; };
    chunkingStrategy: { before: string; after: string; };
    similarityThreshold: { before: number; after: number; };
    topKRetrieval: { before: number; after: number; };
    retrievalMethod: { before: string; after: string; };
    embeddingDimension: { before: number; after: number; };
    vectorDbType: { before: string; after: string; };
    vectorDbVersion: { before: string; after: string; };
  };
}

export interface MetricRowProps {
  label: string;
  before: number | string;
  after: number | string;
  improvement?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  isLast?: boolean;
}

export interface DocumentInfo {
  filename: string;
  full_path: string;
  file_type: string;
  size_bytes: number;
  modified: string;
  hash: string;
  is_selected: boolean;
  is_ingested: boolean;
  ingested_at: string;
  chunk_count: number;
  has_changed: boolean;
}

export interface DocumentSelectionSummary {
  total_documents: number;
  selected_documents: number;
  deselected_documents: number;
  ingested_documents: number;
  needing_ingestion: number;
  needing_reingestion: number;
  last_updated: string;
}

export interface QdrantStatistics {
  total_chunks: number;
  selected_chunks: number;
  deselected_chunks: number;
  document_sources: Record<string, { total: number; selected: number }>;
  collection_name: string;
}

export interface DocumentStatus {
  selection_summary: DocumentSelectionSummary;
  qdrant_statistics: QdrantStatistics;
  documents: DocumentInfo[];
  last_updated: string;
}

export interface SearchResult {
  id: string;
  score: number;
  content: string;
  metadata: any;
  document_source: string;
  chunk_id: string;
}