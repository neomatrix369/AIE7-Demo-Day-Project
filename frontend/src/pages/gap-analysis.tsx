import React from 'react';
import NavigationHeader from '../components/NavigationHeader';
import GapAnalysisDashboard from '../components/gap-analysis/GapAnalysisDashboard';

const GapAnalysisPage: React.FC = () => {
  return (
    <div>
      <NavigationHeader currentPage="gap-analysis" />
      <div className="card">
        <h2>📊 Gap Analysis & Recommendations</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
          Identify weak coverage areas and get actionable recommendations to improve your corpus
        </p>
        <div style={{ paddingTop: '10px' }}>
          <GapAnalysisDashboard />
        </div>
      </div>
    </div>
  );
};

export default GapAnalysisPage;


