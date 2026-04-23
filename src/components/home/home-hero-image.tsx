export function HomeHeroImage() {
  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] shadow-panel">
      <img
        src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1400&q=80"
        alt="רופאה צעירה בסביבה רפואית מקצועית"
        className="h-full min-h-[420px] w-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/82 via-brand-900/36 to-teal-500/18" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.26),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_28%)]" />
      <div className="absolute inset-x-6 bottom-6 flex max-w-sm flex-col gap-3 text-white">
        <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
          שווה לראות את התמונה המלאה
        </span>
        <h2 className="text-2xl font-bold leading-tight">
          לא רק לשמוע. להבין איך מחלקה מרגישה לפני שמתחייבים.
        </h2>
      </div>
    </div>
  );
}
