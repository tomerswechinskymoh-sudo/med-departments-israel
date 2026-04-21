import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-brand-100/70 bg-white/92 p-6 shadow-panel backdrop-blur-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
