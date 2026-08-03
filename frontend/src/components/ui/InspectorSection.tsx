import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils";

interface InspectorSectionProps {
  title: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function InspectorSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: InspectorSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
          {badge}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            !open && "-rotate-90",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="max-h-[45dvh] overflow-y-auto px-4 pb-3.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
