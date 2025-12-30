import React from 'react';
import type { FoundState, Statistics } from '../types';

interface ResultsPanelProps {
  foundStates: FoundState[];
  statistics: Statistics | null;
  selectedNodeId: string | null;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ foundStates, statistics, selectedNodeId }) => {
  return (
    <div className="results-panel">
      <h3>Results</h3>
      
      {statistics && (
        <div className="statistics">
          <h4>Execution Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">States Explored:</span>
              <span className="stat-value">{statistics.nodesExplored}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Paths Found:</span>
              <span className="stat-value">{statistics.foundStates}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Dead Ends:</span>
              <span className="stat-value">{statistics.deadEnds}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Edges:</span>
              <span className="stat-value">{statistics.edges}</span>
            </div>
          </div>
        </div>
      )}

      {selectedNodeId && (
        <div className="selected-node-info">
          <h4>Selected Node: {selectedNodeId}</h4>
        </div>
      )}

      {foundStates.length > 0 ? (
        <div className="found-states">
          <h4>Found States ({foundStates.length})</h4>
          {foundStates.map((state, idx) => (
            <div key={idx} className="found-state-card">
              <div className="state-header">
                <strong>State #{idx + 1}</strong> (ID: {state.stateId}, PC: {state.pc})
              </div>
              
              <div className="state-section">
                <strong>Constraints:</strong>
                <ul>
                  {state.constraints.map((constraint, i) => (
                    <li key={i} className="constraint-item">{constraint}</li>
                  ))}
                </ul>
              </div>
              
              {Object.keys(state.solution).length > 0 && (
                <div className="state-section">
                  <strong>Solution:</strong>
                  <div className="solution-box">
                    {Object.entries(state.solution).map(([key, value]) => (
                      <div key={key} className="solution-item">
                        <span className="solution-key">{key}:</span>
                        <span className="solution-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <p>No states reached the FOUND condition.</p>
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;

