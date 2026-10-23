export default function DepartmentDetailsLoading() {
  return (
    <main aria-busy="true" aria-label="טעינת נתוני המחלקות" className="mx-auto min-h-screen max-w-7xl px-4 py-16 md:px-6">
      <div className="space-y-6">
        <div className="h-56 animate-pulse rounded-[2rem] border border-brand-100 bg-white/70" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-[2rem] border border-brand-100 bg-white/70" />
          <div className="h-72 animate-pulse rounded-[2rem] border border-brand-100 bg-white/70" />
        </div>
      </div>
    </main>
  );
}
