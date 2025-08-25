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
import ExperimentStatusIndicator from '../components/ui/ExperimentStatusIndicator';
import { useRouter } from 'next/router';
import { formatDocumentStats, getExperimentDocumentStats } from '../utils/experimentStats';

const ExperimentManagement: React.FC = () => {
  // UI state management 
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [loadingExperiment, setLoadingExperiment] = useState(false);
  const [hintBalloon, setHintBalloon] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Comparison selection state
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  
  const { goTo } = usePageNavigation('Experiments');
  const router = useRouter();

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
        // Navigate directly to Results after successful load (single-step UX)
        goTo('/results', LABEL_RESULTS, {
          action: 'NAVIGATE_TO_RESULTS_FROM_EXPERIMENTS_LOAD',
          data: { selected_experiment: filename, count: response.count }
        });
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
    if (selectedExperiment) {
      goTo('/results', LABEL_RESULTS, {
        action: 'NAVIGATE_TO_RESULTS_FROM_EXPERIMENTS',
        data: { selected_experiment: selectedExperiment }
      });
    }
  };

  // Comparison handlers
  const handleComparisonToggle = (filename: string) => {
    setSelectedForComparison(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        // Limit to 2 selections
        if (newSet.size < 2) {
          newSet.add(filename);
        } else {
          // Replace the oldest selection
          const firstItem = Array.from(newSet)[0];
          newSet.delete(firstItem);
          newSet.add(filename);
        }
      }
      return newSet;
    });
  };

  const handleCompareExperiments = () => {
    const selectedArray = Array.from(selectedForComparison);
    if (selectedArray.length === 2 && experiments) {
      // Find the experiment objects to get their timestamps
      const experimentA = experiments.find(exp => exp.filename === selectedArray[0]);
      const experimentB = experiments.find(exp => exp.filename === selectedArray[1]);
      
      if (experimentA && experimentB) {
        // Order chronologically: older first (experimentA), newer second (experimentB)
        const timestampA = new Date(experimentA.timestamp).getTime();
        const timestampB = new Date(experimentB.timestamp).getTime();
        
        const olderExperiment = timestampA <= timestampB ? experimentA : experimentB;
        const newerExperiment = timestampA <= timestampB ? experimentB : experimentA;
        
        logInfo('Comparing experiments (chronologically ordered)', {
          component: 'Experiments',
          action: 'COMPARE_EXPERIMENTS',
          data: { 
            experimentA: olderExperiment.filename, 
            experimentB: newerExperiment.filename,
            timestampA: olderExperiment.timestamp,
            timestampB: newerExperiment.timestamp
          }
        });
        
        // Navigate to compare page with chronologically ordered experiments
        const compareUrl = `/compare?experimentA=${encodeURIComponent(olderExperiment.filename)}&experimentB=${encodeURIComponent(newerExperiment.filename)}`;
        router.push(compareUrl);
      } else {
        // Fallback to original order if experiments not found
        logInfo('Comparing experiments (fallback order)', {
          component: 'Experiments',
          action: 'COMPARE_EXPERIMENTS_FALLBACK',
          data: { 
            experimentA: selectedArray[0], 
            experimentB: selectedArray[1] 
          }
        });
        
        const compareUrl = `/compare?experimentA=${encodeURIComponent(selectedArray[0])}&experimentB=${encodeURIComponent(selectedArray[1])}`;
        router.push(compareUrl);
      }
    }
  };

  const handleClearComparison = () => {
    setSelectedForComparison(new Set());
  };

  const handleBackToDashboard = () => {
    goTo('/dashboard', LABEL_DASHBOARD, { action: 'NAVIGATE_TO_DASHBOARD' });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTiming = (experiment: ExperimentFile) => {
    if (!experiment.start_time && !experiment.end_time && !experiment.duration_seconds) {
      return null;
    }
    
    const parts = [];
    
    if (experiment.start_time) {
      parts.push(`Started: ${new Date(experiment.start_time).toLocaleTimeString()}`);
    }
    
    if (experiment.end_time) {
      parts.push(`Ended: ${new Date(experiment.end_time).toLocaleTimeString()}`);
    }
    
    if (experiment.duration_seconds) {
      const minutes = Math.floor(experiment.duration_seconds / 60);
      const seconds = Math.floor(experiment.duration_seconds % 60);
      parts.push(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    
    return parts.join(' | ');
  };

  const getStatusColor = (qualityScore: number) => getStatusColorShared(qualityScore);
  const getStatusText = (qualityScore: number) => getStatusShared(qualityScore).toUpperCase();

  return (
    <div>
      <NavigationHeader currentPage="experiments" />
      <ExperimentStatusIndicator />
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

        {/* Comparison Controls */}
        {experiments && experiments.length >= 2 && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 'bold', color: '#333' }}>
                  ⚖️ Compare Experiments:
                </span>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  Select 2 experiments to compare ({selectedForComparison.size}/2 selected)
                </span>
              </div>
              {selectedForComparison.size > 0 && (
                <button
                  onClick={handleClearComparison}
                  className="button button-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            {selectedForComparison.size === 2 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#d4edda',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #c3e6cb'
              }}>
                <div style={{ fontSize: '14px', color: '#155724' }}>
                  <strong>Ready to compare:</strong> {Array.from(selectedForComparison).join(' vs ')}
                </div>
                <button
                  onClick={handleCompareExperiments}
                  className="button"
                  style={{
                    backgroundColor: '#28a745',
                    padding: '8px 16px',
                    fontSize: '14px'
                  }}
                >
                  ⚖️ Compare Selected
                </button>
              </div>
            )}
          </div>
        )}

        {experiments.length > 0 && (
          <>
            {/* Document Selection Summary - Only show if there are documents */}
            {(() => {
              const allDocuments = experiments.flatMap(exp => exp.selected_documents || []);
              const uniqueDocuments = Array.from(new Set(allDocuments));
              
              if (uniqueDocuments.length > 0) {
                const stats = getExperimentDocumentStats(uniqueDocuments);
                return (
                  <div className="card" style={{ 
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#e8f4fd',
                    borderRadius: '6px',
                    border: '1px solid #bee5eb'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>
                      📊 Document Selection Summary
                    </h4>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px', fontStyle: 'italic' }}>
                      Shows document types used across all experiments
                    </div>
                    <div style={{ fontSize: '14px', color: '#0c5460' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Total unique documents used across {experiments.length} experiments:</strong> {uniqueDocuments.length}
                      </div>
                      <div style={{ lineHeight: '1.4' }}>
                        <strong>Document types:</strong>
                        {(() => {
                          const parts: string[] = [];
                          
                          if (stats.included.pdf.length > 0) {
                            parts.push(`📄 PDF: ${stats.included.pdf.length}`);
                          }
                          if (stats.included.csv.length > 0) {
                            parts.push(`📊 CSV: ${stats.included.csv.length}`);
                          }
                          if (stats.included.txt.length > 0) {
                            parts.push(`📝 TXT: ${stats.included.txt.length}`);
                          }
                          if (stats.included.json.length > 0) {
                            parts.push(`🔧 JSON: ${stats.included.json.length}`);
                          }
                          if (stats.included.other.length > 0) {
                            parts.push(`📁 Other: ${stats.included.other.length}`);
                          }
                          
                          return (
                            <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>
                              {parts.join(' | ')}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
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
          </>
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
                  backgroundColor: selectedExperiment === experiment.filename ? '#f0f8ff' : 'white',
                  position: 'relative'
                }}
              >
                {/* Comparison Checkbox */}
                {experiments.length >= 2 && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 1
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedForComparison.has(experiment.filename)}
                      onChange={() => handleComparisonToggle(experiment.filename)}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginLeft: experiments.length >= 2 ? '40px' : '0'
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                      📊 {experiment.name}
                    </h4>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      {experiment.filename}
                    </div>
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
                      {experiment.selected_documents && experiment.selected_documents.length > 0 && (
                        <div>
                          <strong>📊 Documents:</strong>
                          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '2px', lineHeight: '1.4' }}>
                            {(() => {
                              console.log('Experiment selected_documents:', experiment.selected_documents);
                              const stats = getExperimentDocumentStats(experiment.selected_documents || []).included;
                              const parts: string[] = [];
                              
                              if (stats.pdf.length > 0) {
                                parts.push(`📄 PDF: ${stats.pdf.length}`);
                              }
                              if (stats.csv.length > 0) {
                                parts.push(`📊 CSV: ${stats.csv.length}`);
                              }
                              if (stats.txt.length > 0) {
                                parts.push(`📝 TXT: ${stats.txt.length}`);
                              }
                              if (stats.json.length > 0) {
                                parts.push(`🔧 JSON: ${stats.json.length}`);
                              }
                              if (stats.other.length > 0) {
                                parts.push(`📁 Other: ${stats.other.length}`);
                              }
                              
                              return (
                                <div style={{ marginBottom: '4px' }}>
                                  {parts.join(' | ')}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                      <div>
                        <strong>💾 Size:</strong> {formatFileSize(experiment.file_size)}
                      </div>
                      {formatTiming(experiment) && (
                        <div>
                          <strong>⏱️ Timing:</strong>
                          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                            {formatTiming(experiment)}
                          </div>
                        </div>
                      )}
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
