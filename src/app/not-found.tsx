import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-4xl items-center justify-center px-4">
      <div className="rounded-[2rem] border border-brand-100 bg-white/85 p-10 text-center shadow-panel">
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-3 text-3xl font-bold text-ink">העמוד שחיפשת לא נמצא</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
          ייתכן שהקישור השתנה או שהמחלקה אינה זמינה כרגע לצפייה ציבורית.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white"
          >
            חזרה לדף הבית
          </Link>
          <Link
            href="/departments"
            className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-800"
          >
            עיון במחלקות
          </Link>
        </div>
      </div>
    </main>
  );
}
