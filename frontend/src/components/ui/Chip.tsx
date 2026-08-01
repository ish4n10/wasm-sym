import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Tone = "neutral" | "live" | "dead" | "found" | "pending" | "accent";

interface ChipProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  icon?: ReactNode;
}

const tones: Record<Tone, string> = {
  neutral: "text-muted-foreground bg-white/4",
  live: "text-[#2ecc71] bg-[#2ecc71]/10 border-[#2ecc71]/20",
  dead: "text-[#a0a0a8] bg-white/4",
  found: "text-[#4b8dff] bg-[#4b8dff]/10 border-[#4b8dff]/20",
  pending: "text-[#ffb84d] bg-[#ffb84d]/10 border-[#ffb84d]/20",
  accent: "text-[#4b8dff] bg-[#4b8dff]/12 border-[#4b8dff]/25",
};

export function Chip({ children, tone = "neutral", className, icon }: ChipProps) {
  return (
    <span className={cn("chip", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
