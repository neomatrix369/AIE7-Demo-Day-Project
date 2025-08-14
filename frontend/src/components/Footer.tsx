import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #dee2e6',
      padding: '20px 0',
      marginTop: '40px',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '8px'
        }}>
          RagCheck
        </div>
        <div style={{
          fontSize: '14px',
          fontStyle: 'italic',
          color: '#666',
          lineHeight: '1.4'
        }}>
          Validate your RAG before you build (pre-retrieval, save on expensive evaluation time and costs)
        </div>
      </div>
    </footer>
  );
};

export default Footer;
