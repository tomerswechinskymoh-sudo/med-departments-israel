import { siteIdentity } from "@/lib/brand-copy";
export function SiteBrand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`site-wordmark${inverse ? " inverse" : ""}`}>
      <span className="wordmark-name">
        <strong>התמחות</strong>
        <span dir="ltr">.org</span>
      </span>
      <span className="wordmark-caption">בוחרים היום את הרפואה של מחר</span>
      <span className="sr-only">
        {siteIdentity.name} — {siteIdentity.descriptor}
      </span>
    </span>
  );
}
