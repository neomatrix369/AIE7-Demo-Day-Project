import axios from 'axios';
import { CorpusStatus, QuestionGroup, ExperimentConfig, AnalysisResults } from '../types';
import { logApiRequest, logApiResponse, logApiError } from '../utils/logger';

const API_BASE_URL = '/api';

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
};

export const resultsApi = {
  getAnalysis: (): Promise<AnalysisResults> =>
    api.get('/results/analysis').then(res => res.data),
  
  clearResults: (): Promise<{success: boolean, message: string}> =>
    api.post('/results/clear').then(res => res.data),
};