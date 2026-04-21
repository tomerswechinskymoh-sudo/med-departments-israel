import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneClasses = {
  plain: "",
  soft: "rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-panel md:p-8",
  contrast: "rounded-[2rem] border border-brand-100/80 bg-gradient-to-b from-brand-50/80 to-white p-6 shadow-panel md:p-8"
};

export function HomeSection({
  children,
  tone = "plain",
  className
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return <section className={cn(toneClasses[tone], className)}>{children}</section>;
}
