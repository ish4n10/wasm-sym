import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OpcodesReference.css';

interface OpcodesData {
  [category: string]: {
    [opcode: string]: string;
  };
}

const OpcodesReference: React.FC = () => {
  const [opcodes, setOpcodes] = useState<OpcodesData>({});
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && Object.keys(opcodes).length === 0) {
      loadOpcodes();
    }
  }, [isOpen]);

  const loadOpcodes = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/get-codes');
      setOpcodes(response.data);
    } catch (error) {
      console.error('Failed to load opcodes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="opcodes-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Hide' : 'Show'} Opcodes Reference
      </button>
      
      {isOpen && (
        <div className="opcodes-overlay" onClick={() => setIsOpen(false)}>
          <div className="opcodes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="opcodes-header">
              <h2>Opcodes Reference</h2>
              <button className="opcodes-close" onClick={() => setIsOpen(false)}>×</button>
            </div>
            
            <div className="opcodes-content">
              {loading ? (
                <div className="opcodes-loading">Loading opcodes...</div>
              ) : (
                Object.entries(opcodes).map(([category, opcodesList]) => (
                  <div key={category} className="opcodes-category">
                    <h3>{category}</h3>
                    <div className="opcodes-list">
                      {Object.entries(opcodesList).map(([opcode, description]) => (
                        <div key={opcode} className="opcode-item">
                          <code className="opcode-name">{opcode}</code>
                          <span className="opcode-desc">{description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OpcodesReference;

