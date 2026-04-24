import Image from "next/image";

export function HomeHeroImage() {
  return (
    <div className="relative isolate min-h-[420px] overflow-hidden rounded-[2rem] border border-brand-100/70 bg-gradient-to-br from-[#071426] via-[#0b2a45] to-[#1a4f79] shadow-panel">
      <Image
        src="/homepage-hero-doctor.png"
        alt="רופאה צעירה במסדרון בית חולים"
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 48vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,17,33,0.1),rgba(5,17,33,0.58))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,20,38,0.82),rgba(7,20,38,0.18),transparent)]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-brand-900/85 to-transparent" />

      <div className="absolute inset-x-6 bottom-6 flex max-w-sm flex-col gap-3 text-white">
        <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-xl">
          לבחור עם יותר ביטחון ופחות ניחושים
        </span>
        <h2 className="text-2xl font-bold leading-tight">
          תמונה ברורה יותר של המחלקה לפני שמתחייבים
        </h2>
      </div>
    </div>
  );
}
