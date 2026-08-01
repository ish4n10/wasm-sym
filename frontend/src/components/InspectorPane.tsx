import { GitBranch, Hash, Link2, ScanSearch, TerminalSquare } from "lucide-react";
import type { GraphNode, Finding } from "../api";
import { Panel } from "./ui/Panel";
import { Chip } from "./ui/Chip";
import { InspectorSection } from "./ui/InspectorSection";

function colorFor(s: GraphNode["state"]) {
  switch (s) {
    case "live": return "var(--color-live)";
    case "dead": return "var(--color-dead)";
    case "found": return "var(--color-found)";
    case "pending": return "var(--color-pending)";
  }
}

function stateTone(s: GraphNode["state"]) {
  switch (s) {
    case "live": return "live" as const;
    case "dead": return "dead" as const;
    case "found": return "found" as const;
    case "pending": return "pending" as const;
  }
}

function findingTone(type: string) {
  if (type === "success") return "accent" as const;
  return "pending" as const;
}

interface InspectorPaneProps {
  node: GraphNode | null;
  findings: Finding[];
  constraints: string[];
}

export default function InspectorPane({ node, findings, constraints }: InspectorPaneProps) {
  const isFound = findings.length > 0;

  if (!node) {
    return (
      <Panel title="Inspector" subtitle="State details">
        <div className="flex h-full items-center justify-center px-6">
          <div className="card max-w-[260px] p-7 text-center">
            <ScanSearch size={20} strokeWidth={1.6} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Click a state in the graph to inspect its path and constraints.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Inspector"
      subtitle={
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorFor(node.state) }} />
          {node.label}
        </span>
      }
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 pt-1">
        <InspectorSection
          title="Current State"
          badge={
            <Chip tone={stateTone(node.state)} className="px-2 py-0 text-[9px]">
              {node.state.toUpperCase()}
            </Chip>
          }
        >
          <div className="flex items-center gap-4">
            <div>
              <div className="text-mono text-[11px] text-muted-foreground">pc</div>
              <div className="text-mono mt-1 text-[16px] font-semibold text-foreground">
                {node.pc}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-muted-foreground">instruction</div>
              <div className="text-mono mt-1 truncate text-[13px] font-medium text-foreground">
                {node.label}
              </div>
            </div>
          </div>
        </InspectorSection>

        {isFound ? (
          <InspectorSection
            title="Findings"
            badge={
              <Chip tone="accent" className="px-2 py-0 text-[9px]">
                {findings.length}
              </Chip>
            }
          >
            <div className="space-y-4">
              {findings.map((f, fi) => (
                <div key={fi} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Chip tone={findingTone(f.type)}>{f.type}</Chip>
                    <Chip>@ pc {f.pc}</Chip>
                  </div>

                  {f.model && Object.keys(f.model).length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <TerminalSquare size={12} strokeWidth={1.8} />
                        Registers
                      </div>
                      <div className="overflow-hidden rounded-xl bg-black/25">
                        {Object.entries(f.model).map(([name, value], i) => (
                          <div
                            key={name}
                            className={`flex items-center justify-between px-3.5 py-2 text-[12px] ${
                              i > 0 ? "border-t border-white/4" : ""
                            }`}
                          >
                            <span className="text-mono text-muted-foreground">{name}</span>
                            <span className="text-mono font-semibold text-[#2ecc71]">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {f.simplified_constraints && f.simplified_constraints.length > 0 && (
                    <div className="space-y-1.5">
                      {f.simplified_constraints.map((c, ci) => (
                        <ConstraintChip key={ci} label={c} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </InspectorSection>
        ) : (
          <InspectorSection title="Path Summary">
            <div className="text-mono rounded-xl bg-black/25 px-3.5 py-2.5 text-[12px] text-foreground/80">
              {node.label}
            </div>
          </InspectorSection>
        )}

        <InspectorSection
          title="Constraints"
          badge={
            <Chip className="px-2 py-0 text-[9px]">
              {constraints.length}
            </Chip>
          }
        >
          {constraints.length > 0 ? (
            <div className="space-y-1.5">
              {constraints.map((c, i) => (
                <ConstraintChip key={i} label={c} index={i} />
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">No path constraints.</p>
          )}
        </InspectorSection>

        {node.via_condition && (
          <InspectorSection title="Branch Condition">
            <ConstraintChip label={node.via_condition} icon={<GitBranch size={13} strokeWidth={1.8} />} />
          </InspectorSection>
        )}
      </div>
    </Panel>
  );
}

function ConstraintChip({
  label,
  icon,
  index,
}: {
  label: string;
  icon?: React.ReactNode;
  index?: number;
}) {
  return (
    <div className="constraint-chip">
      {icon ??
        (index !== undefined ? (
          <Hash size={11} strokeWidth={2} className="shrink-0 text-muted-foreground/70" />
        ) : (
          <Link2 size={13} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
        ))}
      <span className="break-all">{label}</span>
    </div>
  );
}
