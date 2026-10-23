import Image from "next/image";

/** User-supplied synthetic image, approved 2026-10-21. See the asset register. */
export function HomepageImage({
  priority = false,
  className = "",
  sizes = "(max-width: 639px) 100vw, 55vw",
  decorative = false,
}: {
  priority?: boolean;
  className?: string;
  sizes?: string;
  decorative?: boolean;
}) {
  return (
    <figure className={`clinicians-illustration ${className}`}>
      <Image
        src="/images/clinicians-illustration.webp"
        alt={decorative ? "" : "איור של שני אנשי צוות רפואי המעיינים יחד בטאבלט במסדרון"}
        fill
        sizes={sizes}
        priority={priority}
        quality={85}
      />
    </figure>
  );
}
