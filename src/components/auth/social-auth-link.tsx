import Link from "next/link";
import { FacebookLogoIcon, GoogleLogoIcon } from "@/components/ui/med-icons";
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

const providerIcons = {
  google: GoogleLogoIcon,
  facebook: FacebookLogoIcon
} as const;

export function SocialAuthLink({
  provider,
  mode,
  nextPath,
  accountIntent,
  label,
  className = "",
  iconOnly = false
}: {
  provider: SocialAuthProvider;
  mode: SocialAuthMode;
  nextPath?: string;
  accountIntent?: SocialAccountIntent;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const Icon = providerIcons[provider];
  const resolvedLabel = label ?? `Continue with ${socialProviderLabel(provider)}`;

  return (
    <Link
      href={buildSocialStartPath({ provider, mode, nextPath, accountIntent })}
      aria-label={resolvedLabel}
      title={resolvedLabel}
      className={`inline-flex items-center justify-center rounded-2xl border text-sm font-semibold transition ${providerStyles[provider]} ${iconOnly ? "h-12 w-12 rounded-full p-0" : "gap-2 px-4 py-3"} ${className}`.trim()}
    >
      <Icon className={iconOnly ? "h-5 w-5" : "h-4 w-4"} />
      {iconOnly ? <span className="sr-only">{resolvedLabel}</span> : resolvedLabel}
    </Link>
  );
}
