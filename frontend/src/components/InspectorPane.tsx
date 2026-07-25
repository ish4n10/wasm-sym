import type { GraphNode, Finding } from "../api";

function colorFor(s: GraphNode["state"]) {
  switch (s) {
    case "live": return "var(--color-live)";
    case "dead": return "var(--color-dead)";
    case "found": return "var(--color-found)";
    case "pending": return "var(--color-pending)";
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="hairline-b px-5 py-4">
      <div className="text-mono mb-2.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color?: "found" | "live" | "dead" }) {
  const c = color ? colorFor(color as GraphNode["state"]) : undefined;
  return (
    <span className="text-mono inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
      style={{
        borderColor: c ?? "var(--color-border)",
        color: c ?? "var(--color-muted-foreground)",
        backgroundColor: c ? `color-mix(in oklab, ${c} 12%, transparent)` : "transparent",
      }}>
      {children}
    </span>
  );
}

interface InspectorPaneProps {
  node: GraphNode | null;
  findings: Finding[];
  constraints: string[];
}

export default function InspectorPane({ node, findings, constraints }: InspectorPaneProps) {
  if (!node) {
    return (
      <aside className="hairline-l flex min-h-0 flex-col bg-surface/40">
        <div className="hairline-b flex h-11 items-center justify-between px-4">
          <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">inspector</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-mono text-[12px] text-muted-foreground/60">Click a state to inspect</p>
        </div>
      </aside>
    );
  }

  const isFound = findings.length > 0;

  return (
    <aside className="hairline-l flex min-h-0 flex-col bg-surface/40">
      <div className="hairline-b flex h-11 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorFor(node.state) }} />
          <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">pc {node.pc}</span>
        </div>
        <span className="text-mono text-[11px] text-muted-foreground">{node.label}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="hairline-b px-5 py-5">
          <div className="text-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {isFound ? "bug finding" : "path summary"}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-mono text-[20px] leading-tight font-semibold tracking-tight"
              style={isFound ? { color: "var(--color-found)" } : undefined}>
              {node.label}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Tag>{node.state.toUpperCase()}</Tag>
            {isFound && findings.map((f, i) => (
              <Tag key={i} color="found">{f.type}</Tag>
            ))}
          </div>
        </div>

        {isFound && findings.map((f, fi) => (
          <div key={fi}>
            <Section title={`Finding #${fi + 1}: ${f.type}`}>
              <div className="flex items-center gap-2 mb-2">
                <Tag color="found">{f.type}</Tag>
                <Tag>@ pc {f.pc}</Tag>
              </div>

              {f.model && Object.keys(f.model).length > 0 && (
                <div className="text-mono divide-y divide-hairline overflow-hidden rounded-md border border-border mb-3">
                  {Object.entries(f.model).map(([name, value]) => (
                    <div key={name} className="flex items-center justify-between px-3 py-2 text-[11px]">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="text-live font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {f.constraints.length > 0 && (
                <div className="text-mono space-y-1">
                  {f.constraints.map((c, ci) => (
                    <div key={ci} className="rounded bg-surface/60 px-2.5 py-1.5 text-[10.5px] text-foreground/80 leading-relaxed">{c}</div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Reproduce">
              <div className="text-mono rounded-md border border-border bg-background/60 p-3 text-[11px] leading-relaxed text-foreground/80">
                {f.model && Object.keys(f.model).length > 0 ? (
                  <>
                    <div className="text-muted-foreground mb-1"># concrete input</div>
                    <div><span className="text-found">symvis</span> run</div>
                    {Object.entries(f.model).map(([name, value]) => (
                      <div key={name} className="pl-3">--{name}={value.replace(/\s/g, "")}</div>
                    ))}
                  </>
                ) : (
                  <span className="text-muted-foreground">No concrete model available</span>
                )}
              </div>
            </Section>
          </div>
        ))}

        {!isFound && (
          <Section title="Instruction">
            <div className="text-mono rounded-md bg-surface/60 px-3 py-2 text-[12px] text-foreground/80">
              {node.label}
            </div>
          </Section>
        )}

        <Section title="Path constraints">
          {constraints.length > 0 ? (
            <ul className="space-y-1">
              {constraints.map((c, i) => (
                <li key={i} className="text-mono flex items-start gap-2 rounded-md bg-surface/60 px-3 py-2 text-[11px] text-foreground/75">
                  <span className="mt-0.5 text-muted-foreground shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span className="break-all">{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-mono rounded-md bg-surface/60 px-3 py-2 text-[11px] text-muted-foreground/60">
              No path constraints
            </div>
          )}
        </Section>

        {node.via_condition && (
          <Section title="Branch condition">
            <div className="text-mono rounded-md bg-surface/60 px-3 py-2 text-[11px] text-foreground/80">
              {node.via_condition}
            </div>
          </Section>
        )}
      </div>
    </aside>
  );
}
