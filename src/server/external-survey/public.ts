import { Prisma, type PrismaClient } from '@prisma/client';
import { canReadSurvey, MIN_RESPONDENTS } from '@/lib/external-survey/aggregate';
import { publicMetric, type SurveySummary } from '@/lib/external-survey/presentation';
import { resolveEffectiveHospitalName, RABIN_BEILINSON, RABIN_SCHNEIDER, RABIN_GEHA } from '@/lib/effective-hospital';

export const RESIDENT_SOURCE_ID = 'resident-conditions-survey-2024';
const aliases: Record<string, string> = { 'כירורגיה-פלסטית': 'plastic-surgery', 'פתולוגיה': 'diagnostic-pathology', 'פסיכיאטריה-של-הילד-והמתבגר': 'child-psychiatry' };
type Catalog = { specialties: { id: string; slug: string }[]; institutions: { id: string; name: string; slug: string }[] };
export const hospitalKey = (name: string) => resolveEffectiveHospitalName(name);
export function canonicalSurveySpecialty(id: string, catalog: Catalog) {
  const selected = catalog.specialties.find(s => s.id === id);
  return catalog.specialties.find(s => s.slug === aliases[selected?.slug ?? ''])?.id ?? id;
}
// Reviewed catalog aliases only: no substring/fuzzy match and no owner-to-hospital mapping.
const institutionSlugAliases: Record<string, string> = {
 'שירותי-בריאות-כללית':'clalit', 'מכבי-שירותי-בריאות':'maccabi', 'קופח-לאומית':'leumit', 'קופח-מאוחדת':'meuhedet',
 'מרכז-שניידר-לילדים':'schneider', 'ביהח-השרון-מרכז-רפואי-רבין':'rabin-hasharon',
 'ביהח-בילינסון-מרכז-רפואי-רבין':'rabin-beilinson', 'ביהח-מעיני-הישועה':'maayanei-hayeshua',
 'ביהח-הדסה-הר-הצופים':'hadassah-mount-scopus', 'מרכז-רפואי-הדסה-הר-צופים':'hadassah-mount-scopus',
 'ביהח-הדסה-עין-כרם':'hadassah-ein-kerem', 'מרכז-רפואי-הדסה-עין-כרם':'hadassah-ein-kerem',
 'ביהח-זיו-צפת':'ziv', 'ביהח-לניאדו':'laniado', 'מרכז-רפואי-ברוך-פדה-פוריה':'poria',
 'מרכז-רפואי-הלל-יפה':'hillel-yaffe', 'ביח-אסותא-אשדוד':'assuta-ashdod', 'מרכז-רפואי-אסותא-אשדוד':'assuta-ashdod',
 'מרכז-רפואי-כרמל':'carmel', 'מרכז-רפואי-וולפסון':'wolfson', 'מרכז-רפואי-יצחק-שמיר':'shamir',
 'מרכז-רפואי-רמבם':'rambam', 'מרכז-רפואי-תא-סוראסקי':'ichilov', 'מרכז-רפואי-שערי-צדק':'shaare-zedek',
 'מרכז-רפואי-שיבא':'sheba', 'מרכז-רפואי-סורוקה':'soroka', 'ביהח-יוספטל':'yoseftal',
 'ביהח-המשפחה-הקדושה':'holy-family', 'ביהח-אי-מ-מ-ס-הסקוטי':'nazareth-english'
};
export function resolveSurveyScope(specialtyId: string, institutionName: string, catalog: Catalog) {
 const canonicalCampusSlug: Record<string,string> = { [RABIN_BEILINSON]:'rabin-beilinson', [RABIN_SCHNEIDER]:'schneider', [RABIN_GEHA]:'מרכז-לבהנ-גהה' };
 const campusSlug=canonicalCampusSlug[hospitalKey(institutionName)];
 const matches=catalog.institutions.filter(i=>hospitalKey(i.name)===hospitalKey(institutionName));
 const candidates=[...new Map(matches.flatMap(i=>{
  const targetSlug=campusSlug??institutionSlugAliases[i.slug]??i.slug;
  const canonical=catalog.institutions.find(item=>item.slug===targetSlug);
  return canonical?[[canonical.id,canonical] as const]:[];
 })).values()];
 if(candidates.length!==1)return null;
 return {specialtyId:canonicalSurveySpecialty(specialtyId,catalog),institutionId:candidates[0].id};
}

async function catalog(db: PrismaClient): Promise<Catalog> {
  const [specialties, institutions] = await Promise.all([
    db.specialty.findMany({ select: { id: true, slug: true } }),
    db.institution.findMany({ select: { id: true, name: true, slug: true } })
  ]);
  return { specialties, institutions };
}
const sourceWhere = { id: RESIDENT_SOURCE_ID, sourceType: 'EXTERNAL_SURVEY', aggregateRightsStatus: 'DOCUMENTED', aggregateRightsEvidence: { not: Prisma.DbNull } };
const quoteWhere = { sourceId: RESIDENT_SOURCE_ID, tipStatus: 'APPROVED', status: 'PUBLISHED' as const, approvedTip: { not: null }, tipReviewEvidence: { not: Prisma.DbNull } };
export async function readSurveySummary(db: PrismaClient, specialtyId: string, viewer: Parameters<typeof canReadSurvey>[0], local?: { institutionName: string; specialtyName: string; isArray: boolean; siblingCount: number }): Promise<SurveySummary> {
  const empty = { metrics: [], quotes: [] };
  // Specialty pages expose approved national aggregates to everyone. Hospital
  // summaries and individual quotations retain the verified-viewer boundary.
  if (local && !canReadSurvey(viewer)) return { ...empty, state: 'locked' };
  const c = await catalog(db);
  const scope = local ? resolveSurveyScope(specialtyId, local.institutionName, c) : { specialtyId: canonicalSurveySpecialty(specialtyId, c), institutionId: null };
  if (!scope) return { ...empty, state: 'empty' };
  const source = await db.externalSurveySource.findFirst({ where: sourceWhere, select: { title: true, datasetHash: true, quoteRightsStatus: true, quoteRightsEvidence: true } });
  if (!source) return { ...empty, state: 'empty' };
  const rows = await db.externalSurveyAggregate.findMany({ where: { sourceId: RESIDENT_SOURCE_ID, ...scope, status: 'PUBLISHED', respondentCount: { gte: MIN_RESPONDENTS }, datasetHash: source.datasetHash, privacyReviewHash: source.datasetHash }, select: { metricKey: true, respondentCount: true, value: true, method: true, calculatedCount: true, periodStartYear: true, periodEndYear: true, status: true, institutionId: true, datasetHash: true, privacyReviewHash: true } });
  const metrics = rows.flatMap(row => { const m = publicMetric(row, source.datasetHash, scope.institutionId); return m ? [m] : []; });
  const scopeLabel = local ? `${local.specialtyName} · ${local.institutionName}${local.siblingCount > 1 ? ' · כלל התחום בבית החולים' : ''}` : undefined;
  // The underlying assignment remains hospital + specialty. Shared unit pages
  // explicitly label this scope; no department ID or unit-specific claim is inferred.
  const quotes = local && source.quoteRightsStatus === 'DOCUMENTED' && source.quoteRightsEvidence && metrics.length
    ? await db.externalSurveyResponse.findMany({ where: { ...quoteWhere, ...scope }, select: { id: true, approvedTip: true, reportYear: true }, orderBy: [{ reportYear: 'desc' }, { id: 'asc' }] }) : [];
  return { state: metrics.length || quotes.length ? 'published' : 'empty', sourceTitle: source.title, scopeLabel, metrics,
    quotes: quotes.flatMap(q => q.approvedTip ? [{ id: q.id, text: q.approvedTip, year: q.reportYear, scopeLabel: local && local.siblingCount > 1 ? `${scopeLabel} · ללא זיהוי המחלקה הנפרדת` : undefined }] : []) };
}
export type ResidentDirectoryTarget = { id: string; specialtyId: string; institutionName: string; isArrayCard?: boolean };
// Counts are public; source text remains behind the verified-viewer gate.
export async function residentDirectoryCounts(db: PrismaClient, cards: ResidentDirectoryTarget[]) {
  const result = new Map<string, number>();
  if (!cards.length) return result;
  const source = await db.externalSurveySource.findFirst({ where: { ...sourceWhere, quoteRightsStatus: 'DOCUMENTED', quoteRightsEvidence: { not: Prisma.DbNull } }, select: { datasetHash: true } });
  if (!source) return result;
  const c = await catalog(db);
  const targets = cards.map(card => ({ card, scope: resolveSurveyScope(card.specialtyId, card.institutionName, c) }));
  const scopes = targets.flatMap(t => t.scope ? [t.scope] : []);
  if (!scopes.length) return result;
  const [groups, reviewed] = await Promise.all([
    db.externalSurveyResponse.groupBy({ by: ['institutionId', 'specialtyId'], where: { ...quoteWhere, OR: scopes }, _count: { _all: true } }),
    db.externalSurveyAggregate.findMany({ where: { sourceId: RESIDENT_SOURCE_ID, OR: scopes, status: 'PUBLISHED', datasetHash: source.datasetHash, privacyReviewHash: source.datasetHash, respondentCount: { gte: 1 }, value: { not: null } }, select: { institutionId: true, specialtyId: true } })
  ]);
  for (const { card, scope } of targets) {
    if (!scope || !reviewed.some(r => r.institutionId === scope.institutionId && r.specialtyId === scope.specialtyId)) continue;
    const group = groups.find(g => g.institutionId === scope.institutionId && g.specialtyId === scope.specialtyId);
    if (group) result.set(card.id, group._count._all);
  }
  return result;
}
