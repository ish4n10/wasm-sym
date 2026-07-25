import { useState, useMemo } from "react";
import type { ExecuteResult, Finding } from "../api";

const SUMMARY: Record<string, string> = {
  success:
    "This path reaches the target state.",
  unreachable:
    "This path reaches code that should never execute — a genuine bug.",
  division_by_zero:
    "This path divides by zero.",
  remainder_trap:
    "This path computes a remainder with a zero divisor.",
  out_of_bounds_access:
    "This path reads or writes memory outside the allocated buffer.",
};

interface FindingsPaneProps {
  data: ExecuteResult | null;
}

export default function FindingsPane({ data }: FindingsPaneProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const allFindings = useMemo(() => {
    if (!data) return [];
    const result: { finding: Finding; stateId: string; statePc: number }[] =
      [];
    for (const node of data.nodes) {
      for (const f of node.findings) {
        result.push({ finding: f, stateId: node.id, statePc: node.pc });
      }
    }
    const seen = new Set<string>();
    return result.filter((r) => {
      const key = `${r.finding.type}@${r.statePc}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!data || allFindings.length === 0) {
    return (
      <section className="flex min-h-0 flex-col bg-surface/20">
        <div className="hairline-b flex h-11 items-center px-4">
          <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            findings
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-mono text-[12px] text-muted-foreground/60">
            No findings yet — run a trace
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col bg-surface/20">
      <div className="hairline-b flex h-11 items-center justify-between px-4">
        <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          findings · {allFindings.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {allFindings.map((r, fi) => {
          const key = `f-${r.stateId}-${fi}`;
          const simp = r.finding.simplified_constraints ?? r.finding.constraints;
          const showRaw = expanded[key] ?? false;

          return (
            <div key={key} className="rounded-lg border border-border bg-surface">
              {/* ── Tier 1: Plain-language summary ── */}
              <div className="hairline-b flex items-start gap-2 px-3 py-2.5">
                <Badge type={r.finding.type} />
                <p className="text-mono mt-px text-[11px] leading-relaxed text-foreground/80">
                  {SUMMARY[r.finding.type] ?? r.finding.type}
                </p>
              </div>

              {/* ── Tier 2: Key facts ── */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>pc {r.statePc}</span>
                  {r.finding.type === "success" && (
                    <span className="rounded bg-found/10 px-1.5 py-0.5 text-[9px] text-found">
                      target state
                    </span>
                  )}
                </div>
                {r.finding.model && Object.keys(r.finding.model).length > 0 && (
                  <div className="mt-2 rounded border border-border/60 bg-background/40 px-2.5 py-2">
                    <div className="text-mono mb-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                      Triggering input
                    </div>
                    {Object.entries(r.finding.model).map(([name, value]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between py-0.5 text-[11px]"
                      >
                        <span className="text-mono text-muted-foreground">
                          {name}
                        </span>
                        <span className="text-mono font-medium text-live">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Tier 3: Collapsed constraints ── */}
              {simp.length > 0 && (
                <div className="hairline-t">
                  <button
                    onClick={() => toggle(key)}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-mono">
                      {showRaw ? "▾" : "▸"} Show {simp.length} path constraint
                      {simp.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                  {showRaw && (
                    <div className="space-y-0.5 px-3 pb-2.5">
                      {simp.map((c, ci) => (
                        <div
                          key={ci}
                          className="text-mono rounded bg-background/20 px-2 py-1 text-[10px] leading-relaxed text-foreground/70"
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Badge({ type }: { type: string }) {
  let cls = "bg-foreground/10 text-foreground/70";
  if (type === "success") cls = "bg-found/15 text-found";
  else if (
    type === "unreachable" ||
    type === "division_by_zero" ||
    type === "remainder_trap" ||
    type === "out_of_bounds_access"
  )
    cls = "bg-[#b91c1c]/15 text-[#ef4444]";

  return (
    <span
      className={`text-mono inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {type}
    </span>
  );
}
