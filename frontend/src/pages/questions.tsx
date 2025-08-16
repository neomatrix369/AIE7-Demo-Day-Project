import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { questionsApi } from '../services/api';
import { QuestionGroup } from '../types';
import { logSuccess, logError, logInfo, logNavigation } from '../utils/logger';
import NavigationHeader from '../components/NavigationHeader';

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

        const [llmQuestionsData, ragasQuestionsData] = await Promise.all([
          questionsApi.getLLMQuestions(),
          questionsApi.getRAGASQuestions()
        ]);
        
        setLlmQuestions(llmQuestionsData);
        setRagasQuestions(ragasQuestionsData);
        
        const totalLlmQuestions = llmQuestionsData.reduce((acc, role) => acc + role.questions.length, 0);
        const totalRagasQuestions = ragasQuestionsData.reduce((acc, role) => acc + role.questions.length, 0);

        logSuccess(`Questions loaded: ${totalLlmQuestions} LLM + ${totalRagasQuestions} RAGAS`, {
          component: 'Questions',
          action: 'QUESTIONS_LOAD_SUCCESS',
          data: {
            llm_count: llmQuestionsData.length,
            ragas_count: ragasQuestionsData.length,
            llm_roles: llmQuestionsData.length,
            ragas_roles: ragasQuestionsData.length
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

  const handleManageExperiments = () => {
    logNavigation('Questions', 'Experiments', {
      component: 'Questions',
      action: 'NAVIGATE_TO_EXPERIMENTS'
    });
    router.push('/experiments');
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

  const totalLlmQuestions = llmQuestions.reduce((acc, role) => acc + role.questions.length, 0);
  const totalRagasQuestions = ragasQuestions.reduce((acc, role) => acc + role.questions.length, 0);

  return (
    <div>
      <NavigationHeader currentPage="questions" />
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
                <span className="stat-value" style={{ color: '#007bff' }}>{totalLlmQuestions}</span>
                <div className="stat-label">Questions Generated</div>
              </div>
              <div className="stat-item" style={{ backgroundColor: 'white' }}>
                <span className="stat-value" style={{ color: '#007bff' }}>{llmQuestions.length}</span>
                <div className="stat-label">Question Types</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>Question Roles:</h4>
              <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px' }}>
                {llmQuestions.map((role, index) => (
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
                    {category.role.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4>Sample Questions:</h4>
              <div className="question-list">
                {llmQuestions.slice(0, 5).map((role) => (
                  role.questions.slice(0, 1).map((question, index) => (
                    <div key={`${category.role_id}-${index}`} className="question-item">
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>{role.emoji}</span> {question.text}
                    </div>
                  ))
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ backgroundColor: '#f8fff8', border: '2px solid #28a745' }}>
            <h3>📊 RAGAS Generated Questions</h3>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
              <div className="stat-item" style={{ backgroundColor: 'white' }}>
                <span className="stat-value" style={{ color: '#28a745' }}>{totalRagasQuestions}</span>
                <div className="stat-label">Questions Generated</div>
              </div>
              <div className="stat-item" style={{ backgroundColor: 'white' }}>
                <span className="stat-value" style={{ color: '#28a745' }}>{ragasQuestions.length}</span>
                <div className="stat-label">Question Types</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4>Question Roles:</h4>
              <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px' }}>
                {ragasQuestions.map((role, index) => (
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
                    {category.role.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4>Sample Questions:</h4>
              <div className="question-list">
                {ragasQuestions.slice(0, 5).map((role) => (
                  role.questions.slice(0, 1).map((question, index) => (
                    <div key={`${category.role_id}-${index}`} className="question-item">
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>{role.emoji}</span> {question.text}
                    </div>
                  ))
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
            Total: {totalLlmQuestions + totalRagasQuestions} questions available for experiment
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
          <button 
            className="button button-secondary" 
            onClick={handleBackToDashboard}
          >
            ← Back to Dashboard
          </button>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              className="button button-secondary" 
              onClick={handleManageExperiments}
              style={{ backgroundColor: '#6f42c1' }}
            >
              📁 Manage Experiments
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
    </div>
  );
};

export default QuestionGroupsOverview;