import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn("mx-auto w-full max-w-7xl px-4 py-6 md:px-5", className)}
    >
      {children}
    </main>
  );
}
