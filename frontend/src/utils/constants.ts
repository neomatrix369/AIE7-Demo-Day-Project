// General app-wide constants and small literals

// Cache
export const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const DEFAULT_CACHE_MAX_SIZE = 20;

// Labels
export const LABEL_HEATMAP = 'Heatmap';
export const LABEL_DASHBOARD = 'Dashboard';
export const LABEL_RESULTS = 'Analysis Results';

// UI
export const DEFAULT_BUTTON_VARIANT_SECONDARY = 'button button-secondary';

// Feature flags
export const SHOW_RULE_BASED_BADGE = true;

// Text utilities
export const convertMarkdownBold = (text: string): string => {
  // Convert **text** to <strong>text</strong>
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

// Corpus Health constants
export const CORPUS_HEALTH_THRESHOLDS = {
  EXCELLENT: 8.0,
  GOOD: 6.0,
} as const;

export const CORPUS_HEALTH_INFO = [
  { 
    status: 'excellent', 
    label: 'EXCELLENT', 
    cssClass: 'health-excellent',
    range: '≥8.0',
    description: 'Optimal performance'
  },
  { 
    status: 'good', 
    label: 'GOOD', 
    cssClass: 'health-good',
    range: '6.0-7.9',
    description: 'Solid performance'
  },
  { 
    status: 'needs_work', 
    label: 'NEEDS WORK', 
    cssClass: 'health-needs-work',
    range: '<6.0',
    description: 'Requires improvement'
  }
] as const;
