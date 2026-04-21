export default function DepartmentsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-[2rem] border border-brand-100 bg-white/70"
          />
        ))}
      </div>
    </main>
  );
}
