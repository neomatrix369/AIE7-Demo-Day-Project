import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { questionsApi } from '../services/api';
import { QuestionGroup } from '../types';
import { logSuccess, logError, logInfo, logNavigation } from '../utils/logger';

const QuestionGroupsOverview: React.FC = () => {
  const [llmQuestions, setLlmQuestions] = useState<QuestionGroup | null>(null);
  const [ragasQuestions, setRagasQuestions] = useState<QuestionGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        logInfo('Loading question groups', { 
          component: 'Questions',
          action: 'QUESTIONS_LOAD_START'
        });

        const [llmData, ragasData] = await Promise.all([
          questionsApi.getLLMQuestions(),
          questionsApi.getRAGASQuestions()
        ]);
        
        setLlmQuestions(llmData.llm_questions);
        setRagasQuestions(ragasData.ragas_questions);
        
        logSuccess(`Questions loaded: ${llmData.llm_questions.count} LLM + ${ragasData.ragas_questions.count} RAGAS`, {
          component: 'Questions',
          action: 'QUESTIONS_LOAD_SUCCESS',
          data: {
            llm_count: llmData.llm_questions.count,
            ragas_count: ragasData.ragas_questions.count,
            llm_categories: llmData.llm_questions.categories.length,
            ragas_categories: ragasData.ragas_questions.categories.length
          }
        });
        
      } catch (err: any) {
        const userMessage = 'Failed to load question groups';
        setError(userMessage);
        
        logError(`Question loading failed: ${userMessage}`, {
          component: 'Questions',
          action: 'QUESTIONS_LOAD_ERROR',
          data: {
            error_type: err?.code || err?.name || 'Unknown',
            error_message: err?.message,
            status: err?.response?.status
          }
        });
        
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleConfigureExperiment = () => {
    logNavigation('Questions', 'Experiment', {
      component: 'Questions',
      action: 'NAVIGATE_TO_EXPERIMENT'
    });
    router.push('/experiment');
  };

  const handleBackToDashboard = () => {
    logNavigation('Questions', 'Dashboard', {
      component: 'Questions', 
      action: 'NAVIGATE_TO_DASHBOARD'
    });
    router.push('/dashboard');
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