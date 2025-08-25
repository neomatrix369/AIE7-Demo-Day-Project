/**
 * Utility functions for analyzing experiment statistics and document selection
 */

export interface DocumentTypeStats {
  pdf: string[];
  csv: string[];
  txt: string[];
  json: string[];
  other: string[];
  total: number;
}

export interface ExperimentDocumentStats {
  included: DocumentTypeStats;
  total: DocumentTypeStats;
  selectionSummary: string;
}

/**
 * Check if a source is an actual document file (has a file extension)
 */
function isDocumentFile(source: string): boolean {
  // Must contain a dot to have a file extension
  if (!source.includes('.')) {
    return false;
  }
  
  const extension = source.toLowerCase().split('.').pop() || '';
  // Only consider it a document if it has a valid file extension
  return extension.length > 0 && extension.length <= 4 && /^[a-z0-9]+$/i.test(extension);
}

/**
 * Analyze document sources from an experiment and categorize by file type
 */
export function analyzeExperimentSources(sources: string[]): DocumentTypeStats {
  const stats: DocumentTypeStats = {
    pdf: [],
    csv: [],
    txt: [],
    json: [],
    other: [],
    total: 0
  };

  sources.forEach(source => {
    // Only process actual document files
    if (!isDocumentFile(source)) {
      return; // Skip non-document sources like "llm", "ragas", etc.
    }

    const extension = source.toLowerCase().split('.').pop() || '';
    switch (extension) {
      case 'pdf':
        stats.pdf.push(source);
        break;
      case 'csv':
        stats.csv.push(source);
        break;
      case 'txt':
        stats.txt.push(source);
        break;
      case 'json':
        stats.json.push(source);
        break;
      default:
        stats.other.push(source);
        break;
    }
    stats.total++;
  });

  return stats;
}

/**
 * Generate a human-readable summary of document types included in an experiment
 */
export function generateDocumentSummary(stats: DocumentTypeStats): string {
  const parts: string[] = [];
  
  if (stats.pdf.length > 0) {
    parts.push(`PDF (${stats.pdf.length}): ${stats.pdf.join(', ')}`);
  }
  if (stats.csv.length > 0) {
    parts.push(`CSV (${stats.csv.length}): ${stats.csv.join(', ')}`);
  }
  if (stats.txt.length > 0) {
    parts.push(`TXT (${stats.txt.length}): ${stats.txt.join(', ')}`);
  }
  if (stats.json.length > 0) {
    parts.push(`JSON (${stats.json.length}): ${stats.json.join(', ')}`);
  }
  if (stats.other.length > 0) {
    parts.push(`Other (${stats.other.length}): ${stats.other.join(', ')}`);
  }
  
  if (parts.length === 0) {
    return 'No documents';
  }
  
  return parts.join(' | ');
}

/**
 * Get document selection statistics for an experiment
 * This analyzes the sources used in the experiment and provides insights
 */
export function getExperimentDocumentStats(sources: string[]): ExperimentDocumentStats {
  const included = analyzeExperimentSources(sources);
  
  // For now, we only have the included documents from the experiment
  // In the future, we could compare this against the total available documents
  const total = { ...included }; // Same as included for now
  
  const selectionSummary = generateDocumentSummary(included);
  
  return {
    included,
    total,
    selectionSummary
  };
}

/**
 * Format document statistics for display in the UI
 */
export function formatDocumentStats(stats: DocumentTypeStats): string {
  const parts: string[] = [];
  
  if (stats.pdf.length > 0) {
    parts.push(`📄 PDF (${stats.pdf.length}): ${stats.pdf.join(', ')}`);
  }
  if (stats.csv.length > 0) {
    parts.push(`📊 CSV (${stats.csv.length}): ${stats.csv.join(', ')}`);
  }
  if (stats.txt.length > 0) {
    parts.push(`📝 TXT (${stats.txt.length}): ${stats.txt.join(', ')}`);
  }
  if (stats.json.length > 0) {
    parts.push(`🔧 JSON (${stats.json.length}): ${stats.json.join(', ')}`);
  }
  if (stats.other.length > 0) {
    parts.push(`📁 Other (${stats.other.length}): ${stats.other.join(', ')}`);
  }
  
  return parts.join(' | ');
}
