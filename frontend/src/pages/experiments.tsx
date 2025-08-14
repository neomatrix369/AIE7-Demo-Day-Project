import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { experimentsApi } from '../services/api';
import { ExperimentFile } from '../types';
import { logSuccess, logError, logInfo, logNavigation } from '../utils/logger';
import NavigationHeader from '../components/NavigationHeader';
import QualityScoreLegend from '../components/QualityScoreLegend';

const ExperimentManagement: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [loadingExperiment, setLoadingExperiment] = useState(false);
  const [hintBalloon, setHintBalloon] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadExperiments();
  }, []);

  const showHintBalloon = (message: string, type: 'success' | 'error') => {
    setHintBalloon({ message, type });
    setTimeout(() => {
      setHintBalloon(null);
    }, 3000);
  };

  const loadExperiments = async () => {
    try {
      setLoading(true);
      logInfo('Loading experiment list', {
        component: 'Experiments',
        action: 'LOAD_EXPERIMENTS_START'
      });

      const response = await experimentsApi.list();
      
      if (response.success) {
        setExperiments(response.experiments);
        logSuccess(`Loaded ${response.experiments.length} experiments`, {
          component: 'Experiments',
          action: 'LOAD_EXPERIMENTS_SUCCESS',
          data: { count: response.experiments.length }
        });
      } else {
        throw new Error('Failed to load experiments');
      }
    } catch (err: any) {
      const errorMessage = 'Failed to load experiments';
      setError(errorMessage);
      logError(`${errorMessage}: ${err?.message || 'Unknown error'}`, {
        component: 'Experiments',
        action: 'LOAD_EXPERIMENTS_ERROR',
        data: { error: err?.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadExperiment = async (filename: string) => {
    try {
      setLoadingExperiment(true);
      logInfo(`Loading experiment ${filename}`, {
        component: 'Experiments',
        action: 'LOAD_EXPERIMENT_START',
        data: { filename }
      });

      const response = await experimentsApi.load(filename);
      
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

      const response = await experimentsApi.delete(filename);
      
      if (response.success) {
        logSuccess(`Deleted experiment ${filename}`, {
          component: 'Experiments',
          action: 'DELETE_EXPERIMENT_SUCCESS',
          data: { filename }
        });
        
        // Remove from list and reload
        setExperiments(prev => prev.filter(exp => exp.filename !== filename));
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
    
    logNavigation('Experiments', 'Results', {
      component: 'Experiments',
      action: 'NAVIGATE_TO_RESULTS',
      data: { selected_experiment: selectedExperiment }
    });
    router.push('/results');
  };

  const handleBackToDashboard = () => {
    logNavigation('Experiments', 'Dashboard', {
      component: 'Experiments',
      action: 'NAVIGATE_TO_DASHBOARD'
    });
    router.push('/dashboard');
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

  if (loading) {
    return (
      <div className="card">
        <h2>Loading Experiments...</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Please wait...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <NavigationHeader currentPage="experiments" />
      
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
              onClick={loadExperiments}
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
            <strong>Found {experiments.length} experiment(s)</strong>
          </div>
          <button 
            onClick={loadExperiments}
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

        {experiments.length === 0 ? (
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
              🏠 Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="experiment-list">
            {experiments.map((experiment) => (
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
                        <strong>📈 Quality Score:</strong> {experiment.avg_quality_score ? experiment.avg_quality_score.toFixed(1) : 0.0}
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
    </div>
  );
};

export default ExperimentManagement;
