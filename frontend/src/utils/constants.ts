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
