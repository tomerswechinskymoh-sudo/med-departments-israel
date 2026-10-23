"use client";
import { useState } from "react";
import type { getFavoritesData } from "@/lib/queries";
import { ProductIcon } from "@/components/ui/product-icon";
import { DepartmentCard } from "@/components/departments/department-card";
import {
  DepartmentCompareProvider,
  CompareSelectableShell,
} from "@/components/departments/department-comparison-selection";
import { PageShell } from "@/components/layout/page-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { EmptyState } from "@/components/ui/empty-state";

export function FavoritesContent({ initialFavorites, filter, sort }: {
  initialFavorites: (Awaited<ReturnType<typeof getFavoritesData>>[number] & { specialtyId: string; institutionSlug?: string })[];
  filter: string;
  sort: string;
}) {
  // Update only after the authenticated mutation succeeds. Do not depend on
  // a streamed route refresh to remove a card or reach the final empty state.
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const favorites = initialFavorites.filter(department => !removedIds.includes(department.id));
  function onFavoriteChange(departmentId: string, isFavorite: boolean) {
    if (!isFavorite) setRemovedIds(ids => ids.includes(departmentId) ? ids : [...ids, departmentId]);
  }
  const availableSpecialties = [...new Map(favorites.map(d => [d.specialtyId, d.specialtyName])).entries()];
  const filtered = favorites.filter(d => !filter || d.specialtyId === filter);
  if (sort === "department") filtered.sort((a,b) => a.name.localeCompare(b.name, "he"));
  if (sort === "institution") filtered.sort((a,b) => a.institutionName.localeCompare(b.institutionName, "he"));
  const specialties = [...new Set(filtered.map((d) => d.specialtyId))];
  return (
    <PageShell className="favorites-page space-y-6">
      <PageIntro
        title="הרשימה שלי"
        image="corridor"
        description="המחלקות ששמרתם, במקום אחד. חזרו לפרטים, הסירו אפשרויות והשוו בין מחלקות מאותו תחום."
      />

      <p className="favorites-summary text-sm text-slate-600" aria-live="polite">
        {favorites.length} מחלקות שמורות · הרשימה נשמרת בחשבון
      </p>
      {favorites.length > 0 && <form className="favorites-toolbar" action="/favorites">
        <label htmlFor="favorites-specialty">תחום התמחות<select id="favorites-specialty" name="specialty" defaultValue={filter}><option value="">כל התחומים</option>{filter && !availableSpecialties.some(([id]) => id === filter) && <option value={filter}>התחום שנבחר — ללא מחלקות שמורות</option>}{availableSpecialties.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label htmlFor="favorites-sort">מיון הרשימה<select id="favorites-sort" name="sort" defaultValue={sort}><option value="recent">נשמרו לאחרונה</option><option value="department">שם מחלקה</option><option value="institution">שם מוסד</option></select></label>
        <button type="submit">עדכון הרשימה</button>
      </form>}
      <div className="favorites-layout">
        <div>
          {!favorites.length ? (
            <EmptyState
              title="כאן תתחיל הרשימה שלכם"
              description="שמרו מחלקות מתוך המאגר או מפרופיל המחלקה כדי לחזור אליהן ולהשוות."
              ctaHref="/departments"
              ctaLabel="חיפוש מחלקות"
            />
          ) : !filtered.length ? <EmptyState title="אין מחלקות שמורות בתחום שנבחר" description="בחרו תחום אחר או חזרו לכל המחלקות ששמרתם." ctaHref="/favorites" ctaLabel="כל המחלקות השמורות" /> : (
            specialties.map((id) => {
              const group = filtered.filter((d) => d.specialtyId === id);
              return (
                <section key={id} className="favorites-group">
                  <h2 className="mb-4 text-xl font-bold">
                    {group[0].specialtyName}
                  </h2>
                  <DepartmentCompareProvider specialtyId={id} isAuthenticated layout="top">
                    <div className="grid gap-4 md:grid-cols-2">
                      {group.map((d) => (
                        <CompareSelectableShell
                          key={d.id}
                          option={{
                            id: d.id,
                            name: d.name,
                            institutionName: d.institutionName,
                            institutionSlug: d.institutionSlug,
                            specialtyId: id,
                            specialtyName: d.specialtyName,
                          }}
                        >
                          <DepartmentCard department={d} showFavoriteButton favoriteVariant="remove" onFavoriteChange={onFavoriteChange} />
                        </CompareSelectableShell>
                      ))}
                    </div>
                  </DepartmentCompareProvider>
                </section>
              );
            })
          )}
        </div>
        <aside className="favorites-tips">
          <ProductIcon name="bookmark" />
          <h2>מקום לכל האפשרויות שלכם</h2>
          <div>
            <ProductIcon name="compare" />
            <h3>משווים באותו תחום</h3>
            <p>בחרו מחלקות שמעניינות אתכם והשוו את הנתונים והמקורות שלהן.</p>
          </div>
          <div>
            <ProductIcon name="document" />
            <h3>משלימים את התמונה</h3>
            <p>היכנסו לפרופיל המלא ובדקו גם את המידע שעוד חסר.</p>
          </div>
          <div>
            <ProductIcon name="shield" />
            <h3>חוזרים בכל זמן</h3>
            <p>הרשימה נשמרת בחשבון וזמינה כשתתחברו שוב.</p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
