interface StatusBarProps {
  states: number;
  findings: number;
  live: number;
  dead: number;
  running: boolean;
  error: string | null;
}

function Dot() {
  return <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/40" />;
}

export function StatusBar({ states, findings, live, dead, running, error }: StatusBarProps) {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between px-6 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-[#ffb84d]" : "bg-[#2ecc71]"}`} />
          <span>Z3 Ready</span>
        </span>
        {running && <span className="text-[#ffb84d]">running…</span>}
      </div>

      <div className="flex items-center gap-3">
        {error && <span className="text-[#ff6b6b]">error: {error}</span>}
        <span>{states} states</span>
        <Dot />
        <span>{findings} findings</span>
        <Dot />
        <span>live {live}</span>
        <Dot />
        <span>dead {dead}</span>
      </div>
    </footer>
  );
}
