import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DepartmentFilters({
  filters,
  institutions,
  specialties
}: {
  filters: {
    search?: string;
    institutions?: string[];
    specialties?: string[];
  };
  institutions: { id: string; name: string; type: "HOSPITAL" | "HMO" }[];
  specialties: { id: string; name: string }[];
}) {
  return (
    <Card className="rounded-[2rem]">
      <form className="space-y-4">
        <input
          type="text"
          name="search"
          defaultValue={filters.search}
          placeholder="חיפוש לפי מחלקה, מוסד או תחום"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-brand-300"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <fieldset className="rounded-[1.5rem] border border-brand-100 bg-brand-50/50 p-4">
            <legend className="px-2 text-sm font-semibold text-ink">מוסדות</legend>
            <div className="mt-3 grid max-h-60 gap-2 overflow-y-auto pr-1">
              {institutions.map((institution) => (
                <label
                  key={institution.id}
                  className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="institution"
                    value={institution.id}
                    defaultChecked={filters.institutions?.includes(institution.id)}
                  />
                  <span>
                    {institution.name}
                    <span className="mr-2 text-xs text-slate-500">
                      {institution.type === "HOSPITAL" ? "בית חולים" : "קהילה / קופה"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-[1.5rem] border border-brand-100 bg-brand-50/50 p-4">
            <legend className="px-2 text-sm font-semibold text-ink">תחומים</legend>
            <div className="mt-3 grid max-h-60 gap-2 overflow-y-auto pr-1">
              {specialties.map((specialty) => (
                <label
                  key={specialty.id}
                  className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="specialty"
                    value={specialty.id}
                    defaultChecked={filters.specialties?.includes(specialty.id)}
                  />
                  <span>{specialty.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">סינון מחלקות</Button>
          <a
            href="/departments"
            className="inline-flex items-center rounded-2xl border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-800"
          >
            איפוס
          </a>
        </div>
      </form>
    </Card>
  );
}
