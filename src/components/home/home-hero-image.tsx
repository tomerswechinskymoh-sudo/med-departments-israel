import Image from "next/image";

export function HomeHeroImage() {
  return (
    <div className="relative isolate min-h-[420px] overflow-hidden rounded-[2rem] border border-brand-100/70 bg-gradient-to-br from-[#081625] via-[#0d2942] to-[#1d5379] shadow-panel">
      <Image
        src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1600&q=80"
        alt="רופאה צעירה בתחילת הדרך, במסדרון בית חולים בגוונים כחולים"
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 48vw"
        className="object-cover object-[62%_center]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(8,24,42,0.2),rgba(8,24,42,0.62))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.16),transparent_26%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-brand-900/78 to-transparent" />

      <div className="absolute inset-x-6 bottom-6 flex max-w-sm flex-col gap-3 text-white">
        <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-xl">
          רופאה צעירה, בסביבת בית חולים אמיתית
        </span>
        <h2 className="text-2xl font-bold leading-tight">
          תמונה רגועה, מקצועית ואנושית, שמתחברת לשפה הכחולה של המוצר.
        </h2>
      </div>
    </div>
  );
}
