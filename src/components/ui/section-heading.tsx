export function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="text-xs font-semibold text-brand-600">{eyebrow}</p> : null}
      <h2 className="mt-1 text-xl font-bold tracking-tight text-ink md:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}
