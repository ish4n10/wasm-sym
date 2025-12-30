import React from 'react';

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  examples: Record<string, string>;
  onExampleSelect: (code: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, examples, onExampleSelect }) => {
  const handleExampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedExample = e.target.value;
    if (selectedExample && examples[selectedExample]) {
      onExampleSelect(examples[selectedExample]);
    }
  };

  return (
    <div className="code-editor">
      <div className="editor-header">
        <h3>Code Editor</h3>
        <select onChange={handleExampleChange} defaultValue="">
          <option value="">Select an example...</option>
          {Object.keys(examples).map((key) => (
            <option key={key} value={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)} Example
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder="Enter your WASM-like program here...&#10;&#10;Example:&#10;local.get 0&#10;i32.const 100&#10;i32.lt_s&#10;br_if 5&#10;HALT"
        className="code-textarea"
      />
      <div className="editor-help">
        <strong>Instructions:</strong>
        <ul>
          <li>One instruction per line</li>
          <li>Use # for comments</li>
          <li>Instructions: local.get, i32.const, i32.add, br_if, HALT, FOUND, etc.</li>
        </ul>
      </div>
    </div>
  );
};

export default CodeEditor;

