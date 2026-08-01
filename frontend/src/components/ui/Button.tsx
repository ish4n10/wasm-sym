import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[#4b8dff] text-white shadow-button hover:brightness-110 disabled:opacity-40",
  secondary:
    "bg-surface-2 text-foreground border border-border shadow-button hover:bg-hover",
  ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5",
};

export function Button({ className, variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2 text-[13px] font-semibold",
        "transition-[background,box-shadow,transform,color,filter] duration-200",
        "hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
        "active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
