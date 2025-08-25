/**
 * CSV Export Utilities
 * Functions to generate and download CSV files for gap analysis data
 */

export interface QuestionExportData {
  'role-id': string;
  role: string;
  description: string;
  'question: text': string;
  'question: focus': string;
}

/**
 * Convert questions data to CSV format for export
 */
export function questionsToCSV(questions: any[]): string {
  if (!questions || questions.length === 0) {
    return '';
  }

  // Define CSV headers
  const headers: (keyof QuestionExportData)[] = [
    'role-id',
    'role',
    'description',
    'question: text',
    'question: focus'
  ];

  // Convert questions to CSV rows
  const rows = questions.map(question => {
    const row: QuestionExportData = {
      'role-id': question.id || question.question_id || '',
      'role': question.role_name || 'Unknown',
      'description': `Quality score: ${question.quality_score || question.avg_quality_score || 0}`,
      'question: text': question.text || question.question || '',
      'question: focus': question.focus || 'General'
    };
    return row;
  });

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const escapedValue = value.toString().replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  if (!csvContent) {
    console.warn('No CSV content to download');
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for older browsers
    window.open(`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
  }
}

/**
 * Filter questions by quality status
 */
export function filterQuestionsByStatus(questions: any[], status: 'developing' | 'poor'): any[] {
  return questions.filter(question => {
    const qualityScore = question.quality_score || question.avg_quality_score || 0;
    
    if (status === 'developing') {
      // Developing: quality score 5.0-6.9
      return qualityScore >= 5.0 && qualityScore < 7.0;
    } else if (status === 'poor') {
      // Poor: quality score < 5.0
      return qualityScore < 5.0;
    }
    
    return false;
  });
}

/**
 * Export questions by status as CSV
 */
export function exportQuestionsByStatus(
  questions: any[], 
  status: 'developing' | 'poor', 
  experimentName?: string
): void {
  const filteredQuestions = filterQuestionsByStatus(questions, status);
  
  if (filteredQuestions.length === 0) {
    alert(`No ${status} questions found to export.`);
    return;
  }

  const csvContent = questionsToCSV(filteredQuestions);
  const timestamp = new Date().toISOString().split('T')[0];
  const experimentSuffix = experimentName ? `_${experimentName.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  const filename = `${status}_questions_${timestamp}${experimentSuffix}.csv`;
  
  downloadCSV(csvContent, filename);
}
