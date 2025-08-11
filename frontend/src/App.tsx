import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DataLoadingDashboard from './pages/DataLoadingDashboard';
import QuestionGroupsOverview from './pages/QuestionGroupsOverview';
import ExperimentConfiguration from './pages/ExperimentConfiguration';
import AnalysisResults from './pages/AnalysisResults';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Corpus Quality Assessment Tool</h1>
        </header>
        <main className="App-main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DataLoadingDashboard />} />
            <Route path="/questions" element={<QuestionGroupsOverview />} />
            <Route path="/experiment" element={<ExperimentConfiguration />} />
            <Route path="/results" element={<AnalysisResults />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;