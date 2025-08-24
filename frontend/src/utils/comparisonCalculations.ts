import { ComparisonData } from '../types';

export const calculateImprovement = (before: number, after: number): number => {
  if (before === 0) return after > 0 ? 100 : 0;
  return Math.round(((after - before) / before) * 100);
};

export const formatImprovement = (before: number, after: number): string => {
  const improvement = calculateImprovement(before, after);
  const sign = improvement >= 0 ? '+' : '';
  return `${sign}${improvement}%`;
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'excellent':
      return '#28a745';
    case 'good':
      return '#17a2b8';
    case 'needs work':
    case 'needs_work':
      return '#ffc107';
    case 'poor':
      return '#dc3545';
    default:
      return '#6c757d';
  }
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (timeString: string): string => {
  const time = new Date(timeString);
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getOverallImprovement = (data: ComparisonData): number => {
  const qualityImprovement = calculateImprovement(
    data.metrics.overallQuality.before,
    data.metrics.overallQuality.after
  );
  const successImprovement = calculateImprovement(
    data.metrics.successRate.before,
    data.metrics.successRate.after
  );
  
  return Math.round((qualityImprovement + successImprovement) / 2);
};
