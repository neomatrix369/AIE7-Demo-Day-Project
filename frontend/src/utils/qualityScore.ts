import { getStatusColor as getCorpusStatusColor } from './statusColors';

export type QualityStatus = 'good' | 'weak' | 'poor';

export function getStatus(score: number): QualityStatus {
  if (score >= 7.0) return 'good';
  if (score >= 5.0) return 'weak';
  return 'poor';
}

export function getStatusColor(score: number): string {
  const status = getStatus(score);
  // Map quality status to corpus health status for consistent colors
  const statusMap: Record<QualityStatus, string> = {
    'good': 'EXCELLENT',    // Good quality = Excellent status
    'weak': 'NEEDS WORK',   // Weak quality = Needs Work status  
    'poor': 'POOR'          // Poor quality = Poor status
  };
  
  const corpusStatus = statusMap[status];
  return getCorpusStatusColor(corpusStatus);
}

export function formatScore(score: number | undefined, digits: number = 1): string {
  const value = typeof score === 'number' ? score : 0;
  return value.toFixed(digits);
}


