import Link from "next/link";
import { LinkedInLogoIcon } from "@/components/ui/med-icons";
import {
  buildLinkedInStartPath,
  type LinkedInAccountIntent,
  type LinkedInAuthMode
} from "@/lib/linkedin-auth-path";

export function LinkedInAuthLink({
  mode,
  nextPath,
  accountIntent,
  label = "Continue with LinkedIn",
  className = "",
  iconOnly = false
}: {
  mode: LinkedInAuthMode;
  nextPath?: string;
  accountIntent?: LinkedInAccountIntent;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  return (
    <Link
      href={buildLinkedInStartPath({ mode, nextPath, accountIntent })}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-2xl border border-[#0a66c2]/20 bg-[#0a66c2] text-sm font-semibold text-white transition hover:bg-[#084f96] ${iconOnly ? "h-12 w-12 rounded-full p-0" : "gap-2 px-4 py-3"} ${className}`.trim()}
    >
      <LinkedInLogoIcon className={iconOnly ? "h-5 w-5" : "h-4 w-4"} />
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </Link>
  );
}
