"use client";

import { useEffect, useState } from "react";
import { getHospitalInitials, getHospitalLogo, getReviewedInstitutionKeyByName } from "./hospital-logos";
import { cn } from "@/lib/utils";

type InstitutionLogoProps = {
  institution: {
    id?: string | null;
    brandingKey?: string | null;
    type?: string | null;
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
  lg: "h-20 w-20",
};

export function InstitutionLogo({
  institution,
  size = "md",
  className,
}: InstitutionLogoProps) {
  const logoSrc = getHospitalLogo({ ...institution, brandingKey: getReviewedInstitutionKeyByName(institution.name) ?? institution.brandingKey });
  const [failedLogoSrc, setFailedLogoSrc] = useState<string | null>(null);
  const initials = getHospitalInitials(institution.name);
  const renderedLogoSrc = logoSrc && logoSrc !== failedLogoSrc ? logoSrc : null;

  useEffect(() => {
    setFailedLogoSrc(null);
  }, [logoSrc]);

  return (
    <span
      className={cn(
        "institution-logo grid shrink-0 place-items-center overflow-hidden rounded-lg bg-white",
        sizeClasses[size],
        className,
      )}
    >
      {renderedLogoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={renderedLogoSrc}
          alt={
            institution.name ? `לוגו ${institution.name}` : "לוגו מוסד רפואי"
          }
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
          onError={() => setFailedLogoSrc(renderedLogoSrc)}
        />
      ) : (
        <span className="grid h-full w-full place-items-center bg-brand-50 text-base font-black text-brand-800">
          {initials}
        </span>
      )}
    </span>
  );
}
