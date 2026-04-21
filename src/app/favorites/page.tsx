import { requireAuth } from "@/lib/auth-guards";
import { getFavoritesData } from "@/lib/queries";
import { DepartmentCard } from "@/components/departments/department-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await requireAuth();
  const favorites = await getFavoritesData(session.userId);

  return (
    <PageShell className="space-y-8 py-10">
      <SectionHeading
        eyebrow="מועדפים"
        title="המחלקות ששמרת"
        description="גישה מהירה למחלקות שמעניינות אותך במיוחד."
      />

      {favorites.length === 0 ? (
        <EmptyState
          title="אין מחלקות שמורות"
          description="אפשר להוסיף מחלקות למועדפים מתוך מאגר המחלקות או מתוך עמוד מחלקה."
          ctaHref="/departments"
          ctaLabel="לעיון במאגר"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((department) => (
            <DepartmentCard key={department.id} department={department} showFavoriteButton />
          ))}
        </div>
      )}
    </PageShell>
  );
}
