/** Original asset. Owner explicitly confirmed Ministry authorization on 2026-10-21.
 * See docs/final-design-review/asset-register.json. This does not claim transferred ownership. */
export function ApprovedBrand({
  placement = "header",
}: {
  placement?: "header" | "footer" | "account";
}) {
  return (
    <span className={`approved-brand approved-brand--${placement}`}>
      {/* The small original wordmark is served directly to retain its exact pixels. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/ministry-of-health-logo-he.jpg"
        alt="משרד הבריאות"
        width={227}
        height={70}
        decoding="async"
      />
    </span>
  );
}
