import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <Card className="rounded-[1.75rem] border-brand-100/80 bg-gradient-to-b from-white to-brand-50/60">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-brand-900">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-6 text-slate-500">{helper}</p> : null}
    </Card>
  );
}
