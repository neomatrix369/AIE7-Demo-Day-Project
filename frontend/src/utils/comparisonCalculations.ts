import { ComparisonData } from '../types';
import { getStatusColor } from './statusColors';

export const calculateImprovement = (before: number, after: number): number => {
  if (before === 0) return after > 0 ? 100 : 0;
  return Math.round(((after - before) / before) * 100);
};

export const formatImprovement = (before: number, after: number): string => {
  const improvement = calculateImprovement(before, after);
  const sign = improvement >= 0 ? '+' : '';
  return `${sign}${improvement}%`;
};

// Re-export the status color function for backward compatibility
export { getStatusColor };

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

export const getOverallImprovement = (data: ComparisonData): { text: string; theme: 'positive' | 'negative' | 'neutral'; narrative: string } => {
  const qualityChange = data.metrics.overallQuality.after - data.metrics.overallQuality.before;
  const successChange = data.metrics.successRate.after - data.metrics.successRate.before;
  
  const text = `Quality Score: ${qualityChange >= 0 ? '+' : ''}${qualityChange.toFixed(1)}\nSuccess Rate: ${successChange >= 0 ? '+' : ''}${successChange.toFixed(1)}%`;
  
  // Determine theme and narrative based on overall performance
  if (qualityChange > 0 || successChange > 0) {
    let narrative = 'Performance Improvement';
    if (qualityChange > 0 && successChange > 0) {
      narrative = 'Overall Improvement';
    } else if (qualityChange > 0) {
      narrative = 'Quality Improvement';
    } else if (successChange > 0) {
      narrative = 'Success Rate Improvement';
    }
    return { text, theme: 'positive', narrative };
  } else if (qualityChange < 0 || successChange < 0) {
    let narrative = 'Performance Decline';
    if (qualityChange < 0 && successChange < 0) {
      narrative = 'Overall Decline';
    } else if (qualityChange < 0) {
      narrative = 'Quality Decline';
    } else if (successChange < 0) {
      narrative = 'Success Rate Decline';
    }
    return { text, theme: 'negative', narrative };
  } else {
    return { text, theme: 'neutral', narrative: 'No Performance Change' };
  }
};
