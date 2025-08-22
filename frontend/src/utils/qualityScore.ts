export type QualityStatus = 'good' | 'weak' | 'poor';

export function getStatus(score: number): QualityStatus {
  if (score >= 7.0) return 'good';
  if (score >= 5.0) return 'weak';
  return 'poor';
}

export function getStatusColor(score: number): string {
  const status = getStatus(score);
  if (status === 'good') return '#28a745';
  if (status === 'weak') return '#e67e22';
  return '#dc3545';
}

export function formatScore(score: number | undefined, digits: number = 1): string {
  const value = typeof score === 'number' ? score : 0;
  return value.toFixed(digits);
}


