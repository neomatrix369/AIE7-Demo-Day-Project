import { useState, useEffect, useCallback } from 'react';
import { resultsApi, corpusApi } from '../services/api';
import { AnalysisResults as AnalysisResultsType, HeatmapConfig } from '../types';
import { logSuccess, logError, logInfo } from '../utils/logger';
import { useApiCall } from './useApiCall';

export interface UseHeatmapDataReturn {
  results: AnalysisResultsType | null;
  allChunks: Array<{chunk_id: string; doc_id: string; title: string; content: string}> | null;
  loading: boolean;
  error: any;
  heatmapConfig: HeatmapConfig;
  setHeatmapConfig: (config: HeatmapConfig) => void;
  refreshData: () => Promise<void>;
}

export const useHeatmapData = (): UseHeatmapDataReturn => {
  const { 
    data: results, 
    loading: resultsLoading, 
    error: resultsError, 
    execute: executeResults 
  } = useApiCall<AnalysisResultsType>();
  
  const { 
    data: allChunks, 
    loading: chunksLoading, 
    error: chunksError, 
    execute: executeChunks 
  } = useApiCall<{chunks: Array<{chunk_id: string; doc_id: string; title: string; content: string}>, total_count: number}>();

  const [heatmapConfig, setHeatmapConfig] = useState<HeatmapConfig>({
    perspective: 'chunks-to-questions',
    qualityFilter: 'all',
    showTooltips: true,
    pointSize: 'medium',
    colorIntensity: 1.0
  });

  const loadChunks = useCallback(async () => {
    logInfo('Loading all chunks for heatmap visualization', {
      component: 'Heatmap',
      action: 'CHUNKS_LOAD_START'
    });

    const chunksData = await executeChunks(
      () => corpusApi.getAllChunks(),
      {
        component: 'Heatmap',
        action: 'CHUNKS_LOAD',
        userMessage: 'Failed to load chunks for heatmap'
      }
    );

    if (chunksData) {
      logSuccess(`All chunks loaded: ${chunksData.total_count} chunks`, {
        component: 'Heatmap',
        action: 'CHUNKS_LOAD_SUCCESS',
        data: {
          total_chunks: chunksData.total_count
        }
      });
    }
  }, [executeChunks]);

  const loadResults = useCallback(async () => {
    logInfo('Loading analysis results for heatmap visualization', {
      component: 'Heatmap',
      action: 'RESULTS_LOAD_START'
    });

    const data = await executeResults(
      () => resultsApi.getAnalysis(),
      {
        component: 'Heatmap',
        action: 'RESULTS_LOAD',
        userMessage: 'Failed to load analysis results for heatmap'
      }
    );

    if (data) {
      logSuccess(`Heatmap data loaded: ${data.overall.total_questions} questions`, {
        component: 'Heatmap',
        action: 'RESULTS_LOAD_SUCCESS',
        data: {
          total_questions: data.overall.total_questions,
          avg_quality_score: data.overall.avg_quality_score
        }
      });
    }
  }, [executeResults]);

  const refreshData = useCallback(async () => {
    await Promise.all([loadChunks(), loadResults()]);
  }, [loadChunks, loadResults]);

  useEffect(() => {
    loadChunks();
  }, [loadChunks]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  return {
    results,
    allChunks: allChunks?.chunks || null,
    loading: resultsLoading || chunksLoading,
    error: resultsError || chunksError,
    heatmapConfig,
    setHeatmapConfig,
    refreshData
  };
};