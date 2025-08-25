import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { ComparisonData } from '../types';
import { createStorageAdapter } from '../services/storage';

export const useComparisonData = () => {
  const router = useRouter();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);

  const loadComparisonData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNoData(false);
      
      // Check if we have experiment IDs from URL
      const { experimentA, experimentB } = router.query;
      
      if (!experimentA || !experimentB || typeof experimentA !== 'string' || typeof experimentB !== 'string') {
        setNoData(true);
        setLoading(false);
        return;
      }

      // Load actual experiment data for comparison
      const storageAdapter = createStorageAdapter();
      
      const [expAResponse, expBResponse] = await Promise.all([
        storageAdapter.loadExperiment(experimentA),
        storageAdapter.loadExperiment(experimentB)
      ]);
      
      // Get backend analysis data for both experiments for reliable calculations
      let expAAnalysis = null;
      let expBAnalysis = null;
      let expAGapAnalysis = null;
      let expBGapAnalysis = null;
      
      try {
        // Load experiment A and get its analysis data
        await fetch(`/api/experiments/load?filename=${experimentA}`, { method: 'POST' });
        const [analysisAResponse, gapAnalysisAResponse] = await Promise.all([
          fetch('/api/results/analysis'),
          fetch('/api/v1/analysis/gaps')
        ]);
        
        if (analysisAResponse.ok) {
          expAAnalysis = await analysisAResponse.json();
        }
        if (gapAnalysisAResponse.ok) {
          expAGapAnalysis = await gapAnalysisAResponse.json();
        }
        
        // Load experiment B and get its analysis data
        await fetch(`/api/experiments/load?filename=${experimentB}`, { method: 'POST' });
        const [analysisBResponse, gapAnalysisBResponse] = await Promise.all([
          fetch('/api/results/analysis'),
          fetch('/api/v1/analysis/gaps')
        ]);
        
        if (analysisBResponse.ok) {
          expBAnalysis = await analysisBResponse.json();
        }
        if (gapAnalysisBResponse.ok) {
          expBGapAnalysis = await gapAnalysisBResponse.json();
        }
      } catch (error) {
        console.warn('Failed to get backend analysis data:', error);
      }
      
      if (expAResponse.success && expBResponse.success) {
        // Transform actual experiment data to ComparisonData format
        const expA = expAResponse.data;
        const expB = expBResponse.data;
        
        const comparisonData: ComparisonData = {
          experimentA: {
            id: experimentA,
            name: expA.name || experimentA.replace('.json', ''),
            date: expA.metadata?.timestamp || new Date().toISOString(),
            time: new Date(expA.metadata?.timestamp || Date.now()).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            qualityScore: expA.metadata?.avg_quality_score || 0,
            status: getStatusFromQualityScore(expA.metadata?.avg_quality_score || 0),
            questionCount: expA.metadata?.total_questions || 0
          },
          experimentB: {
            id: experimentB,
            name: expB.name || experimentB.replace('.json', ''),
            date: expB.metadata?.timestamp || new Date().toISOString(),
            time: new Date(expB.metadata?.timestamp || Date.now()).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            qualityScore: expB.metadata?.avg_quality_score || 0,
            status: getStatusFromQualityScore(expB.metadata?.avg_quality_score || 0),
            questionCount: expB.metadata?.total_questions || 0
          },
          metrics: {
            overallQuality: { 
              before: expA.metadata?.avg_quality_score || 0, 
              after: expB.metadata?.avg_quality_score || 0 
            },
            successRate: { 
              before: calculateSuccessRate(expA), 
              after: calculateSuccessRate(expB) 
            },
            highQualityAnswers: { 
              before: countHighQualityAnswers(expA), 
              after: countHighQualityAnswers(expB) 
            },

            developingCoverage: { 
              before: countDevelopingCoverage(expA), 
              after: countDevelopingCoverage(expB) 
            },
            poorQuestions: { 
              before: countPoorQuestions(expA), 
              after: countPoorQuestions(expB) 
            },
            chunkCoverage: { 
              before: expAAnalysis?.overall?.chunk_coverage?.coverage_percentage || calculateChunkCoverage(expA), 
              after: expBAnalysis?.overall?.chunk_coverage?.coverage_percentage || calculateChunkCoverage(expB) 
            }
          },
          context: {
            questionsProcessed: {
              before: expA.metadata?.total_questions || 0,
              after: expB.metadata?.total_questions || 0
            },
            totalDocuments: {
              before: expA.inputs?.corpus?.total_documents || 0,
              after: expB.inputs?.corpus?.total_documents || 0
            },
            totalChunks: {
              before: expA.inputs?.corpus?.total_chunks || 0,
              after: expB.inputs?.corpus?.total_chunks || 0
            },
            embeddingModel: {
              before: expA.inputs?.embedding?.model || 'Unknown',
              after: expB.inputs?.embedding?.model || 'Unknown'
            },
            totalSize: {
              before: calculateTotalSize(expA),
              after: calculateTotalSize(expB)
            },
            avgDocLength: {
              before: calculateAvgDocLength(expA),
              after: calculateAvgDocLength(expB)
            },
            chunkSize: {
              before: expA.inputs?.corpus?.chunk_size || 0,
              after: expB.inputs?.corpus?.chunk_size || 0
            },
            chunkOverlap: {
              before: expA.inputs?.corpus?.chunk_overlap || 0,
              after: expB.inputs?.corpus?.chunk_overlap || 0
            },
            chunkingStrategy: {
              before: expA.inputs?.corpus?.chunking_strategy || 'Unknown',
              after: expB.inputs?.corpus?.chunking_strategy || 'Unknown'
            },
            similarityThreshold: {
              before: expA.inputs?.assessment?.similarity_threshold || 0,
              after: expB.inputs?.assessment?.similarity_threshold || 0
            },
            topKRetrieval: {
              before: expA.inputs?.assessment?.top_k_retrieval || 0,
              after: expB.inputs?.assessment?.top_k_retrieval || 0
            },
            retrievalMethod: {
              before: expA.inputs?.assessment?.retrieval_method || 'Unknown',
              after: expB.inputs?.assessment?.retrieval_method || 'Unknown'
            },
            embeddingDimension: {
              before: expA.inputs?.embedding?.dimension || 0,
              after: expB.inputs?.embedding?.dimension || 0
            },
            vectorDbType: {
              before: expA.inputs?.vector_db?.type || 'Unknown',
              after: expB.inputs?.vector_db?.type || 'Unknown'
            },
            vectorDbVersion: {
              before: expA.inputs?.vector_db?.version || 'Unknown',
              after: expB.inputs?.vector_db?.version || 'Unknown'
            }
          }
        };
        
        setData(comparisonData);
      } else {
        throw new Error('Failed to load one or both experiments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  }, [router.query]);

  useEffect(() => {
    loadComparisonData();
  }, [loadComparisonData]);

  const refreshData = () => {
    loadComparisonData();
  };

  return {
    data,
    loading,
    error,
    noData,
    refreshData
  };
};

// Helper functions to transform experiment data
const getStatusFromQualityScore = (score: number): string => {
  if (score >= 7.0) return 'GOOD';
  if (score >= 5.0) return 'DEVELOPING';
  return 'POOR';
};

const calculateSuccessRate = (experiment: any): number => {
  // Try to get from performance metrics first
  if (experiment.results?.performance?.success_rate_percent) {
    return experiment.results.performance.success_rate_percent;
  }
  
  // Calculate from question results if performance metrics not available
  if (experiment.question_results && Array.isArray(experiment.question_results)) {
    const totalQuestions = experiment.question_results.length;
    const successfulQuestions = experiment.question_results.filter((q: any) => {
      // Use quality_score if available, otherwise convert avg_similarity to quality score
      const qualityScore = q.quality_score || (q.avg_similarity ? q.avg_similarity * 10 : 0);
      return qualityScore >= 7.0;  // Consider questions with quality score >= 7.0 as successful
    }).length;
    
    if (totalQuestions > 0) {
      return Math.round((successfulQuestions / totalQuestions) * 100);
    }
  }
  
  return 0;
};

const countHighQualityAnswers = (experiment: any): number => {
  // Try to get from backend analysis API first (most reliable)
  if (experiment.results?.overall?.success_rate !== undefined) {
    const successRate = experiment.results.overall.success_rate;
    const totalQuestions = experiment.metadata?.total_questions || experiment.question_results?.length || 0;
    return Math.round((successRate / 100) * totalQuestions);
  }
  
  // Try to get from performance metrics (backend calculated)
  if (experiment.results?.performance?.success_rate_percent !== undefined) {
    const successRate = experiment.results.performance.success_rate_percent;
    const totalQuestions = experiment.metadata?.total_questions || experiment.question_results?.length || 0;
    return Math.round((successRate / 100) * totalQuestions);
  }
  
  // Fallback to frontend calculation only if no backend data available
  if (experiment.question_results && Array.isArray(experiment.question_results)) {
    return experiment.question_results.filter((q: any) => {
      const qualityScore = q.quality_score || (q.avg_similarity ? q.avg_similarity * 10 : 0);
      return qualityScore >= 7.0;
    }).length;
  }
  return 0;
};

const countDevelopingCoverage = (experiment: any, gapAnalysisData?: any): number => {
  // Try to get from backend gap analysis API first (most reliable)
  if (gapAnalysisData?.gapSummary?.developingQuestionsCount !== undefined) {
    return gapAnalysisData.gapSummary.developingQuestionsCount;
  }
  
  // Try to get from experiment results if available
  if (experiment.results?.gap_analysis?.developing_questions_count !== undefined) {
    return experiment.results.gap_analysis.developing_questions_count;
  }
  
  // Fallback to frontend calculation
  if (experiment.question_results && Array.isArray(experiment.question_results)) {
    return experiment.question_results.filter((q: any) => {
      const qualityScore = q.quality_score || (q.avg_similarity ? q.avg_similarity * 10 : 0);
      return qualityScore >= 5.0 && qualityScore < 7.0;  // Consider questions with quality score 5.0-6.9 as developing coverage
    }).length;
  }
  return 0;
};

const countPoorQuestions = (experiment: any, gapAnalysisData?: any): number => {
  // Try to get from backend gap analysis API first (most reliable)
  if (gapAnalysisData?.gapSummary?.poorQuestionsCount !== undefined) {
    return gapAnalysisData.gapSummary.poorQuestionsCount;
  }
  
  // Try to get from experiment results if available
  if (experiment.results?.gap_analysis?.poor_questions_count !== undefined) {
    return experiment.results.gap_analysis.poor_questions_count;
  }
  
  // Try to get from quality score metrics (if available)
  if (experiment.results?.quality_score_metrics?.quality_score_distribution?.poor) {
    return experiment.results.quality_score_metrics.quality_score_distribution.poor;
  }
  
  // Fallback to frontend calculation
  if (experiment.question_results && Array.isArray(experiment.question_results)) {
    return experiment.question_results.filter((q: any) => {
      const qualityScore = q.quality_score || (q.avg_similarity ? q.avg_similarity * 10 : 0);
      return qualityScore < 5.0;  // Consider questions with quality score < 5.0 as poor
    }).length;
  }
  return 0;
};

const calculateChunkCoverage = (experiment: any): number => {
  // First try to get chunk coverage from backend calculation
  if (experiment.results?.overall?.chunk_coverage?.coverage_percentage !== undefined) {
    return experiment.results.overall.chunk_coverage.coverage_percentage;
  }
  
  // Fallback to frontend calculation if backend data not available
  if (experiment.question_results && Array.isArray(experiment.question_results)) {
    const retrievedChunkIdentifiers = new Set();
    experiment.question_results.forEach((q: any) => {
      if (q.retrieved_docs && Array.isArray(q.retrieved_docs)) {
        q.retrieved_docs.forEach((doc: any) => {
          // Use a combination of doc_id and content as chunk identifier
          // since chunk_id might be empty
          const contentPreview = doc.content ? doc.content.substring(0, 50) : '';
          const chunkIdentifier = `${doc.doc_id || 'unknown'}_${contentPreview}`;
          retrievedChunkIdentifiers.add(chunkIdentifier);
        });
      }
    });
    
    const totalChunks = experiment.inputs?.corpus?.total_chunks || 0;
    if (totalChunks > 0) {
      return Math.round((retrievedChunkIdentifiers.size / totalChunks) * 100);
    }
  }
  return 0;
};

const calculateTotalSize = (experiment: any): string => {
  // Try to get from corpus info first (new format)
  if (experiment.inputs?.corpus?.file_size_bytes) {
    const bytes = experiment.inputs.corpus.file_size_bytes;
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${bytes} bytes`;
    }
  }
  
  // Try to get from corpus metadata (fallback)
  if (experiment.inputs?.corpus?.total_size_mb) {
    return `${experiment.inputs.corpus.total_size_mb.toFixed(1)} MB`;
  }
  
  // Calculate approximate size based on document count and chunks
  const totalDocs = experiment.inputs?.corpus?.total_documents || 0;
  const totalChunks = experiment.inputs?.corpus?.total_chunks || 0;
  
  if (totalDocs > 0 && totalChunks > 0) {
    // Estimate: assume average document is ~2KB and average chunk is ~500 chars
    const estimatedSize = Math.round((totalDocs * 2000) + (totalChunks * 500));
    return `${estimatedSize.toLocaleString()} bytes (estimated)`;
  }
  
  return 'Not available';
};

const calculateAvgDocLength = (experiment: any): string => {
  // Try to get from corpus info first (new format)
  if (experiment.inputs?.corpus?.avg_document_length) {
    return `${experiment.inputs.corpus.avg_document_length.toLocaleString()} characters`;
  }
  
  // Calculate approximate length based on chunks and documents
  const totalDocs = experiment.inputs?.corpus?.total_documents || 0;
  const totalChunks = experiment.inputs?.corpus?.total_chunks || 0;
  const chunkSize = experiment.inputs?.corpus?.chunk_size || 750;
  
  if (totalDocs > 0 && totalChunks > 0) {
    // Estimate: average document length based on chunks and chunk size
    const avgLength = Math.round((totalChunks * chunkSize) / totalDocs);
    return `${avgLength.toLocaleString()} characters (estimated)`;
  }
  
  return 'Not available';
};
