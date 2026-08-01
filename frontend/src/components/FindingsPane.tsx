import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import type { ExecuteResult, Finding } from "../api";
import { Panel } from "./ui/Panel";
import { Chip } from "./ui/Chip";
import { cn } from "../lib/utils";

const SUMMARY: Record<string, string> = {
  success:
    "This path reaches the target state — a concrete input that satisfies every constraint.",
  unreachable:
    "This path reaches code that should never execute — a genuine bug.",
  division_by_zero:
    "This path divides by zero.",
  remainder_trap:
    "This path computes a remainder with a zero divisor.",
  out_of_bounds_access:
    "This path reads or writes memory outside the allocated buffer.",
};

function isBug(type: string) {
  return type !== "success";
}

function FindingIcon({ type }: { type: string }) {
  if (type === "success") {
    return <CheckCircle2 size={16} strokeWidth={1.8} className="text-[#4b8dff]" />;
  }
  return <AlertTriangle size={16} strokeWidth={1.8} className="text-[#ffb84d]" />;
}

interface FindingsPaneProps {
  data: ExecuteResult | null;
}

export default function FindingsPane({ data }: FindingsPaneProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const allFindings = useMemo(() => {
    if (!data) return [];
    const result: { finding: Finding; stateId: string; statePc: number }[] = [];
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

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!data || allFindings.length === 0) {
    return (
      <Panel title="Findings" subtitle="Detected states">
        <div className="flex h-full items-center justify-center px-6">
          <div className="card max-w-[260px] p-7 text-center">
            <CheckCircle2 size={20} strokeWidth={1.6} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              No findings yet — run a trace to surface target states and bugs.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Findings"
      subtitle={`${allFindings.length} unique finding${allFindings.length === 1 ? "" : "s"}`}
    >
      <div className="flex h-full flex-col gap-3 overflow-y-auto p-4 pt-1">
        {allFindings.map((r, fi) => {
          const key = `f-${r.stateId}-${fi}`;
          const simp = r.finding.simplified_constraints ?? r.finding.constraints;
          const showRaw = expanded[key] ?? false;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: fi * 0.03, ease: [0.2, 0.8, 0.2, 1] }}
              className="card card-hover overflow-hidden"
            >
              <div className="p-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <FindingIcon type={r.finding.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-relaxed text-foreground/90">
                      {SUMMARY[r.finding.type] ?? r.finding.type}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Chip tone={isBug(r.finding.type) ? "pending" : "accent"}>{r.finding.type}</Chip>
                      <Chip>pc {r.statePc}</Chip>
                    </div>
                  </div>
                </div>

                {r.finding.model && Object.keys(r.finding.model).length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-xl bg-black/25">
                    <div className="px-3.5 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Triggering input
                    </div>
                    {Object.entries(r.finding.model).map(([name, value]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between px-3.5 py-1.5 text-[12px]"
                      >
                        <span className="text-mono text-muted-foreground">{name}</span>
                        <span className="text-mono font-semibold text-[#2ecc71]">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {simp.length > 0 && (
                <div className="border-t border-white/4">
                  <button
                    onClick={() => toggle(key)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {simp.length} path constraint{simp.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronDown
                      size={14}
                      strokeWidth={1.8}
                      className={cn(
                        "text-muted-foreground transition-transform duration-200",
                        showRaw && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {showRaw && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1.5 px-5 pb-4">
                          {simp.map((c, ci) => (
                            <div
                              key={ci}
                              className="constraint-chip"
                            >
                              <span className="shrink-0 text-muted-foreground/70">
                                {String(ci + 1).padStart(2, "0")}
                              </span>
                              <span className="break-all">{c}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
}
