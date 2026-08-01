import { useQuery } from "@tanstack/react-query";
import { fetchOpcodes } from "../api";
import { Panel } from "./ui/Panel";

export default function OpcodesPane() {
  const { data: opcodes } = useQuery({
    queryKey: ["opcodes"],
    queryFn: fetchOpcodes,
  });

  return (
    <Panel title="Opcode Reference" subtitle="Supported instruction set">
      <div className="h-full overflow-y-auto p-4 pt-1">
        {!opcodes ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[13px] text-muted-foreground">Loading opcodes…</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(opcodes).map(([category, ops]) => (
              <div key={category}>
                <div className="section-label mb-2.5 px-1">{category}</div>
                <div className="card overflow-hidden">
                  {Object.entries(ops).map(([op, desc], i) => (
                    <div
                      key={op}
                      className={`flex items-baseline gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03] ${
                        i > 0 ? "border-t border-white/4" : ""
                      }`}
                    >
                      <span className="text-mono w-32 shrink-0 text-[12px] font-semibold text-foreground/90">
                        {op}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] leading-snug text-muted-foreground">
                        {desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
