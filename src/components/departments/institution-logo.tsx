import { getInstitutionInitials, getInstitutionLogo } from "@/lib/institution-branding";
import { cn } from "@/lib/utils";

type InstitutionLogoProps = {
  institution: {
    name?: string | null;
    slug?: string | null;
    coverImageUrl?: string | null;
  };
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-12 w-12",
  md: "h-14 w-14",
  lg: "h-20 w-20"
};

export function InstitutionLogo({
  institution,
  size = "md",
  className
}: InstitutionLogoProps) {
  const logoSrc = getInstitutionLogo(institution);
  const initials = getInstitutionInitials(institution.name);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        sizeClasses[size],
        className
      )}
    >
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt={institution.name ? `לוגו ${institution.name}` : "לוגו מוסד רפואי"}
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
        />
      ) : (
        <span className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 via-white to-teal-50 text-base font-black text-brand-800">
          {initials}
        </span>
      )}
    </span>
  );
}
