import { useState, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import EditorPane from "./components/EditorPane";
import GraphPane from "./components/GraphPane";
import InspectorPane from "./components/InspectorPane";
import logo from "./assets/image.png";
import FindingsPane from "./components/FindingsPane";
import OpcodesPane from "./components/OpcodesPane";
import { executeCode } from "./api";

const DEMO_PROGRAM = `# Symbolic input: local_0 (a), local_1 (b)
local.get 0
i32.const 100
i32.lt_s
br_if 5
HALT
i32.const 50
local.get 1
i32.lt_s
br_if 11
HALT
nop
local.get 0
local.get 1
i32.add
i32.const 2
i32.mul
local.set 3
local.get 3
i32.const 300
i32.lt_s
br_if 22
HALT
local.get 0
i32.const 42
i32.store
local.get 0
i32.load
local.set 4
FOUND`;

type Tab = "explore" | "findings" | "opcodes";

export default function App() {
  const [code, setCode] = useState(DEMO_PROGRAM);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("explore");

  const exec = useMutation({ mutationFn: executeCode });

  const handleRun = useCallback(() => {
    exec.mutate(code);
  }, [code, exec]);

  const handlerError = exec.error
    ? (exec.error instanceof Error ? exec.error.message : "An error occurred")
    : null;

  const stats = useMemo(() => {
    if (!exec.data) return { total: 0, live: 0, dead: 0, found: 0, pending: 0 };
    const n = exec.data.nodes;
    return {
      total: n.length,
      live: n.filter((x) => x.state === "live").length,
      dead: n.filter((x) => x.state === "dead").length,
      found: n.filter((x) => x.state === "found").length,
      pending: n.filter((x) => x.state === "pending").length,
    };
  }, [exec.data]);

  const selectedNode = exec.data?.nodes.find((n) => n.id === selected) ?? null;
  const selectedNodeFindings = selectedNode?.findings ?? [];

  const tabs: { key: Tab; label: string }[] = [
    { key: "explore", label: "Explore" },
    { key: "findings", label: "Findings" },
    { key: "opcodes", label: "Opcode Reference" },
  ];

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="hairline-b flex h-14 items-center justify-between bg-surface/60 px-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SymVis" className="h-7 w-7 rounded-md object-cover" />
          <div className="flex items-baseline gap-2">
            <span className="text-serif text-[22px] italic leading-none">SymVis</span>
            <span className="text-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              symbolic execution
            </span>
          </div>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-[13px] transition-colors ${activeTab === t.key ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-mono text-[11px] text-muted-foreground">{stats.total} states · {stats.found} finding{stats.found === 1 ? "" : "s"}</span>
        </div>
      </header>

      {activeTab === "explore" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[380px_1fr_360px]">
          <EditorPane code={code} setCode={setCode} loading={exec.isPending} onRun={handleRun} />
          <GraphPane
            nodes={exec.data?.nodes ?? []}
            edges={exec.data?.edges ?? []}
            selected={selected}
            setSelected={setSelected}
          />
          <InspectorPane
            node={selectedNode}
            findings={selectedNodeFindings}
            constraints={selectedNode?.constraints ?? []}
          />
        </div>
      ) : activeTab === "findings" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[380px_1fr_360px]">
          <EditorPane code={code} setCode={setCode} loading={exec.isPending} onRun={handleRun} />
          <FindingsPane data={exec.data ?? null} />
          <InspectorPane
            node={selectedNode}
            findings={selectedNodeFindings}
            constraints={selectedNode?.constraints ?? []}
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[380px_1fr_360px]">
          <EditorPane code={code} setCode={setCode} loading={exec.isPending} onRun={handleRun} />
          <OpcodesPane />
          <InspectorPane
            node={selectedNode}
            findings={selectedNodeFindings}
            constraints={selectedNode?.constraints ?? []}
          />
        </div>
      )}

      <footer className="hairline-t flex h-8 items-center justify-between bg-surface/60 px-5 text-[11px] text-muted-foreground">
        <div className="text-mono flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-live" /> solver ready</span>
          <span>z3 · 4.13.0</span>
        </div>
        <div className="text-mono flex items-center gap-4">
          {handlerError && <span style={{ color: "var(--color-dead)" }}>error: {handlerError}</span>}
          {exec.isPending && <span className="text-found">running...</span>}
          <span>live {stats.live}</span>
          <span>dead {stats.dead}</span>
          <span style={{ color: "var(--color-found)" }}>found {stats.found}</span>
        </div>
      </footer>
    </div>
  );
}
