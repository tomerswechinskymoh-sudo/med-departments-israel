export function RatingStars({ value }: { value: number }) {
  const rounded = Math.round(value);

  return (
    <div className="flex items-center gap-1 text-amber-500" aria-label={`דירוג ${value} מתוך 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index}>{index < rounded ? "★" : "☆"}</span>
      ))}
      <span className="mr-1 text-xs font-semibold text-slate-600">{value.toFixed(1)}</span>
    </div>
  );
}
