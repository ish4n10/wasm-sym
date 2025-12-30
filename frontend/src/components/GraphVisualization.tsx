import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphData } from '../types';
import './GraphVisualization.css';

interface GraphVisualizationProps {
  graphData: GraphData | null;
  onNodeClick?: (nodeId: string) => void;
}

// Custom node components with improved styling
const DefaultNode = ({ data }: { data: any }) => (
  <div className="custom-node custom-node-exploring">
    <Handle type="target" position={Position.Top} className="node-handle" />
    <div className="node-content">
      <div className="node-label">{data.label}</div>
    </div>
    <Handle type="source" position={Position.Bottom} className="node-handle" />
  </div>
);

const FoundNode = ({ data }: { data: any }) => (
  <div className="custom-node custom-node-found">
    <Handle type="target" position={Position.Top} className="node-handle" />
    <div className="node-content">
      <div className="node-label">{data.label}</div>
    </div>
    <Handle type="source" position={Position.Bottom} className="node-handle" />
  </div>
);

const DeadNode = ({ data }: { data: any }) => (
  <div className="custom-node custom-node-dead">
    <Handle type="target" position={Position.Top} className="node-handle" />
    <div className="node-content">
      <div className="node-label">{data.label}</div>
    </div>
    <Handle type="source" position={Position.Bottom} className="node-handle" />
  </div>
);

const nodeTypes = {
  defaultNode: DefaultNode,
  foundNode: FoundNode,
  deadNode: DeadNode,
};

const GraphVisualization: React.FC<GraphVisualizationProps> = ({ graphData, onNodeClick }) => {
  const nodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onClick: () => onNodeClick?.(node.id),
      },
    }));
  }, [graphData, onNodeClick]);

  const edges = useMemo(() => {
    if (!graphData) return [];
    return graphData.edges.map((edge) => ({
      ...edge,
      label: edge.label,
      labelStyle: {
        fill: '#2c3e50',
        fontSize: '11px',
        fontWeight: '500',
        background: '#ffffff',
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid #ddd',
      },
      style: {
        stroke: '#7f8c8d',
        strokeWidth: 2.5,
      },
      markerEnd: {
        type: 'arrowclosed',
        color: '#7f8c8d',
      },
    }));
  }, [graphData]);

  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: any) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  if (!graphData || nodes.length === 0) {
    return (
      <div className="graph-placeholder">
        <p>No graph data available. Run symbolic execution to see the visualization.</p>
      </div>
    );
  }

  return (
    <div className="graph-visualization">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClickHandler}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background color="#e8e8e8" gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export default GraphVisualization;
