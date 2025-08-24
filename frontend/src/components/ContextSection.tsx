import React from 'react';
import { ComparisonData } from '../types';

interface ContextSectionProps {
  context: ComparisonData['context'];
}

const ContextSection: React.FC<ContextSectionProps> = ({ context }) => {
  const contextItems = [
    {
      label: 'Questions Processed',
      value: context.questionsProcessed,
      note: 'Same for both experiments'
    },
    {
      label: 'Total Documents',
      value: context.totalDocuments.toLocaleString(),
      note: 'Same corpus used'
    },
    {
      label: 'Total Chunks',
      value: context.totalChunks.toLocaleString(),
      note: 'Same chunking strategy'
    },
    {
      label: 'Total Size',
      value: context.totalSize,
      note: 'Same data volume'
    },
    {
      label: 'Avg Document Length',
      value: context.avgDocLength,
      note: 'Consistent document sizing'
    },
    {
      label: 'Embedding Model',
      value: context.embeddingModel,
      note: 'OpenAI model used consistently'
    },
    {
      label: 'Chunk Size',
      value: context.chunkSize,
      note: 'Text splitting configuration'
    },
    {
      label: 'Chunk Overlap',
      value: context.chunkOverlap,
      note: 'Overlap between chunks'
    },
    {
      label: 'Similarity Threshold',
      value: context.similarityThreshold,
      note: 'Retrieval quality threshold'
    },
    {
      label: 'Top-K Retrieval',
      value: context.topKRetrieval,
      note: 'Number of documents retrieved'
    },
    {
      label: 'Retrieval Method',
      value: context.retrievalMethod,
      note: 'Search algorithm used'
    },
    {
      label: 'Vector DB',
      value: `${context.vectorDbType} v${context.vectorDbVersion}`,
      note: 'Database type and version'
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
