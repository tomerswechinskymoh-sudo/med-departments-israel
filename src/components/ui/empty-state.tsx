import Link from "next/link";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <Card className="text-center">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-5 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </Card>
  );
}
