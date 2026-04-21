import Link from "next/link";
import { FavoriteToggleButton } from "@/components/departments/favorite-toggle-button";
import { PlaceholderVisual } from "@/components/media/placeholder-visual";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";

export function DepartmentCard({
  department,
  showFavoriteButton = false
}: {
  department: {
    id: string;
    slug: string;
    name: string;
    institutionName: string;
    city?: string | null;
    specialtyName: string;
    shortSummary: string;
    reviewCount: number;
    averageOverall: number;
    hasOpenResidency: boolean;
    hasResearch: boolean;
    isFavorite?: boolean;
    coverImageUrl?: string | null;
  };
  showFavoriteButton?: boolean;
}) {
  return (
    <Card className="flex h-full flex-col justify-between overflow-hidden p-0">
      <div className="p-3">
        <PlaceholderVisual
          label={department.name}
          caption={`${department.institutionName}${department.city ? ` · ${department.city}` : ""}`}
          variant="department"
          className="aspect-[1.55/1] w-full"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between px-6 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{department.institutionName}</Badge>
            <Badge tone={department.hasOpenResidency ? "success" : "warning"}>
              {department.hasOpenResidency ? "יש פתיחות רשמיות" : "ללא פתיחות כרגע"}
            </Badge>
            <Badge tone={department.hasResearch ? "success" : "default"}>
              {department.hasResearch ? "מחקר פעיל" : "ללא מחקר פתוח"}
            </Badge>
          </div>

          <h3 className="mt-4 text-2xl font-bold text-ink">{department.name}</h3>
          <p className="mt-2 text-sm font-semibold text-brand-700">
            {department.specialtyName}
            {department.city ? ` · ${department.city}` : ""}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">{department.shortSummary}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{department.reviewCount} חוויות מאושרות</span>
            <RatingStars value={department.averageOverall || 0} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/departments/${department.slug}`}
              className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              לעמוד המחלקה
            </Link>
            {showFavoriteButton ? (
              <FavoriteToggleButton
                departmentId={department.id}
                initialFavorite={Boolean(department.isFavorite)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
