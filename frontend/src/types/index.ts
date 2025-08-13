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
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
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
  similarity: number;
  status: 'good' | 'weak' | 'poor';
  retrieved_docs: Array<{
    doc_id: string;
    similarity: number;
    title: string;
  }>;
}

export interface AnalysisResults {
  overall: {
    avg_similarity: number;
    success_rate: number;
    total_questions: number;
    corpus_health: string;
    key_insight: string;
  };
  per_group: {
    llm: {
      avg_score: number;
      distribution: number[];
    };
    ragas: {
      avg_score: number;
      distribution: number[];
    };
  };
  per_question: QuestionResult[];
}

export interface ExperimentFile {
  filename: string;
  timestamp: string;
  total_questions: number;
  sources: string[];
  avg_similarity: number;
  file_size: number;
}