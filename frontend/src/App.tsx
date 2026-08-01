import { useState, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import EditorPane from "./components/EditorPane";
import GraphPane from "./components/GraphPane";
import InspectorPane from "./components/InspectorPane";
import FindingsPane from "./components/FindingsPane";
import OpcodesPane from "./components/OpcodesPane";
import { Toolbar, type ToolbarTab } from "./components/ui/Toolbar";
import { StatusBar } from "./components/ui/StatusBar";
import { executeCode, type ExecuteResult } from "./api";

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

const TABS: ToolbarTab[] = [
  { key: "explore", label: "Explore" },
  { key: "findings", label: "Findings" },
  { key: "opcodes", label: "Opcode Reference" },
];

export default function App() {
  const [code, setCode] = useState(DEMO_PROGRAM);
  const [inputs, setInputs] = useState<Record<string, number>>({ local_0: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("explore");

  const exec = useMutation<ExecuteResult, Error, { code: string; inputs: Record<string, number> }>({
    mutationFn: ({ code, inputs }) => executeCode(code, inputs),
  });

  const handleRun = useCallback(() => {
    exec.mutate({ code, inputs });
  }, [code, inputs, exec]);

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

  const editorProps = {
    code,
    setCode,
    inputs,
    setInputs,
    highlightedLine: selectedNode ? selectedNode.pc : null,
  };

  const inspectorProps = {
    node: selectedNode,
    findings: selectedNodeFindings,
    constraints: selectedNode?.constraints ?? [],
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <Toolbar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(k) => setActiveTab(k as Tab)}
        onRun={handleRun}
        loading={exec.isPending}
        statesCount={stats.total}
        findingsCount={stats.found}
      />

      <main className="min-h-0 flex-1 p-4">
        <div className="grid h-full min-h-0 grid-cols-[minmax(270px,20%)_minmax(0,1fr)_minmax(260px,20%)] grid-rows-[minmax(0,1fr)] gap-4">
          <EditorPane {...editorProps} />
          {activeTab === "explore" ? (
            <GraphPane
              nodes={exec.data?.nodes ?? []}
              edges={exec.data?.edges ?? []}
              selected={selected}
              setSelected={setSelected}
            />
          ) : activeTab === "findings" ? (
            <FindingsPane data={exec.data ?? null} />
          ) : (
            <OpcodesPane />
          )}
          <InspectorPane {...inspectorProps} />
        </div>
      </main>

      <StatusBar
        states={stats.total}
        findings={stats.found}
        live={stats.live}
        dead={stats.dead}
        running={exec.isPending}
        error={handlerError}
      />
    </div>
  );
}
