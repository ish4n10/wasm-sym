import type { HTMLAttributes } from "react";
import { cn } from "../../utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  interactive?: boolean;
  enter?: boolean;
}

export function Card({ className, hover, interactive, enter, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "card",
        hover && "card-hover",
        interactive && "cursor-pointer",
        enter && "card-enter",
        className,
      )}
      {...props}
    />
  );
}
