import { useMemo, useCallback, useEffect, useState } from "react";
import type { Node, Edge, NodeProps, BackgroundVariant } from "@xyflow/react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Controls,
  MarkerType,
  Background,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import type { GraphNode as AppGraphNode, GraphEdge as AppGraphEdge } from "../api";

const HEADER_H = 56;
const FOOTER_H = 32;
const NODE_W = 190;
const NODE_H = 90;

function truncateLabel(text: string, maxLen = 30): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

function colorFor(s: AppGraphNode["state"]) {
  switch (s) {
    case "live": return "var(--color-live)";
    case "dead": return "var(--color-dead)";
    case "found": return "var(--color-found)";
    case "pending": return "var(--color-pending)";
  }
}

type RFNode = Node<AppGraphNode>;
type RFEdge = Edge<AppGraphEdge>;

function buildLayout(nodes: AppGraphNode[], edges: AppGraphEdge[]): { rfnodes: RFNode[]; rfedges: RFEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 150, ranksep: 160, marginx: 50, marginy: 50 });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    g.setEdge(e.from, e.to);
  }
  dagre.layout(g);

  const rfnodes: RFNode[] = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "execNode",
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: n,
    };
  });

  const rfedges: RFEdge[] = edges.map((e) => ({
    id: `${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    type: "smoothstep",
    data: e,
    label: e.constraint ? truncateLabel(e.constraint) : undefined,
    labelStyle: {
      fill: "var(--color-found)",
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 500,
    },
    labelShowBg: true,
    labelBgStyle: {
      fill: "var(--color-surface)",
      stroke: "var(--color-hairline)",
      strokeWidth: 1,
    },
    labelBgPadding: [4, 10],
    labelBgBorderRadius: 6,
    style: {
      stroke: "var(--color-muted)",
      strokeWidth: 1.5,
      strokeDasharray: e.constraint ? "5 4" : "none",
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-muted)" },
  }));

  return { rfnodes, rfedges };
}

function computeActiveSet(clickedId: string | null, rfedges: RFEdge[]): Set<string> {
  if (!clickedId) return new Set();

  const childrenOf = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  for (const e of rfedges) {
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
    childrenOf.get(e.source)!.push(e.target);
    parentOf.set(e.target, e.source);
  }

  const active = new Set<string>();

  const walkUp = (id: string) => {
    if (active.has(id)) return;
    active.add(id);
    const p = parentOf.get(id);
    if (p) walkUp(p);
  };

  const walkDown = (id: string) => {
    if (active.has(id)) return;
    active.add(id);
    const kids = childrenOf.get(id) ?? [];
    for (const k of kids) walkDown(k);
  };

  walkUp(clickedId);
  walkDown(clickedId);

  return active;
}

function ExecNode({ data }: NodeProps<Node<AppGraphNode>>) {
  const stateColor = colorFor(data.state);
  const isFound = data.state === "found";
  const isDead = data.state === "dead";
  const labelText = data.label.length > 24 ? data.label.slice(0, 22) + "…" : data.label;

  return (
    <div
      className="relative border bg-surface text-left"
      style={{
        width: NODE_W,
        height: NODE_H,
        borderRadius: 12,
        borderColor: isFound ? stateColor : "var(--color-border)",
        borderWidth: isFound ? 1.6 : 1,
        boxShadow: isFound ? `0 0 0 1px ${stateColor}66` : "none",
        padding: "12px 16px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: stateColor,
          border: "2px solid var(--color-background)",
          width: 12,
          height: 12,
          top: -6,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: stateColor,
          border: "2px solid var(--color-background)",
          width: 12,
          height: 12,
          bottom: -6,
        }}
      />

      <div className="flex items-center gap-2.5">
        <span
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: stateColor }}
        >
          {isFound ? (
            <span className="text-[8px] font-bold text-background">!</span>
          ) : isDead ? (
            <span className="text-[8px] text-background">x</span>
          ) : null}
        </span>
        <span className="text-mono text-[14px] font-semibold text-foreground leading-tight truncate">
          {labelText}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <span className="text-mono text-[11px] text-muted-foreground">pc {data.pc}</span>
        <span
          className="text-mono inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em]"
          style={{
            color: stateColor,
            backgroundColor: `color-mix(in srgb, ${stateColor} 15%, transparent)`,
          }}
        >
          {data.state}
        </span>
      </div>

      {isFound && data.findings[0] && (
        <div className="text-mono text-[10px] text-found truncate mt-1.5 leading-tight">
          {data.findings[0].type}
        </div>
      )}

      <div
        className="absolute left-0 top-0 h-full w-[4px]"
        style={{
          backgroundColor: stateColor,
          borderTopLeftRadius: 11,
          borderBottomLeftRadius: 11,
        }}
      />
    </div>
  );
}

const nodeTypes = { execNode: ExecNode } as const;

interface GraphPaneProps {
  nodes: AppGraphNode[];
  edges: AppGraphEdge[];
  selected: string | null;
  setSelected: (id: string | null) => void;
}

export default function GraphPane({ nodes, edges, selected: _selected, setSelected }: GraphPaneProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const { rfnodes: layoutedNodes, rfedges: layoutedEdges } = useMemo(
    () => buildLayout(nodes, edges),
    [nodes, edges],
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node<AppGraphNode>>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge<AppGraphEdge>>([]);

  const activeIds = useMemo(() => {
    if (!highlightedId || !layoutedNodes.some((n) => n.id === highlightedId)) {
      return new Set<string>();
    }
    return computeActiveSet(highlightedId, layoutedEdges);
  }, [highlightedId, layoutedEdges, layoutedNodes]);

  useEffect(() => {
    if (activeIds.size === 0) {
      setFlowNodes(layoutedNodes);
      setFlowEdges(layoutedEdges);
    } else {
      setFlowNodes(
        layoutedNodes.map((n) => ({
          ...n,
          style: activeIds.has(n.id)
            ? { opacity: 1 }
            : { opacity: 0.3, pointerEvents: "none" as const },
        })),
      );
      setFlowEdges(
        layoutedEdges.map((e) => {
          const dim = !activeIds.has(e.source) || !activeIds.has(e.target);
          return {
            ...e,
            style: dim ? { ...e.style, opacity: 0.25 } : e.style,
            labelStyle: dim ? { ...e.labelStyle, opacity: 0.25 } : e.labelStyle,
          };
        }),
      );
    }
  }, [layoutedNodes, layoutedEdges, activeIds, setFlowNodes, setFlowEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: RFNode) => {
      setHighlightedId((prev) => (prev === node.id ? null : node.id));
      setSelected(node.id);
    },
    [setSelected],
  );

  const onPaneClick = useCallback(() => {
    setHighlightedId(null);
    setSelected(null);
  }, [setSelected]);

  const graphHeight = `calc(100dvh - ${HEADER_H + FOOTER_H}px)`;

  if (nodes.length === 0) {
    return (
      <section className="relative overflow-hidden bg-background" style={{ height: graphHeight }}>
        <div className="hairline-b flex h-11 items-center justify-between bg-background/70 px-5 backdrop-blur">
          <span className="text-serif text-[16px] italic">Execution graph</span>
        </div>
        <div className="flex h-[calc(100%-2.75rem)] items-center justify-center">
          <div className="text-center">
            <p className="text-mono text-[13px] text-muted-foreground">No execution data yet</p>
            <p className="text-mono mt-1 text-[11px] text-muted-foreground/60">Write a program and click "Run trace"</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-background" style={{ height: graphHeight }}>
      <div className="hairline-b relative z-10 flex h-11 items-center justify-between bg-background/70 px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-serif text-[16px] italic">Execution graph</span>
          <span className="text-mono text-[11px] text-muted-foreground">{nodes.length} states</span>
        </div>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={"dots" as BackgroundVariant} gap={24} size={2} color="var(--color-muted)" style={{ opacity: 0.35, background: "#0c0c0c" }} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </section>
  );
}
