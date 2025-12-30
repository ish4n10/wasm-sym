import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CodeEditor from './components/CodeEditor';
import GraphVisualization from './components/GraphVisualization';
import ResultsPanel from './components/ResultsPanel';
import OpcodesReference from './components/OpcodesReference';
import type { ExecuteResponse, ExampleProgram } from './types';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [code, setCode] = useState('');
  const [examples, setExamples] = useState<Record<string, string>>({});
  const [graphData, setGraphData] = useState<ExecuteResponse['graphData'] | null>(null);
  const [foundStates, setFoundStates] = useState<ExecuteResponse['foundStates']>([]);
  const [statistics, setStatistics] = useState<ExecuteResponse['statistics'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [maxSteps, setMaxSteps] = useState(1000);

  // Load examples on mount
  useEffect(() => {
    axios.get(`${API_BASE_URL}/examples`)
      .then((response) => {
        setExamples(response.data);
        // Set default example
        if (response.data.simple) {
          setCode(response.data.simple);
        }
      })
      .catch((err) => {
        console.error('Failed to load examples:', err);
      });
  }, []);

  const handleRun = async () => {
    if (!code.trim()) {
      setError('Please enter some code');
      return;
    }

    setLoading(true);
    setError(null);
    setGraphData(null);
    setFoundStates([]);
    setStatistics(null);

    try {
      const response = await axios.post<ExecuteResponse>(`${API_BASE_URL}/execute`, {
        code,
        max_steps: maxSteps,
      });

      setGraphData(response.data.graphData);
      setFoundStates(response.data.foundStates);
      setStatistics(response.data.statistics);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
      console.error('Execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleSelect = (exampleCode: string) => {
    setCode(exampleCode);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>WASM Symbolic Executor</h1>
        <p>Explore all possible execution paths of your WebAssembly-like program using symbolic execution.</p>
      </header>

      <div className="app-content">
        <div className="left-panel">
          <CodeEditor
            code={code}
            onCodeChange={setCode}
            examples={examples}
            onExampleSelect={handleExampleSelect}
          />
          
          <div className="controls">
            <div className="settings">
              <label>
                Max Steps:
                <input
                  type="number"
                  value={maxSteps}
                  onChange={(e) => setMaxSteps(parseInt(e.target.value) || 1000)}
                  min={100}
                  max={10000}
                  step={100}
                />
              </label>
            </div>
            <button
              onClick={handleRun}
              disabled={loading}
              className="run-button"
            >
              {loading ? 'Running...' : 'Run Symbolic Execution'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="right-panel">
          <div className="visualization-section">
            <h3>Execution Graph</h3>
            <GraphVisualization
              graphData={graphData}
              onNodeClick={setSelectedNodeId}
            />
          </div>

          <ResultsPanel
            foundStates={foundStates}
            statistics={statistics}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </div>
      
      <OpcodesReference />
    </div>
  );
}

export default App;
