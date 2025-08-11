import axios from 'axios';
import { CorpusStatus, QuestionGroup, ExperimentConfig, AnalysisResults } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const corpusApi = {
  getStatus: (): Promise<CorpusStatus> =>
    api.get('/corpus/status').then(res => res.data),
};

export const questionsApi = {
  getLLMQuestions: (): Promise<{ llm_questions: QuestionGroup }> =>
    api.get('/questions/llm').then(res => res.data),
  
  getRAGASQuestions: (): Promise<{ ragas_questions: QuestionGroup }> =>
    api.get('/questions/ragas').then(res => res.data),
};

export const experimentApi = {
  run: (config: ExperimentConfig) =>
    api.post('/experiment/run', config).then(res => res.data),
};

export const resultsApi = {
  getAnalysis: (): Promise<AnalysisResults> =>
    api.get('/results/analysis').then(res => res.data),
};