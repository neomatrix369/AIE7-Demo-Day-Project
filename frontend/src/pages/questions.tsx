import React, { useCallback } from 'react';
import usePageNavigation from '../hooks/usePageNavigation';
import usePageData from '../hooks/usePageData';
import { LABEL_DASHBOARD, LABEL_RESULTS } from '../utils/constants';
import { questionsApi } from '../services/api';
import { QuestionGroup } from '../types';
import PageWrapper from '../components/ui/PageWrapper';

interface QuestionsData {
  llmQuestions: QuestionGroup;
  ragasQuestions: QuestionGroup;
}

const QuestionGroupsOverview: React.FC = () => {
  const { goTo } = usePageNavigation('Questions');

  // Stable data loader function
  const dataLoader = useCallback(async () => {
    const [llmQuestionsData, ragasQuestionsData] = await Promise.all([
      questionsApi.getLLMQuestions(),
      questionsApi.getRAGASQuestions()
    ]);
    
    return {
      llmQuestions: llmQuestionsData,
      ragasQuestions: ragasQuestionsData
    };
  }, []);

  // Load both question groups in parallel
  const { data: questionsData, loading, error, reload } = usePageData<QuestionsData>(
    dataLoader,
    {
      component: 'Questions',
      loadAction: 'QUESTIONS_LOAD_START',
      successAction: 'QUESTIONS_LOAD_SUCCESS',
      errorAction: 'QUESTIONS_LOAD_ERROR',
      userErrorMessage: 'Failed to load question groups',
      successMessage: (data: QuestionsData) => {
        const totalLlm = data.llmQuestions.reduce((acc, role) => acc + role.questions.length, 0);
        const totalRagas = data.ragasQuestions.reduce((acc, role) => acc + role.questions.length, 0);
        return `Questions loaded: ${totalLlm} LLM + ${totalRagas} RAGAS`;
      },
      successData: (data: QuestionsData) => ({
        llm_count: data.llmQuestions.length,
        ragas_count: data.ragasQuestions.length,
        llm_roles: data.llmQuestions.length,
        ragas_roles: data.ragasQuestions.length
      })
    }
  );

  const handleConfigureExperiment = () => {
    goTo('/experiment', 'Experiment', { action: 'NAVIGATE_TO_EXPERIMENT' });
  };

  const handleManageExperiments = () => {
    goTo('/experiments', 'Experiments', { action: 'NAVIGATE_TO_EXPERIMENTS' });
  };

  const handleBackToDashboard = () => {
    goTo('/dashboard', LABEL_DASHBOARD, { action: 'NAVIGATE_TO_DASHBOARD' });
  };

  // Extract data for easier access
  const llmQuestions = questionsData?.llmQuestions;
  const ragasQuestions = questionsData?.ragasQuestions;
  
  const totalLlmQuestions = llmQuestions?.reduce((acc, role) => acc + role.questions.length, 0) || 0;
  const totalRagasQuestions = ragasQuestions?.reduce((acc, role) => acc + role.questions.length, 0) || 0;

  return (
    <PageWrapper 
      currentPage="questions"
      loading={loading}
      error={error}
      loadingMessage="Loading Question Groups..."
      errorTitle="Error Loading Questions"
      onRetry={reload}
    >
      {llmQuestions && ragasQuestions && (
        <div className="card">
        <h2>🤖 Question Groups Overview</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          AI-generated vs RAGAS-generated questions ready for analysis
        </p>
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '4px', 
          padding: '10px', 
          marginBottom: '20px',
          fontSize: '14px',
          color: '#856404'
        }}>
          <strong>⚠️ Important Note:</strong> All AI-generated content in this system should be reviewed by subject matter experts (SMEs) before being used in production or shared with users.
        </div>

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
                <div className="stat-label">Role Types</div>
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
                    {role.role.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4>Sample Questions:</h4>
              <div className="question-list">
                {llmQuestions.slice(0, 5).map((role) => (
                  role.questions.slice(0, 1).map((question, index) => (
                    <div key={`${role.role_id}-${index}`} className="question-item">
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
                <div className="stat-label">Role Types</div>
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
                    {role.role.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4>Sample Questions:</h4>
              <div className="question-list">
                {ragasQuestions.slice(0, 5).map((role) => (
                  role.questions.slice(0, 1).map((question, index) => (
                    <div key={`${role.role_id}-${index}`} className="question-item">
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
              onClick={() => goTo('/results', LABEL_RESULTS, { 
                action: 'NAVIGATE_TO_RESULTS_FROM_QUESTIONS', 
                data: { 
                  llm_questions: totalLlmQuestions,
                  ragas_questions: totalRagasQuestions 
                } 
              })}
              style={{ backgroundColor: '#28a745' }}
            >
              📊 View Results
            </button>
            
            <button 
              className="button button-secondary" 
              onClick={() => goTo('/gap-analysis', 'Gap Analysis', { 
                action: 'NAVIGATE_TO_GAP_ANALYSIS_FROM_QUESTIONS', 
                data: { 
                  total_available_questions: totalLlmQuestions + totalRagasQuestions
                } 
              })}
              style={{ backgroundColor: '#e67e22', color: 'white' }}
            >
              🎯 Gap Analysis
            </button>
            
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
      )}
    </PageWrapper>
  );
};

export default QuestionGroupsOverview;