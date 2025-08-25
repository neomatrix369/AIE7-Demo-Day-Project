import { getStatusColor as getCorpusStatusColor } from './statusColors';

export type QualityStatus = 'good' | 'developing' | 'poor';

export function getStatus(score: number): QualityStatus {
  if (score >= 7.0) return 'good';
  if (score >= 5.0) return 'developing';
  return 'poor';
}

export function getStatusColor(score: number): string {
  const status = getStatus(score);
  // Map quality status to colors
  const statusMap: Record<QualityStatus, string> = {
    'good': '#28a745',    // Green for good
    'developing': '#ffc107',    // Yellow for developing
    'poor': '#dc3545'     // Red for poor
  };
  
  return statusMap[status];
}

export function formatScore(score: number | undefined, digits: number = 1): string {
  const value = typeof score === 'number' ? score : 0;
  return value.toFixed(digits);
}


