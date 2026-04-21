import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function OfficialUpdatesList({
  updates
}: {
  updates: {
    id: string;
    title: string;
    body: string;
    publishedAt: Date | null;
  }[];
}) {
  return (
    <div className="grid gap-4">
      {updates.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">אין עדכונים רשמיים חדשים כרגע.</p>
        </Card>
      ) : (
        updates.map((update) => (
          <Card key={update.id}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-ink">{update.title}</h3>
              <span className="text-xs text-slate-500">{formatDate(update.publishedAt)}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{update.body}</p>
          </Card>
        ))
      )}
    </div>
  );
}
