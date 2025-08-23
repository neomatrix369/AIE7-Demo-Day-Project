import React from 'react';
import usePageNavigation from '../hooks/usePageNavigation';
import { LABEL_RESULTS, LABEL_HEATMAP, LABEL_DASHBOARD } from '../utils/constants';
import GapAnalysisDashboard from '../components/gap-analysis/GapAnalysisDashboard';

const GapAnalysisPage: React.FC = () => {
  const { goTo } = usePageNavigation('Gap Analysis');

  return (
    <div>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Header with navigation */}
        <div style={{ 
          marginBottom: '30px', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '40px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '700', 
            margin: '0 0 15px 0',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            🎯 Gap Analysis & Recommendations
          </h1>
          <p style={{ 
            fontSize: '1.1rem', 
            margin: '0 auto 25px auto', 
            opacity: 0.9,
            maxWidth: '600px',
            lineHeight: '1.5'
          }}>
            Intelligent content gap detection and prioritized improvement suggestions using role-based analysis
          </p>
          
          {/* Quick Navigation Bar */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center', 
            flexWrap: 'wrap' 
          }}>
            <button 
              className="button button-secondary"
              onClick={() => goTo('/', LABEL_DASHBOARD, { 
                action: 'NAVIGATE_TO_DASHBOARD_FROM_GAP_ANALYSIS', 
                data: { gap_count: 0 } 
              })}
              style={{ 
                fontSize: '0.9rem', 
                padding: '8px 16px', 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white'
              }}
            >
              🏠 Dashboard
            </button>
            <button 
              className="button button-secondary"
              onClick={() => goTo('/results', LABEL_RESULTS, { 
                action: 'NAVIGATE_TO_RESULTS_FROM_GAP_ANALYSIS', 
                data: { gap_percentage: 0 } 
              })}
              style={{ 
                fontSize: '0.9rem', 
                padding: '8px 16px', 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white'
              }}
            >
              📊 Results
            </button>
            <button 
              className="button button-secondary"
              onClick={() => goTo('/heatmap', LABEL_HEATMAP, { 
                action: 'NAVIGATE_TO_HEATMAP_FROM_GAP_ANALYSIS', 
                data: { total_recommendations: 0 } 
              })}
              style={{ 
                fontSize: '0.9rem', 
                padding: '8px 16px', 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white'
              }}
            >
              🗺️ Heatmap
            </button>
            <button 
              className="button button-secondary"
              onClick={() => goTo('/experiment', 'Experiment', { 
                action: 'NAVIGATE_TO_EXPERIMENT_FROM_GAP_ANALYSIS', 
                data: { recommendations_count: 0 } 
              })}
              style={{ 
                fontSize: '0.9rem', 
                padding: '8px 16px', 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white'
              }}
            >
              ⚗️ Run Experiment
            </button>
          </div>
        </div>

        {/* Gap Analysis Dashboard Content */}
        <GapAnalysisDashboard />
        
        {/* Footer with additional navigation */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '0.9rem' }}>
            <strong>💡 Next Steps:</strong> Use these insights to improve your corpus content and enhance RAG performance.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="button button-secondary"
              onClick={() => window.location.reload()}
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            >
              🔄 Refresh Analysis
            </button>
            <button 
              className="button button-secondary"
              onClick={() => goTo('/experiment', 'Experiment', { 
                action: 'RUN_NEW_EXPERIMENT_FROM_GAP_ANALYSIS', 
                data: { previous_gaps: 0 } 
              })}
              style={{ fontSize: '0.85rem', padding: '6px 12px', backgroundColor: '#17a2b8', color: 'white' }}
            >
              🧪 Run New Experiment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GapAnalysisPage;


