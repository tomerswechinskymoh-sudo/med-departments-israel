import { cn } from "@/lib/utils";

function initialsFromLabel(label: string) {
  const cleaned = label.replace(/["']/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`;
  }

  return cleaned.slice(0, 2);
}

const paletteMap = {
  hero: "from-brand-900 via-brand-700 to-teal-500",
  department: "from-brand-800 via-brand-700 to-cyan-500",
  institution: "from-teal-700 via-brand-700 to-brand-400",
  head: "from-amber-300 via-amber-200 to-white"
} as const;

export function PlaceholderVisual({
  label,
  caption,
  variant = "department",
  className,
  circle = false
}: {
  label: string;
  caption?: string;
  variant?: keyof typeof paletteMap;
  className?: string;
  circle?: boolean;
}) {
  const initials = initialsFromLabel(label);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden border border-white/60 bg-slate-100 shadow-panel",
        circle ? "aspect-square rounded-full" : "rounded-[2rem]",
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", paletteMap[variant])} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_24%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 text-white">
        <div>
          <p className={cn("font-bold", circle ? "text-3xl" : "text-2xl")}>{label}</p>
          {caption ? <p className="mt-1 text-sm text-white/85">{caption}</p> : null}
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15 font-bold uppercase text-white/95 shadow-lg backdrop-blur",
            circle ? "h-16 w-16 text-xl" : "h-16 w-16 text-lg"
          )}
        >
          {initials}
        </div>
      </div>
    </div>
  );
}
