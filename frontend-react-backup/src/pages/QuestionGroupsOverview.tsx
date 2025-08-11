import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionsApi } from '../services/api';
import { QuestionGroup } from '../types';

const QuestionGroupsOverview: React.FC = () => {
  const [llmQuestions, setLlmQuestions] = useState<QuestionGroup | null>(null);
  const [ragasQuestions, setRagasQuestions] = useState<QuestionGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const [llmData, ragasData] = await Promise.all([
          questionsApi.getLLMQuestions(),
          questionsApi.getRAGASQuestions()
        ]);
        
        setLlmQuestions(llmData.llm_questions);
        setRagasQuestions(ragasData.ragas_questions);
      } catch (err) {
        setError('Failed to load question groups');
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleConfigureExperiment = () => {
    navigate('/experiment');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="card">
        <h2>Loading Question Groups...</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Please wait...</div>
        </div>
      </div>
    );
  }

  if (error || !llmQuestions || !ragasQuestions) {
    return (
      <div className="card">
        <h2>Error Loading Questions</h2>
        <div style={{ color: '#dc3545', padding: '20px' }}>
          {error || 'Unknown error occurred'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>🤖 Question Groups Overview</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          AI-generated vs RAGAS-generated questions ready for analysis
        </p>

        <div className="two-column">
          <div className="card" style={{ backgroundColor: '#f0f8ff', border: '2px solid #007bff' }}>
            <h3>🤖 LLM Generated Questions</h3>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
              <div className="stat-item" style={{ backgroundColor: 'white' }}>
                <span className="stat-value" style={{ color: '#007bff' }}>{llmQuestions.count}</span>
                <div className="stat-label">Questions Generated</div>
              </div>
              <div className="stat-item" style={{ backgroundColor: 'white' }}>
                <span className="stat-value" style={{ color: '#007bff' }}>{llmQuestions.categories.length}</span>
                <div className="stat-label">Question Types</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>Question Categories:</h4>
              <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px' }}>
                {llmQuestions.categories.map((category, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      margin: '2px 4px',
                      textTransform: 'capitalize'
                    }}
                  >
                    {category.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4>Sample Questions:</h4>
              <div className="question-list">
                {llmQuestions.sample.map((question, index) => (
                  <div key={index} className="question-item">
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>{index + 1}.</span> {question}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: '#f8fff8', border: '2px solid #28a745' }}>
            <h3>📊 RAGAS Generated Questions</h3>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
              <div className="stat-item" style={{ backgroundColor: 'white' }}>
                <span className="stat-value" style={{ color: '#28a745' }}>{ragasQuestions.count}</span>
                <div className="stat-label">Questions Generated</div>
              </div>
              <div className="stat-item" style={{ backgroundColor: 'white' }}>
                <span className="stat-value" style={{ color: '#28a745' }}>{ragasQuestions.categories.length}</span>
                <div className="stat-label">Question Types</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>Question Categories:</h4>
              <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px' }}>
                {ragasQuestions.categories.map((category, index) => (
                  <span
                    key={index}
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#28a745',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      margin: '2px 4px',
                      textTransform: 'capitalize'
                    }}
                  >
                    {category.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4>Sample Questions:</h4>
              <div className="question-list">
                {ragasQuestions.sample.map((question, index) => (
                  <div key={index} className="question-item">
                    <span style={{ color: '#666', fontSize: '0.9rem' }}>{index + 1}.</span> {question}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ backgroundColor: '#e8f5e8', marginTop: '20px', textAlign: 'center' }}>
          <h3>✅ Generation Status</h3>
          <div style={{ fontSize: '18px', color: '#28a745', marginBottom: '10px' }}>
            Both question sets ready for analysis
          </div>
          <div style={{ color: '#666' }}>
            Total: {llmQuestions.count + ragasQuestions.count} questions available for experiment
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
          <button 
            className="button button-secondary" 
            onClick={handleBackToDashboard}
          >
            ← Back to Dashboard
          </button>
          
          <button 
            className="button" 
            onClick={handleConfigureExperiment}
            style={{ fontSize: '18px', padding: '15px 30px' }}
          >
            Configure Experiment →
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionGroupsOverview;