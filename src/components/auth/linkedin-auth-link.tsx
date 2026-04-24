import Link from "next/link";
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
  className = ""
}: {
  mode: LinkedInAuthMode;
  nextPath?: string;
  accountIntent?: LinkedInAccountIntent;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={buildLinkedInStartPath({ mode, nextPath, accountIntent })}
      className={`inline-flex items-center justify-center rounded-2xl border border-[#0a66c2]/20 bg-[#0a66c2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#084f96] ${className}`.trim()}
    >
      {label}
    </Link>
  );
}
