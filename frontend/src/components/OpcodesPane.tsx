import { useQuery } from "@tanstack/react-query";
import { fetchOpcodes } from "../api";

export default function OpcodesPane() {
  const { data: opcodes } = useQuery({
    queryKey: ["opcodes"],
    queryFn: fetchOpcodes,
  });

  return (
    <section className="flex min-h-0 flex-col bg-surface/20">
      <div className="hairline-b flex h-11 items-center px-4">
        <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">opcode reference</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!opcodes ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-mono text-[12px] text-muted-foreground/60">Loading opcodes...</p>
          </div>
        ) : (
          Object.entries(opcodes).map(([category, ops]) => (
            <div key={category} className="mb-5">
              <div className="text-mono mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {category}
              </div>
              <div className="space-y-1">
                {Object.entries(ops).map(([op, desc]) => (
                  <div
                    key={op}
                    className="text-mono flex items-baseline justify-between rounded-md bg-surface px-3 py-2 text-[11px]"
                  >
                    <span className="font-medium text-foreground/90">{op}</span>
                    <span className="ml-3 truncate text-right text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
