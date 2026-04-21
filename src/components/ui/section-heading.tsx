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
      {eyebrow ? <p className="text-sm font-semibold text-brand-600">{eyebrow}</p> : null}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">{description}</p> : null}
    </div>
  );
}
