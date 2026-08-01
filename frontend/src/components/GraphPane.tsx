import { useMemo, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { Panel } from "./ui/Panel";
import type { GraphNode as AppGraphNode, GraphEdge as AppGraphEdge } from "../api";

const NODE_W = 208;
const NODE_H = 104;

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

function badgeText(s: AppGraphNode["state"]) {
  switch (s) {
    case "live": return "alive";
    case "dead": return "dead";
    case "found": return "sat";
    case "pending": return "pending";
  }
}

type RFNode = Node<AppGraphNode>;
type RFEdge = Edge<AppGraphEdge>;

function buildLayout(nodes: AppGraphNode[], edges: AppGraphEdge[]): { rfnodes: RFNode[]; rfedges: RFEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 210, ranksep: 190, marginx: 60, marginy: 60 });

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
        stroke: pointsToFound ? "url(#edge-found)" : "url(#edge-plain)",
        strokeWidth: 2,
        strokeDasharray: pointsToFound ? "3 7" : undefined,
      },
      className: pointsToFound ? "flow-anim" : undefined,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: pointsToFound ? "var(--color-found)" : "rgba(255,255,255,0.2)",
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
  data: AppGraphNode & { isSelected?: boolean };
}

function ExecNode({ data }: ExecNodeProps) {
  const isSelected = data.isSelected ?? false;
  const stateColor = colorFor(data.state);
  const isFound = data.state === "found";
  const isDead = data.state === "dead";
  const labelText = data.label.length > 26 ? data.label.slice(0, 24) + "…" : data.label;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative flex flex-col justify-between overflow-hidden text-left"
      style={{
        width: NODE_W,
        height: NODE_H,
        borderRadius: 16,
        padding: "14px 16px 12px",
        background: "linear-gradient(180deg, #2b2b2f 0%, #222225 100%)",
        border: isSelected
          ? "1px solid rgba(75,141,255,0.6)"
          : isFound
            ? "1px solid rgba(75,141,255,0.35)"
            : "1px solid rgba(255,255,255,0.07)",
        boxShadow: isSelected
          ? "var(--shadow-node-selected)"
          : isFound
            ? "0 0 0 1px rgba(75,141,255,0.15), var(--shadow-node)"
            : "var(--shadow-node)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: stateColor,
          border: "2px solid var(--color-surface-2)",
          width: 10,
          height: 10,
          top: -5,
          boxShadow: `0 0 0 3px rgba(0,0,0,0.25)`,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: stateColor,
          border: "2px solid var(--color-surface-2)",
          width: 10,
          height: 10,
          bottom: -5,
          boxShadow: `0 0 0 3px rgba(0,0,0,0.25)`,
        }}
      />

      <div className="flex items-center gap-2.5">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `color-mix(in srgb, ${stateColor} 16%, transparent)`,
            boxShadow: `inset 0 0 0 1.5px ${stateColor}`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: stateColor }}
          />
        </span>
        <span className="text-mono text-[13px] font-semibold leading-tight text-foreground truncate">
          {labelText}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-mono text-[11px] text-muted-foreground">pc {data.pc}</span>
        <span
          className="text-mono rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]"
          style={{
            color: stateColor,
            backgroundColor: `color-mix(in srgb, ${stateColor} 14%, transparent)`,
          }}
        >
          {badgeText(data.state)}
        </span>
      </div>

      {isFound && data.findings[0] && (
        <div
          className="absolute bottom-1 left-4 right-4 truncate text-[10px] leading-tight"
          style={{ color: "var(--color-found)" }}
        >
          {data.findings[0].type}
        </div>
      )}

      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
        style={{
          backgroundColor: isDead ? "transparent" : stateColor,
          opacity: isDead ? 0 : 0.9,
          boxShadow: isFound ? `0 0 8px ${stateColor}` : undefined,
        }}
      />
    </motion.div>
  );
}

const nodeTypes = { execNode: ExecNode } as const;

interface GraphPaneProps {
  nodes: AppGraphNode[];
  edges: AppGraphEdge[];
  selected: string | null;
  setSelected: (id: string | null) => void;
}

export default function GraphPane({ nodes, edges, selected, setSelected }: GraphPaneProps) {
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
            : { opacity: 0.28, pointerEvents: "none" as const },
        })),
      );
      setFlowEdges(
        layoutedEdges.map((e) => {
          const dim = !activeIds.has(e.source) || !activeIds.has(e.target);
          return {
            ...e,
            style: dim ? { ...e.style, opacity: 0.2 } : e.style,
            labelStyle: dim ? { ...e.labelStyle, opacity: 0.2 } : e.labelStyle,
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

  const foundCount = nodes.filter((n) => n.state === "found").length;

  return (
    <Panel
      title="Execution graph"
      subtitle={nodes.length > 0 ? `${nodes.length} states · ${foundCount} finding${foundCount === 1 ? "" : "s"}` : undefined}
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
          nodes={flowNodes.map((n) => ({
            ...n,
            data: { ...(n.data as AppGraphNode), isSelected: (n.data as AppGraphNode).id === selected },
          }))}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.35 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <svg width={0} height={0} className="absolute" aria-hidden>
            <defs>
              <linearGradient id="edge-found" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(75,141,255,0.15)" />
                <stop offset="100%" stopColor="rgba(75,141,255,0.55)" />
              </linearGradient>
              <linearGradient id="edge-plain" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
              </linearGradient>
            </defs>
          </svg>
          <Background
            variant={"dots" as BackgroundVariant}
            gap={26}
            size={1.5}
            color="rgba(255,255,255,0.07)"
            style={{ opacity: 1 }}
          />
          <Controls showInteractive={false} />
        </ReactFlow>
      )}
    </Panel>
  );
}
