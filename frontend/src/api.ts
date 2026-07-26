const API = import.meta.env.VITE_API_URL ?? "";

export interface Finding {
  type: string;
  pc: number;
  model: Record<string, string> | null;
  constraints: string[];
  simplified_constraints?: string[];
}

export interface Statistics {
  exploredStates: number;
  totalFindings: number;
}

export interface StateResponse {
  id: number;
  pc: number;
  label: string;
  status: string;
  parent_id: number | null;
  via_condition: string | null;
  findings: Finding[];
  constraints: string[];
}

export interface ExecuteResponse {
  findings: Finding[];
  statistics: Statistics;
  program: Array<string[] | [string, number | string]>;
  states: StateResponse[];
}

export interface GraphNode {
  id: string;
  label: string;
  pc: number;
  state: "live" | "dead" | "found" | "pending";
  findings: Finding[];
  constraints: string[];
  via_condition: string | null;
  [key: string]: unknown;
}

export interface GraphEdge {
  from: string;
  to: string;
  constraint: string | null;
  active: boolean;
  [key: string]: unknown;
}

export interface ExecuteResult {
  findings: Finding[];
  statistics: Statistics;
  program: Array<string[] | [string, number | string]>;
  states: StateResponse[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `GET ${path} failed`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? `POST ${path} failed`);
  }
  return res.json();
}

export async function fetchOpcodes(): Promise<Record<string, Record<string, string>>> {
  return apiGet("/opcodes");
}

export async function fetchExamples(): Promise<Record<string, string>> {
  return apiGet("/examples");
}

function buildGraph(states: StateResponse[]) {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  if (states.length === 0) return { nodes, edges };

  const byParent = new Map<number | null, StateResponse[]>();
  for (const s of states) {
    const key = s.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(s);
  }

  function traverse(parentId: number | null) {
    const children = byParent.get(parentId) ?? [];
    for (const s of children) {
      const status: GraphNode["state"] = (s.findings.length > 0 ? "found" : "live") as GraphNode["state"];

      nodes.push({
        id: `s${s.id}`,
        label: s.label,
        pc: s.pc,
        state: status,
        findings: s.findings,
        constraints: s.constraints,
        via_condition: s.via_condition,
      });

      if (parentId !== null) {
        edges.push({
          from: `s${parentId}`,
          to: `s${s.id}`,
          constraint: s.via_condition,
          active: status !== "dead",
        });
      }

      traverse(s.id);
    }
  }

  traverse(null);

  return { nodes, edges };
}

export async function executeCode(code: string): Promise<ExecuteResult> {
  const data = await apiPost<ExecuteResponse>("/execute", { code });
  const { nodes, edges } = buildGraph(data.states);
  return { ...data, nodes, edges };
}
