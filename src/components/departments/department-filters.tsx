import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DepartmentFilters({
  filters,
  institutions,
  specialties
}: {
  filters: {
    search?: string;
    institution?: string;
    specialty?: string;
    city?: string;
  };
  institutions: { id: string; name: string; city: string | null; type: "HOSPITAL" | "HMO" }[];
  specialties: { id: string; name: string }[];
}) {
  const cities = Array.from(
    new Set(institutions.map((institution) => institution.city).filter(Boolean) as string[])
  ).sort();

  return (
    <Card className="rounded-[2rem]">
      <form className="grid gap-4 md:grid-cols-4">
        <input
          type="text"
          name="search"
          defaultValue={filters.search}
          placeholder="חיפוש לפי מחלקה, מוסד או תחום"
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-brand-300"
        />
        <select
          name="institution"
          defaultValue={filters.institution}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-300"
        >
          <option value="">כל המוסדות</option>
          {institutions.map((institution) => (
            <option key={institution.id} value={institution.id}>
              {institution.name}
            </option>
          ))}
        </select>
        <select
          name="specialty"
          defaultValue={filters.specialty}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-300"
        >
          <option value="">כל התחומים</option>
          {specialties.map((specialty) => (
            <option key={specialty.id} value={specialty.id}>
              {specialty.name}
            </option>
          ))}
        </select>
        <select
          name="city"
          defaultValue={filters.city}
          className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-300"
        >
          <option value="">כל הערים</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-3 md:col-span-4">
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
