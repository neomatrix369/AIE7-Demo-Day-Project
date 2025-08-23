import React, { useState, useCallback } from 'react';
import usePageNavigation from '../hooks/usePageNavigation';
import usePageData from '../hooks/usePageData';
import { LABEL_DASHBOARD, LABEL_RESULTS } from '../utils/constants';
import { ExperimentFile } from '../types';
import { logSuccess, logError, logInfo } from '../utils/logger';
import { getStatusColor as getStatusColorShared, getStatus as getStatusShared } from '../utils/qualityScore';
import NavigationHeader from '../components/NavigationHeader';
import QualityScoreLegend from '../components/QualityScoreLegend';
import { createStorageAdapter } from '../services/storage';

const ExperimentManagement: React.FC = () => {
  // UI state management 
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [loadingExperiment, setLoadingExperiment] = useState(false);
  const [hintBalloon, setHintBalloon] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const { goTo } = usePageNavigation('Experiments');

  // Stable data loader function
  const dataLoader = useCallback(async () => {
    const storageAdapter = createStorageAdapter();
    const response = await storageAdapter.listExperiments();
    
    if (response.success) {
      return response.experiments;
    } else {
      throw new Error('Failed to load experiments');
    }
  }, []);

  // Data loading with standard pattern
  const { data: experiments, loading, error, reload } = usePageData<ExperimentFile[]>(
    dataLoader,
    {
      component: 'Experiments',
      loadAction: 'LOAD_EXPERIMENTS_START',
      successAction: 'LOAD_EXPERIMENTS_SUCCESS',
      errorAction: 'LOAD_EXPERIMENTS_ERROR',
      userErrorMessage: 'Failed to load experiments',
      successMessage: (data: ExperimentFile[]) => `Loaded ${data.length} experiments`,
      successData: (data: ExperimentFile[]) => ({ count: data.length })
    }
  );

  const showHintBalloon = (message: string, type: 'success' | 'error') => {
    setHintBalloon({ message, type });
    setTimeout(() => {
      setHintBalloon(null);
    }, 3000);
  };

  // loadExperiments function moved to usePageData hook

  const handleLoadExperiment = async (filename: string) => {
    try {
      setLoadingExperiment(true);
      logInfo(`Loading experiment ${filename}`, {
        component: 'Experiments',
        action: 'LOAD_EXPERIMENT_START',
        data: { filename }
      });

      const storageAdapter = createStorageAdapter();
      const response = await storageAdapter.loadExperiment(filename);
      
      if (response.success) {
        setSelectedExperiment(filename);
        logSuccess(`Loaded experiment ${filename}`, {
          component: 'Experiments',
          action: 'LOAD_EXPERIMENT_SUCCESS',
          data: { filename, count: response.count }
        });
        showHintBalloon(`Successfully loaded experiment: ${filename} (${response.count} questions)`, 'success');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      const errorMessage = 'Failed to load experiment';
      logError(`${errorMessage}: ${err?.message || 'Unknown error'}`, {
        component: 'Experiments',
        action: 'LOAD_EXPERIMENT_ERROR',
        data: { filename, error: err?.message }
      });
      showHintBalloon(`${errorMessage}: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setLoadingExperiment(false);
    }
  };

  const handleDeleteExperiment = async (filename: string) => {
    try {
      logInfo(`Deleting experiment ${filename}`, {
        component: 'Experiments',
        action: 'DELETE_EXPERIMENT_START',
        data: { filename }
      });

      const storageAdapter = createStorageAdapter();
      const response = await storageAdapter.deleteExperiment(filename);
      
      if (response.success) {
        logSuccess(`Deleted experiment ${filename}`, {
          component: 'Experiments',
          action: 'DELETE_EXPERIMENT_SUCCESS',
          data: { filename }
        });
        
        // Reload the experiments list
        reload();
        if (selectedExperiment === filename) {
          setSelectedExperiment(null);
        }
        showHintBalloon(`Successfully deleted experiment: ${filename}`, 'success');
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      const errorMessage = 'Failed to delete experiment';
      logError(`${errorMessage}: ${err?.message || 'Unknown error'}`, {
        component: 'Experiments',
        action: 'DELETE_EXPERIMENT_ERROR',
        data: { filename, error: err?.message }
      });
      showHintBalloon(`${errorMessage}: ${err?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleViewResults = () => {
    if (!selectedExperiment) {
      alert('Please select an experiment first');
      return;
    }
    
    goTo('/results', LABEL_RESULTS, { action: 'NAVIGATE_TO_RESULTS', data: { selected_experiment: selectedExperiment } });
  };

  const handleBackToDashboard = () => {
    goTo('/dashboard', LABEL_DASHBOARD, { action: 'NAVIGATE_TO_DASHBOARD' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getStatusColor = (qualityScore: number) => getStatusColorShared(qualityScore);
  const getStatusText = (qualityScore: number) => getStatusShared(qualityScore).toUpperCase();

  return (
    <div>
      <NavigationHeader currentPage="experiments" />
      {loading && (
        <div className="card">
          <h2>Loading Experiments...</h2>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', color: '#666' }}>Please wait...</div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="card">
          <h2>Error Loading Experiments</h2>
          <div style={{ color: '#dc3545', padding: '20px' }}>
            {error}
          </div>
          <button className="button button-secondary" onClick={reload}>
            🔄 Retry
          </button>
        </div>
      )}
      
      {!loading && !error && experiments && (
        <>
      
      {hintBalloon && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '12px 20px',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 'bold',
          backgroundColor: hintBalloon.type === 'success' ? '#28a745' : '#dc3545',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          maxWidth: '400px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {hintBalloon.message}
        </div>
      )}

      <div className="card">
        <h2>📁 Experiment Management</h2>
        <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
          Manage and load previous experiment results
        </p>

        {error && (
          <div style={{ 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            padding: '15px', 
            borderRadius: '4px', 
            marginBottom: '20px' 
          }}>
            <strong>Error:</strong> {error}
            <button 
              onClick={reload}
              style={{ 
                marginLeft: '10px', 
                padding: '5px 10px', 
                backgroundColor: '#721c24', 
                color: 'white', 
                border: 'none', 
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <strong>Found {experiments?.length || 0} experiment(s)</strong>
          </div>
          <button 
            onClick={reload}
            className="button button-secondary"
            style={{ padding: '8px 16px' }}
          >
            🔄 Refresh
          </button>
        </div>

        {experiments.length > 0 && (
          <QualityScoreLegend 
            format="compact" 
            showTitle={true}
            style={{ 
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6',
              fontSize: '0.9rem'
            }}
          />
        )}

        {(experiments?.length || 0) === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '24px', color: '#666', marginBottom: '20px' }}>
              No Experiments Found
            </div>
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '30px' }}>
              Run an experiment first to see it listed here.
            </div>
            <button 
              className="button" 
              onClick={handleBackToDashboard}
            >
              🏠 Dashboard
            </button>
          </div>
        ) : (
          <div className="experiment-list">
            {experiments?.map((experiment) => (
              <div 
                key={experiment.filename}
                className="card" 
                style={{ 
                  marginBottom: '15px',
                  border: selectedExperiment === experiment.filename ? '2px solid #007bff' : '1px solid #ddd',
                  backgroundColor: selectedExperiment === experiment.filename ? '#f0f8ff' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                      📊 {experiment.filename}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '14px' }}>
                      <div>
                        <strong>📅 Date:</strong> {formatTimestamp(experiment.timestamp)}
                      </div>
                      <div>
                        <strong>❓ Questions:</strong> {experiment.total_questions}
                      </div>
                      <div>
                        <strong>📈 Quality Score:</strong>
                        <div>
                          {experiment.avg_quality_score ? experiment.avg_quality_score.toFixed(1) : 0.0}
                        </div>
                        <div style={{
                          color: getStatusColor(experiment.avg_quality_score),
                          fontWeight: 'bold'
                        }}>
                          {getStatusText(experiment.avg_quality_score)}
                        </div>
                      </div>
                      <div>
                        <strong>📁 Sources:</strong> {experiment.sources.join(', ')}
                      </div>
                      <div>
                        <strong>💾 Size:</strong> {formatFileSize(experiment.file_size)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginLeft: '20px' }}>
                    <button
                      className="button"
                      onClick={() => handleLoadExperiment(experiment.filename)}
                      disabled={loadingExperiment}
                      style={{ 
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: selectedExperiment === experiment.filename ? '#28a745' : '#007bff'
                      }}
                    >
                      {loadingExperiment && selectedExperiment === experiment.filename ? 'Loading...' : 
                       selectedExperiment === experiment.filename ? '✓ Loaded' : '📂 Load'}
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => handleDeleteExperiment(experiment.filename)}
                      style={{ 
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: '#dc3545',
                        color: 'white'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedExperiment && (
          <div style={{ 
            backgroundColor: '#d4edda', 
            padding: '15px', 
            borderRadius: '4px', 
            marginTop: '20px',
            border: '1px solid #c3e6cb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>✅ Experiment Loaded:</strong> {selectedExperiment}
              </div>
              <button 
                className="button" 
                onClick={handleViewResults}
                style={{ backgroundColor: '#28a745' }}
              >
                📊 View Results →
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
          <button 
            className="button button-secondary" 
            onClick={handleBackToDashboard}
          >
            ← Back to Dashboard
          </button>
          
          {selectedExperiment && (
            <button 
              className="button" 
              onClick={handleViewResults}
              style={{ backgroundColor: '#28a745' }}
            >
              📊 View Results →
            </button>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default ExperimentManagement;
