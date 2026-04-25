import {
  ClipboardHeartIcon,
  DepartmentDirectoryIcon,
  DoctorAvatarIcon,
  HospitalBuildingIcon,
  SearchPulseIcon,
  StudentAvatarIcon
} from "@/components/ui/med-icons";
import { cn } from "@/lib/utils";

const paletteMap = {
  hero: "from-brand-900 via-brand-700 to-teal-500",
  department: "from-[#0a2742] via-brand-700 to-cyan-500",
  institution: "from-teal-800 via-brand-700 to-brand-400",
  head: "from-amber-100 via-white to-teal-50"
} as const;

const accentMap = {
  hero: {
    icon: SearchPulseIcon,
    chip: "סיור מהיר מבפנים",
    iconTone: "text-white",
    badgeTone: "border-white/25 bg-white/12 text-white"
  },
  department: {
    icon: DepartmentDirectoryIcon,
    chip: "עמוד מחלקה",
    iconTone: "text-white",
    badgeTone: "border-white/25 bg-white/12 text-white"
  },
  institution: {
    icon: HospitalBuildingIcon,
    chip: "מוסד רפואי",
    iconTone: "text-white",
    badgeTone: "border-white/25 bg-white/12 text-white"
  },
  head: {
    icon: DoctorAvatarIcon,
    chip: "הובלת המחלקה",
    iconTone: "text-brand-900",
    badgeTone: "border-brand-200 bg-white/85 text-brand-900"
  }
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
  const accent = accentMap[variant];
  const Icon =
    circle && variant === "head"
      ? DoctorAvatarIcon
      : circle && variant === "hero"
        ? StudentAvatarIcon
        : accent.icon;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden border border-white/60 bg-slate-100 shadow-panel",
        circle ? "aspect-square rounded-full" : "rounded-[2rem]",
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", paletteMap[variant])} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_center,rgba(34,211,238,0.15),transparent_34%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -left-12 top-8 h-32 w-32 rounded-full bg-white/12 blur-2xl" />
      <div className="absolute -bottom-6 right-6 h-44 w-44 rounded-full bg-teal-200/15 blur-3xl" />

      {circle ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex h-[72%] w-[72%] items-center justify-center rounded-full border border-white/65 bg-white/72 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
            <div className={cn("absolute -bottom-1 h-9 w-9 rounded-full border shadow-md", accent.badgeTone)}>
              <ClipboardHeartIcon className="m-2 h-5 w-5" />
            </div>
            <Icon className={cn("h-24 w-24", accent.iconTone)} />
          </div>
        </div>
      ) : (
        <>
          <div className="absolute right-6 top-6">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-xl",
                accent.badgeTone
              )}
            >
              <Icon className="h-4 w-4" />
              {accent.chip}
            </span>
          </div>

          <div className="absolute left-6 top-8 flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/20 bg-white/12 shadow-xl shadow-brand-950/20 backdrop-blur-sm">
            <Icon className={cn("h-12 w-12", accent.iconTone)} />
          </div>

          <div className="absolute inset-x-6 bottom-6 text-white">
            <p className="max-w-[18rem] text-2xl font-bold tracking-tight">{label}</p>
            {caption ? <p className="mt-2 text-sm leading-6 text-white/88">{caption}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}
