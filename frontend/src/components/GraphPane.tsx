import { useMemo, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Node, Edge, NodeProps, BackgroundVariant } from "@xyflow/react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  Controls,
  MarkerType,
  Background,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Panel } from "./ui/Panel";
import type { GraphNode as AppGraphNode, GraphEdge as AppGraphEdge } from "../api";

const NODE_W = 236;
const NODE_H = 104;

function truncateLabel(text: string, maxLen = 24): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

function badgeFor(s: AppGraphNode["state"]) {
  switch (s) {
    case "found":
      return { label: "SAT", color: "#2ecc71" };
    case "live":
      return { label: "ALIVE", color: "#4b8dff" };
    case "dead":
      return { label: "DEAD", color: "#9a9aa3" };
    case "pending":
      return { label: "PENDING", color: "#ffb84d" };
  }
}

type RFNode = Node<AppGraphNode & { isSelected?: boolean; isActivePath?: boolean }>;
type RFEdge = Edge<AppGraphEdge>;

function buildLayout(nodes: AppGraphNode[], edges: AppGraphEdge[]): { rfnodes: RFNode[]; rfedges: RFEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 340, ranksep: 260, marginx: 40, marginy: 40 });

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
      width: NODE_W,
      height: NODE_H,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      handles: [
        { id: "source", type: "source", position: Position.Bottom, x: 0, y: 0 },
        { id: "target", type: "target", position: Position.Top, x: 0, y: 0 },
      ],
      data: { ...n, isSelected: false, isActivePath: false },
    };
  });

  const rfedges: RFEdge[] = edges.map((e) => {
    const pointsToFound = nodes.find((n) => n.id === e.to)?.state === "found";
    return {
      id: `${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      data: e,
      label: e.constraint ? truncateLabel(e.constraint) : undefined,
      labelStyle: {
        fill: "var(--color-muted-foreground)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 500,
      },
      labelShowBg: true,
      labelBgStyle: {
        fill: "var(--color-surface-2)",
        stroke: "var(--color-border)",
        strokeWidth: 1,
      },
      labelBgPadding: [5, 8],
      labelBgBorderRadius: 8,
      style: {
        stroke: pointsToFound ? "var(--color-found)" : "rgba(255,255,255,0.5)",
        strokeWidth: 2.5,
        strokeDasharray: pointsToFound ? "3 7" : undefined,
      },
      className: pointsToFound ? "flow-anim" : undefined,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: pointsToFound ? "var(--color-found)" : "rgba(255,255,255,0.55)",
      },
    };
  });

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

interface ExecNodeProps extends NodeProps<Node<AppGraphNode>> {
  data: AppGraphNode & { isSelected?: boolean; isActivePath?: boolean };
}

function ExecNode({ data }: ExecNodeProps) {
  const isSelected = data.isSelected ?? false;
  const isActivePath = data.isActivePath ?? false;
  const badge = badgeFor(data.state);
  const isFound = data.state === "found";
  const labelText = truncateLabel(data.label);

  return (
    <motion.div
      whileHover={{
        scale: 1.03,
        y: -2,
        borderColor: "rgba(255,255,255,0.2)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
      }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="relative flex cursor-pointer flex-col justify-between select-none group"
      style={{
        width: NODE_W,
        height: NODE_H,
        borderRadius: 16,
        padding: "16px",
        background: "#2a2a2d",
        border: isSelected
          ? "1.5px solid #4b8dff"
          : isActivePath
            ? "1px solid rgba(75,141,255,0.45)"
            : "1px solid rgba(255,255,255,0.08)",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(75,141,255,0.3), 0 12px 32px rgba(0,0,0,0.4)"
          : isActivePath
            ? "0 0 0 1px rgba(75,141,255,0.2), 0 8px 24px rgba(0,0,0,0.35)"
            : "0 8px 24px rgba(0,0,0,0.35)",
        zIndex: isSelected ? 1000 : 10,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "#fff",
          border: "2px solid #2a2a2d",
          width: 10,
          height: 10,
          top: -5,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "#fff",
          border: "2px solid #2a2a2d",
          width: 10,
          height: 10,
          bottom: -5,
        }}
      />

      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: badge.color, boxShadow: `0 0 8px ${badge.color}66` }}
        />
        <span
          className="truncate text-[16px] font-semibold leading-none tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
        >
          {labelText}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-[13px] font-medium leading-none text-muted-foreground">
          PC <span className="text-foreground/90">{data.pc}</span>
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150 group-hover:brightness-125"
          style={{
            color: badge.color,
            backgroundColor: `color-mix(in srgb, ${badge.color} 16%, transparent)`,
            border: `1px solid ${colorMixAlpha(badge.color)}`,
          }}
        >
          {badge.label}
        </span>
      </div>

      {isFound && data.findings[0] && (
        <span className="pointer-events-none absolute -top-2 right-4 rounded-full bg-[#2ecc71]/90 px-2 py-0.5 text-[10px] font-semibold text-black">
          {data.findings[0].type}
        </span>
      )}
    </motion.div>
  );
}

function colorMixAlpha(color: string) {
  return `color-mix(in srgb, ${color} 30%, transparent)`;
}

const nodeTypes = { execNode: ExecNode } as const;

interface GraphPaneProps {
  nodes: AppGraphNode[];
  edges: AppGraphEdge[];
  selected: string | null;
  setSelected: (id: string | null) => void;
}

export default function GraphPane(props: GraphPaneProps) {
  return (
    <ReactFlowProvider>
      <GraphPaneInner {...props} />
    </ReactFlowProvider>
  );
}

function GraphPaneInner({ nodes, edges, selected, setSelected }: GraphPaneProps) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const reactFlow = useReactFlow();

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

  const isHighlighting = highlightedId !== null && activeIds.size > 0;

  useEffect(() => {
    setFlowNodes(layoutedNodes);
    setFlowEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setFlowNodes, setFlowEdges]);

  // Refit and center after every trace so the whole graph fills the canvas
  // with comfortable margins while keeping node content readable.
  useEffect(() => {
    if (layoutedNodes.length === 0) return;
    const timer = setTimeout(() => {
      reactFlow.fitView({
        padding: 0.18,
        duration: 350,
        maxZoom: 1.1,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [layoutedNodes, layoutedEdges, reactFlow]);

  // Smoothly center the camera on the selected node.
  useEffect(() => {
    if (selected && layoutedNodes.some((n) => n.id === selected)) {
      const timer = setTimeout(() => {
        reactFlow.fitView({
          nodes: [{ id: selected }],
          padding: 0.6,
          duration: 400,
          maxZoom: 1.3,
        });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [selected, reactFlow, layoutedNodes]);

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

  const displayNodes: RFNode[] = flowNodes.map((n) => {
    const id = n.id;
    const active = isHighlighting && activeIds.has(id);
    return {
      ...n,
      zIndex: id === selected ? 1000 : 10,
      data: {
        ...(n.data as AppGraphNode),
        isSelected: id === selected,
        isActivePath: active,
      },
    };
  });

  const displayEdges: RFEdge[] = flowEdges.map((e) => {
    if (!isHighlighting) return e;
    const active = activeIds.has(e.source) && activeIds.has(e.target);
    return {
      ...e,
      style: {
        ...e.style,
        stroke: active ? "var(--color-found)" : "rgba(255,255,255,0.5)",
        strokeWidth: 2.5,
        opacity: 1,
        strokeDasharray: active ? "3 7" : undefined,
      },
      className: active ? "flow-anim" : undefined,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: active ? "var(--color-found)" : "rgba(255,255,255,0.55)",
      },
    };
  });

  const foundCount = nodes.filter((n) => n.state === "found").length;

  return (
    <Panel
      title="Execution graph"
      subtitle={
        nodes.length > 0
          ? `${nodes.length} states · ${foundCount} finding${foundCount === 1 ? "" : "s"}`
          : undefined
      }
      bodyClassName="relative min-h-0"
      className="bg-[#1b1b1d]"
    >
      {nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="card max-w-[320px] p-8 text-center">
            <p className="text-[15px] font-semibold text-foreground">No execution data yet</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Write a program in the source panel and press{" "}
              <span className="font-medium text-foreground">Run Trace</span> to explore its paths.
            </p>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.18, maxZoom: 1.1 }}
          minZoom={0.2}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={"dots" as BackgroundVariant}
            gap={26}
            size={1.6}
            color="rgba(255,255,255,0.08)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </Panel>
  );
}
