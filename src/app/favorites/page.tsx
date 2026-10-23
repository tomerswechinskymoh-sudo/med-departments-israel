export const metadata = { robots: { index: false, follow: false } };
import { requireAuth } from "@/lib/auth-guards";
import { getFavoritesData, getDepartmentOptions } from "@/lib/queries";
import { FavoritesContent } from "@/components/departments/favorites-content";
export const dynamic = "force-dynamic";
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const session = await requireAuth();
  // Join only already-public identity fields from the existing options contract.
  const [saved, options] = await Promise.all([getFavoritesData(session.userId), getDepartmentOptions()]);
  const favorites = saved.map(item => {
    const option = options.find(option => option.id === item.id);
    return { ...item, specialtyId: option?.specialty.id ?? "", institutionSlug: undefined };
  });
  const filter = typeof params.specialty === "string" ? params.specialty : "";
  const sort = ["department", "institution"].includes(String(params.sort)) ? String(params.sort) : "recent";
  return <FavoritesContent key={`${session.userId}:${filter}:${sort}`} initialFavorites={favorites} filter={filter} sort={sort} />;
}
