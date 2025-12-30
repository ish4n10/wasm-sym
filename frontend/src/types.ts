// Type definitions for the application

export interface Node {
  id: string;
  type: string;
  data: {
    label: string;
    stateType: 'found' | 'dead' | 'exploring';
  };
  position: { x: number; y: number };
  style?: {
    background?: string;
    color?: string;
    border?: string;
    borderRadius?: string;
    padding?: string;
    fontWeight?: string;
  };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  type?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
  labelStyle?: {
    fill?: string;
    fontSize?: string;
    fontWeight?: string;
  };
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface FoundState {
  stateId: number;
  pc: number;
  constraints: string[];
  solution: Record<string, string>;
}

export interface Statistics {
  nodesExplored: number;
  edges: number;
  foundStates: number;
  deadEnds: number;
}

export interface ExecuteResponse {
  graphData: GraphData;
  foundStates: FoundState[];
  statistics: Statistics;
}

export interface ExampleProgram {
  name: string;
  code: string;
}

