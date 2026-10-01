import Image from "next/image";
import { siteIdentity } from "@/lib/brand-copy";

export function SiteBrand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" dir="ltr">
      <Image
        src={inverse ? "/logos/logo-mark-light.svg" : "/logos/logo-mark.svg"}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0"
      />
      <span className={inverse ? "font-bold tracking-tight text-white" : "font-bold tracking-tight text-brand-800"}>
        hitmachut<span className={inverse ? "text-teal-300" : "text-teal-700"}>.org</span>
      </span>
      <span className="sr-only">{siteIdentity.descriptor}</span>
    </span>
  );
}
