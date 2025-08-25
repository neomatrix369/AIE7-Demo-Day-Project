import React from 'react';
import { ComparisonData } from '../types';

interface ContextSectionProps {
  context: ComparisonData['context'];
}

const ContextSection: React.FC<ContextSectionProps> = ({ context }) => {
  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getDisplayValue = (before: any, after: any): string => {
    const beforeStr = formatValue(before);
    const afterStr = formatValue(after);
    
    if (beforeStr === afterStr) {
      return beforeStr;
    }
    return `${beforeStr} → ${afterStr}`;
  };

  const getNote = (before: any, after: any, defaultNote: string): string => {
    if (before === after) {
      return defaultNote;
    }
    return 'Configuration changed between experiments';
  };

  const contextItems = [
    {
      label: 'Questions Processed',
      value: getDisplayValue(context.questionsProcessed.before, context.questionsProcessed.after),
      note: getNote(context.questionsProcessed.before, context.questionsProcessed.after, 'Same for both experiments')
    },
    {
      label: 'Total Documents',
      value: getDisplayValue(context.totalDocuments.before, context.totalDocuments.after),
      note: getNote(context.totalDocuments.before, context.totalDocuments.after, 'Same corpus used')
    },
    {
      label: 'Total Chunks',
      value: getDisplayValue(context.totalChunks.before, context.totalChunks.after),
      note: getNote(context.totalChunks.before, context.totalChunks.after, 'Same chunking strategy')
    },
    {
      label: 'Total Size',
      value: getDisplayValue(context.totalSize.before, context.totalSize.after),
      note: getNote(context.totalSize.before, context.totalSize.after, 'Same data volume')
    },
    {
      label: 'Avg Document Length',
      value: getDisplayValue(context.avgDocLength.before, context.avgDocLength.after),
      note: getNote(context.avgDocLength.before, context.avgDocLength.after, 'Consistent document sizing')
    },
    {
      label: 'Embedding Model',
      value: getDisplayValue(context.embeddingModel.before, context.embeddingModel.after),
      note: getNote(context.embeddingModel.before, context.embeddingModel.after, 'OpenAI model used consistently')
    },
    {
      label: 'Chunk Size',
      value: getDisplayValue(context.chunkSize.before, context.chunkSize.after),
      note: getNote(context.chunkSize.before, context.chunkSize.after, 'Text splitting configuration')
    },
    {
      label: 'Chunk Overlap',
      value: getDisplayValue(context.chunkOverlap.before, context.chunkOverlap.after),
      note: getNote(context.chunkOverlap.before, context.chunkOverlap.after, 'Overlap between chunks')
    },
    {
      label: 'Similarity Threshold',
      value: getDisplayValue(context.similarityThreshold.before, context.similarityThreshold.after),
      note: getNote(context.similarityThreshold.before, context.similarityThreshold.after, 'Retrieval quality threshold')
    },
    {
      label: 'Top-K Retrieval',
      value: getDisplayValue(context.topKRetrieval.before, context.topKRetrieval.after),
      note: getNote(context.topKRetrieval.before, context.topKRetrieval.after, 'Number of documents retrieved')
    },
    {
      label: 'Retrieval Method',
      value: getDisplayValue(context.retrievalMethod.before, context.retrievalMethod.after),
      note: getNote(context.retrievalMethod.before, context.retrievalMethod.after, 'Search algorithm used')
    },
    {
      label: 'Vector DB',
      value: getDisplayValue(
        `${context.vectorDbType.before} v${context.vectorDbVersion.before}`,
        `${context.vectorDbType.after} v${context.vectorDbVersion.after}`
      ),
      note: getNote(context.vectorDbType.before, context.vectorDbType.after, 'Database type and version')
    }
  ];

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      padding: '32px',
      borderRadius: '12px',
      marginBottom: '32px',
      border: '1px solid #e9ecef'
    }}>
      <h3 style={{
        margin: '0 0 24px 0',
        fontSize: '24px',
        fontWeight: '600',
        color: '#333'
      }}>
        📋 Context & Configuration Details
      </h3>
      <p style={{
        margin: '0 0 24px 0',
        fontSize: '16px',
        color: '#666'
      }}>
        Experiment parameters and corpus information
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {contextItems.map((item, index) => (
          <div key={index} style={{
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
              marginBottom: '8px'
            }}>
              {item.label}
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#007bff',
              marginBottom: '8px'
            }}>
              {item.value}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6c757d',
              fontStyle: 'italic'
            }}>
              {item.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContextSection;
