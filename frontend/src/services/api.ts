import axios from 'axios';
import { CorpusStatus, QuestionGroup, ExperimentConfig, AnalysisResults, GapAnalysis } from '../types';
import { logApiRequest, logApiResponse, logApiError } from '../utils/logger';

// Normalize the base URL to handle trailing slashes properly
const normalizeBaseUrl = (url: string): string => {
  return url.replace(/\/+$/, ''); // Remove trailing slashes
};

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL 
  ? normalizeBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL) + '/api'
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for slow corpus loading
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    
    logApiRequest(method, url, {
      component: 'HTTP Client'
    });
    
    // Add timestamp to track request duration
    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => {
    logApiError('REQUEST', 'unknown', error, {
      component: 'HTTP Client'
    });
    return Promise.reject(error);
  }
);

// Response interceptor for logging
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase() || 'GET';
    const url = response.config.url || '';
    const status = response.status;
    const startTime = response.config.metadata?.startTime || Date.now();
    const duration = Date.now() - startTime;
    
    logApiResponse(method, url, status, duration, {
      component: 'HTTP Client',
      data: { 
        responseSize: JSON.stringify(response.data).length + ' bytes',
        status: status
      }
    });
    
    return response;
  },
  (error) => {
    const method = error.config?.method?.toUpperCase() || 'GET';
    const url = error.config?.url || 'unknown';
    const startTime = error.config?.metadata?.startTime || Date.now();
    const duration = Date.now() - startTime;
    
    // Enhanced error context for debugging
    const errorContext = {
      component: 'HTTP Client',
      data: {
        status: error.response?.status,
        statusText: error.response?.statusText,
        duration: duration + 'ms',
        message: error.message
      }
    };
    
    logApiError(method, url, error, errorContext);
    return Promise.reject(error);
  }
);

export const corpusApi = {
  getStatus: (): Promise<CorpusStatus> =>
    api.get('/corpus/status').then(res => res.data),
  
  getAllChunks: (): Promise<{chunks: Array<{
    chunk_id: string;
    doc_id: string;
    title: string;
    content: string;
  }>, total_count: number}> =>
    api.get('/corpus/chunks').then(res => res.data),
};

export const questionsApi = {
  getLLMQuestions: (): Promise<QuestionGroup> =>
    api.get('/questions/llm').then(res => res.data),
  
  getRAGASQuestions: (): Promise<QuestionGroup> =>
    api.get('/questions/ragas').then(res => res.data),
};

export const experimentApi = {
  run: (config: ExperimentConfig) =>
    api.post('/experiment/run', config).then(res => res.data),
  getExperimentConfig: (): Promise<{
    chunk_strategy: Record<string, string>;
    retrieval_method: Record<string, string>;
    chunk_size: number;
    chunk_overlap: number;
  }> =>
    api.get('/v1/experiment/config').then(res => res.data),
};

export const resultsApi = {
  getAnalysis: (): Promise<AnalysisResults> =>
    api.get('/results/analysis').then(res => {
      const data = res.data;
      // Transform old field names to new ones for backwards compatibility
      return {
        ...data,
        overall: {
          ...data.overall,
          avg_quality_score: data.overall.avg_quality_score || data.overall.avg_similarity,
        },
        per_group: Object.fromEntries(
          Object.entries(data.per_group).map(([groupName, groupData]: [string, any]) => [
            groupName,
            {
              ...groupData,
              avg_quality_score: groupData.avg_quality_score || groupData.avg_score,
              roles: groupData.roles || {},
            }
          ])
        ),
        per_question: data.per_question.map((question: any) => ({
          ...question,
          quality_score: question.quality_score || question.similarity,
          role_name: question.role_name,
        })),
      };
    }),
  
  clearResults: (): Promise<{success: boolean, message: string}> =>
    api.post('/results/clear').then(res => res.data),
  
  getGapAnalysis: (): Promise<GapAnalysis> =>
    api.get('/v1/analysis/gaps').then(res => res.data),
};

export const experimentsApi = {
  list: (): Promise<{success: boolean, experiments: Array<{
    filename: string;
    name: string;
    timestamp: string;
    total_questions: number;
    sources: string[];
    selected_documents?: string[];
    avg_quality_score: number;
    file_size: number;
    start_time?: string;
    end_time?: string;
    duration_seconds?: number;
  }>}> =>
    api.get('/experiments/list').then(res => {
      const data = res.data;
      return {
        ...data,
        experiments: data.experiments.map((exp: any) => ({
          ...exp,
          selected_documents: exp.selected_documents || [],
          avg_quality_score: exp.avg_quality_score || exp.avg_similarity,
        })),
      };
    }),
  
  load: (filename: string): Promise<{success: boolean, message: string, count?: number}> =>
    api.post('/experiments/load', null, { params: { filename } }).then(res => res.data),
  
  getData: (filename: string): Promise<{success: boolean, message: string, data?: any}> =>
    api.get(`/experiments/data/${filename}`).then(res => res.data),
  
  delete: (filename: string): Promise<{success: boolean, message: string}> =>
    api.delete('/experiments/delete', { params: { filename } }).then(res => res.data),
};

export const documentsApi = {
  getStatus: (): Promise<{success: boolean, data: any}> =>
    api.get('/documents/status').then(res => res.data),
  
  uploadDocument: (file: File): Promise<{success: boolean, message: string, filename?: string, size_bytes?: number}> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },
  
  deleteDocument: (filename: string): Promise<{success: boolean, message: string}> =>
    api.post(`/documents/delete/${filename}`).then(res => res.data),
  
  selectDocument: (filename: string): Promise<{success: boolean, message: string}> =>
    api.post(`/documents/select/${filename}`).then(res => res.data),
  
  deselectDocument: (filename: string): Promise<{success: boolean, message: string}> =>
    api.post(`/documents/deselect/${filename}`).then(res => res.data),
  
  ingestDocument: (filename: string): Promise<{success: boolean, message: string}> =>
    api.post(`/documents/ingest/${filename}`).then(res => res.data),
  
  ingestPending: (): Promise<{success: boolean, message: string}> =>
    api.post('/documents/ingest-pending').then(res => res.data),
  
  reingestChanged: (): Promise<{success: boolean, message: string}> =>
    api.post('/documents/reingest-changed').then(res => res.data),
  
  scanDocuments: (): Promise<{success: boolean, data: any, message: string}> =>
    api.post('/documents/scan').then(res => res.data),
  
  rebuildCollection: (): Promise<{success: boolean, message: string}> =>
    api.post('/documents/rebuild').then(res => res.data),
  
  searchDocuments: (query: string, limit: number = 10, filterSelected: boolean = true): Promise<{success: boolean, data: any, count: number}> =>
    api.get('/documents/search', { params: { query, limit, filter_selected: filterSelected } }).then(res => res.data),
  
  // Note: Document config APIs removed - now handled by unified storage adapter system
    
  getEnvironmentInfo: (): Promise<{success: boolean, environment: any}> =>
    api.get('/environment').then(res => res.data),
};