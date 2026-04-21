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
        "rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-panel backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
