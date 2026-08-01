import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";
import logo from "../../assets/image.png";

export interface ToolbarTab {
  key: string;
  label: string;
}

interface ToolbarProps {
  tabs: ToolbarTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  onRun: () => void;
  loading: boolean;
  statesCount: number;
  findingsCount: number;
}

export function Toolbar({
  tabs,
  activeTab,
  onTabChange,
  onRun,
  loading,
  statesCount,
  findingsCount,
}: ToolbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[12px] bg-surface-2 shadow-card">
          <img src={logo} alt="SymVis" className="h-full w-full object-cover" />
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-foreground">
            SymVis
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            symbolic execution
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-1 rounded-[14px] bg-surface p-1 shadow-card">
        {tabs.map((t) => {
          const active = t.key === activeTab;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={cn(
                "relative rounded-[10px] px-4 py-1.5 text-[13px] font-medium transition-colors duration-200",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-[10px] bg-surface-2 shadow-button"
                  transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-4">
        {statesCount > 0 && (
          <div className="hidden items-center gap-2 text-[12px] text-muted-foreground md:flex">
            <span className="font-medium text-foreground/80">{statesCount} states</span>
            <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/50" />
            <span>{findingsCount} finding{findingsCount === 1 ? "" : "s"}</span>
          </div>
        )}
        <Button variant="primary" onClick={onRun} disabled={loading} className="min-w-[96px]">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          {loading ? "Running" : "Run Trace"}
        </Button>
      </div>
    </header>
  );
}
