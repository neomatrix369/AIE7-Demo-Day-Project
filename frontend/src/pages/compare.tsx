import React from 'react';
import { useRouter } from 'next/router';
import NavigationHeader from '../components/NavigationHeader';
import ComparisonHeader from '../components/ComparisonHeader';
import MetricRow from '../components/MetricRow';
import ContextSection from '../components/ContextSection';
import ComparisonActions from '../components/ComparisonActions';
import { useComparisonData } from '../hooks/useComparisonData';
import { logNavigation } from '../utils/logger';

// Helper function for status conversion
const getStatusFromQualityScore = (score: number): string => {
  if (score >= 8.0) return 'EXCELLENT';
  if (score >= 6.0) return 'GOOD';
  if (score >= 4.0) return 'NEEDS WORK';
  return 'POOR';
};

// Helper functions to generate dynamic improvement comments
const generateQualityScoreComment = (before: number, after: number): string => {
  const improvement = ((after - before) / Math.max(before, 1)) * 100;
  const statusBefore = getStatusFromQualityScore(before);
  const statusAfter = getStatusFromQualityScore(after);
  
  if (improvement <= 0) {
    return `${statusBefore} → ${statusAfter} • No improvement in quality score`;
  } else if (improvement < 10) {
    return `${statusBefore} → ${statusAfter} • Minor quality improvement`;
  } else if (improvement < 25) {
    return `${statusBefore} → ${statusAfter} • Moderate quality boost`;
  } else if (improvement < 50) {
    return `${statusBefore} → ${statusAfter} • Significant quality improvement`;
  } else {
    return `${statusBefore} → ${statusAfter} • Major quality boost`;
  }
};

const generateSuccessRateComment = (before: number, after: number): string => {
  const improvement = ((after - before) / Math.max(before, 1)) * 100;
  const pointsChange = after - before;
  
  if (improvement <= 0) {
    return `${pointsChange >= 0 ? '+' : ''}${pointsChange.toFixed(1)} percentage points • No improvement in success rate`;
  } else if (improvement < 25) {
    return `${pointsChange >= 0 ? '+' : ''}${pointsChange.toFixed(1)} percentage points • Minor success rate improvement`;
  } else if (improvement < 50) {
    return `${pointsChange >= 0 ? '+' : ''}${pointsChange.toFixed(1)} percentage points • Moderate success rate boost`;
  } else if (improvement < 100) {
    return `${pointsChange >= 0 ? '+' : ''}${pointsChange.toFixed(1)} percentage points • Significant success rate improvement`;
  } else {
    return `${pointsChange >= 0 ? '+' : ''}${pointsChange.toFixed(1)} percentage points • Success rate more than doubled`;
  }
};

const generateHighQualityAnswersComment = (before: number, after: number): string => {
  const improvement = ((after - before) / Math.max(before, 1)) * 100;
  const countChange = after - before;
  
  if (improvement <= 0) {
    return `${countChange >= 0 ? '+' : ''}${countChange} quality answers • No improvement in high-quality responses`;
  } else if (improvement < 50) {
    return `${countChange >= 0 ? '+' : ''}${countChange} quality answers • Minor improvement in answer quality`;
  } else if (improvement < 100) {
    return `${countChange >= 0 ? '+' : ''}${countChange} quality answers • Moderate improvement in answer quality`;
  } else if (improvement < 200) {
    return `${countChange >= 0 ? '+' : ''}${countChange} quality answers • Significant improvement in answer quality`;
  } else {
    return `${countChange >= 0 ? '+' : ''}${countChange} quality answers • Exceptional improvement in answer quality`;
  }
};

const generateCorpusHealthComment = (before: string, after: string): string => {
  if (before === after) {
    return `No change in corpus health status`;
  }
  
  const statusRank = { 'POOR': 1, 'NEEDS WORK': 2, 'GOOD': 3, 'EXCELLENT': 4 };
  const beforeRank = statusRank[before as keyof typeof statusRank] || 1;
  const afterRank = statusRank[after as keyof typeof statusRank] || 1;
  
  if (afterRank > beforeRank) {
    return `Corpus health improved from ${before} to ${after}`;
  } else {
    return `Corpus health declined from ${before} to ${after}`;
  }
};

const generateWeakCoverageComment = (before: number, after: number): string => {
  const reduction = ((before - after) / Math.max(before, 1)) * 100;
  const countChange = before - after;
  
  if (reduction <= 0) {
    return `${countChange >= 0 ? '+' : ''}${countChange} weak areas • No improvement in coverage`;
  } else if (reduction < 25) {
    return `${countChange} fewer weak areas • Minor coverage improvement`;
  } else if (reduction < 50) {
    return `${countChange} fewer weak areas • Moderate coverage improvement`;
  } else if (reduction < 75) {
    return `${countChange} fewer weak areas • Significant coverage improvement`;
  } else {
    return `${countChange} fewer weak areas • Major coverage improvement`;
  }
};

const generatePoorQuestionsComment = (before: number, after: number): string => {
  const reduction = ((before - after) / Math.max(before, 1)) * 100;
  const countChange = before - after;
  
  if (reduction <= 0) {
    return `${countChange >= 0 ? '+' : ''}${countChange} poor questions • No improvement in question quality`;
  } else if (reduction < 25) {
    return `${countChange} fewer poor questions • Minor quality improvement`;
  } else if (reduction < 50) {
    return `${countChange} fewer poor questions • Moderate quality improvement`;
  } else if (reduction < 75) {
    return `${countChange} fewer poor questions • Significant quality improvement`;
  } else {
    return `${countChange} fewer poor questions • Major quality improvement`;
  }
};

const generateChunkCoverageComment = (before: number, after: number): string => {
  const improvement = ((after - before) / Math.max(before, 1)) * 100;
  
  if (improvement <= 0) {
    return `No improvement in chunk coverage`;
  } else if (improvement < 10) {
    return `Minor improvement in chunk coverage`;
  } else if (improvement < 25) {
    return `Moderate improvement in chunk coverage`;
  } else if (improvement < 50) {
    return `Significant improvement in chunk coverage`;
  } else {
    return `Major improvement in chunk coverage`;
  }
};

const ComparePage: React.FC = () => {
  const router = useRouter();
  const { data, loading, error, noData, refreshData } = useComparisonData();

  const handleUseExperiment = () => {
    logNavigation('compare', 'experiment', {
      component: 'ComparePage',
      action: 'USE_EXPERIMENT',
      data: { experimentId: data?.experimentB.id }
    });
    router.push('/experiment');
  };

  const handleViewDetails = () => {
    logNavigation('compare', 'results', {
      component: 'ComparePage',
      action: 'VIEW_DETAILS',
      data: { experimentId: data?.experimentB.id }
    });
    router.push('/results');
  };

  const handleExport = () => {
    logNavigation('compare', 'export', {
      component: 'ComparePage',
      action: 'EXPORT_COMPARISON',
      data: { experimentIds: [data?.experimentA.id, data?.experimentB.id] }
    });
    // TODO: Implement export functionality
    console.log('Export comparison');
  };

  const handleRunNew = () => {
    logNavigation('compare', 'experiment', {
      component: 'ComparePage',
      action: 'RUN_NEW_EXPERIMENT',
      data: {}
    });
    router.push('/experiment');
  };

  const handleGoToExperiments = () => {
    logNavigation('compare', 'experiments', {
      component: 'ComparePage',
      action: 'NAVIGATE_TO_EXPERIMENTS',
      data: {}
    });
    router.push('/experiments');
  };

  if (loading) {
    return (
      <div>
        <NavigationHeader currentPage="compare" />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          fontSize: '18px',
          color: '#666'
        }}>
          Loading comparison data...
        </div>
      </div>
    );
  }

  if (noData) {
    return (
      <div>
        <NavigationHeader currentPage="compare" />
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '40px',
            border: '1px solid #e9ecef',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '20px'
            }}>
              ⚖️
            </div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '16px'
            }}>
              No Experiments Selected for Comparison
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              To compare experiments, you need to select two experiments from the Experiments page.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleGoToExperiments}
                className="button"
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                📁 Go to Experiments
              </button>
              <button
                onClick={handleRunNew}
                className="button button-secondary"
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                🧪 Run New Experiment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <NavigationHeader currentPage="compare" />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          fontSize: '18px',
          color: '#dc3545'
        }}>
          Error loading comparison data: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavigationHeader currentPage="compare" />
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Header Section */}
        <ComparisonHeader data={data} />

        {/* Primary Impact Metrics */}
        <div style={{
          backgroundColor: '#f8fff8',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          marginBottom: '32px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            backgroundColor: '#e8f5e8',
            color: '#721c24',
            padding: '16px 20px',
            fontSize: '18px',
            fontWeight: '600',
            textAlign: 'center',
            borderBottom: '1px solid #e9ecef'
          }}>
            🎯 Primary Impact Metrics
          </div>
          
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <MetricRow
              label="Overall Quality Score"
              before={data.metrics.overallQuality.before}
              after={data.metrics.overallQuality.after}
              impact="HIGH"
              backgroundColor="#f8fff8"
              improvement={generateQualityScoreComment(data.metrics.overallQuality.before, data.metrics.overallQuality.after)}
            />
            
            <MetricRow
              label="Success Rate"
              before={data.metrics.successRate.before}
              after={data.metrics.successRate.after}
              impact="HIGH"
              backgroundColor="#f8fff8"
              improvement={generateSuccessRateComment(data.metrics.successRate.before, data.metrics.successRate.after)}
            />
            
            <MetricRow
              label="High Quality Answers (≥7.0)"
              before={data.metrics.highQualityAnswers.before}
              after={data.metrics.highQualityAnswers.after}
              impact="HIGH"
              backgroundColor="#f8fff8"
              improvement={generateHighQualityAnswersComment(data.metrics.highQualityAnswers.before, data.metrics.highQualityAnswers.after)}
            />
            
            <MetricRow
              label="Corpus Health"
              before={data.metrics.corpusHealth.before}
              after={data.metrics.corpusHealth.after}
              impact="HIGH"
              backgroundColor="#f8fff8"
              improvement={generateCorpusHealthComment(data.metrics.corpusHealth.before, data.metrics.corpusHealth.after)}
              isLast={true}
            />
          </div>
        </div>

        {/* Secondary Impact Metrics */}
        <div style={{
          backgroundColor: '#fffbf0',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          marginBottom: '32px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            backgroundColor: '#fff3cd',
            color: '#856404',
            padding: '16px 20px',
            fontSize: '18px',
            fontWeight: '600',
            textAlign: 'center',
            borderBottom: '1px solid #e9ecef'
          }}>
            📊 Secondary Impact Metrics
          </div>
          
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <MetricRow
              label="Weak Coverage Areas"
              before={data.metrics.weakCoverage.before}
              after={data.metrics.weakCoverage.after}
              impact="MEDIUM"
              backgroundColor="#fffbf0"
              improvement={generateWeakCoverageComment(data.metrics.weakCoverage.before, data.metrics.weakCoverage.after)}
            />
            
            <MetricRow
              label="Poor Questions"
              before={data.metrics.poorQuestions.before}
              after={data.metrics.poorQuestions.after}
              impact="MEDIUM"
              backgroundColor="#fffbf0"
              improvement={generatePoorQuestionsComment(data.metrics.poorQuestions.before, data.metrics.poorQuestions.after)}
            />
            
            <MetricRow
              label="Chunk Coverage"
              before={data.metrics.chunkCoverage.before}
              after={data.metrics.chunkCoverage.after}
              impact="MEDIUM"
              backgroundColor="#fffbf0"
              improvement={generateChunkCoverageComment(data.metrics.chunkCoverage.before, data.metrics.chunkCoverage.after)}
              isLast={true}
            />
          </div>
        </div>

        {/* Context Section */}
        <ContextSection context={data.context} />

        {/* Action Buttons */}
        <ComparisonActions
          onUseExperiment={handleUseExperiment}
          onViewDetails={handleViewDetails}
          onExport={handleExport}
          onRunNew={handleRunNew}
        />
      </div>
    </div>
  );
};

export default ComparePage;
