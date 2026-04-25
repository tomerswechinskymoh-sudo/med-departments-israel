import Link from "next/link";
import {
  buildSocialStartPath,
  socialProviderLabel,
  type SocialAccountIntent,
  type SocialAuthMode,
  type SocialAuthProvider
} from "@/lib/social-auth";

const providerStyles = {
  google:
    "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
  facebook:
    "border-[#1877f2]/20 bg-[#1877f2] text-white hover:bg-[#1464cf]"
} as const;

export function SocialAuthLink({
  provider,
  mode,
  nextPath,
  accountIntent,
  label,
  className = ""
}: {
  provider: SocialAuthProvider;
  mode: SocialAuthMode;
  nextPath?: string;
  accountIntent?: SocialAccountIntent;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={buildSocialStartPath({ provider, mode, nextPath, accountIntent })}
      className={`inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${providerStyles[provider]} ${className}`.trim()}
    >
      {label ?? `Continue with ${socialProviderLabel(provider)}`}
    </Link>
  );
}
