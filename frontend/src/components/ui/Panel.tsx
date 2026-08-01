import type { ReactNode } from "react";
import { cn } from "../../utils";

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, subtitle, actions, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={cn("panel flex min-h-0 flex-col overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-none tracking-[-0.01em] text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1.5 text-[12px] leading-none text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
