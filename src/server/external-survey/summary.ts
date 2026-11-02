import "server-only";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canReadSurvey } from "@/lib/external-survey/aggregate";
import { publicMetric, type SurveySummary } from "@/lib/external-survey/presentation";
const SOURCE_ID = "resident-conditions-survey-2024";
export async function getExternalSurveySummary(specialtyId: string): Promise<SurveySummary> {
  const empty = { metrics: [], quotes: [] };
  const session = await getSession();
  if (!canReadSurvey(session)) return { ...empty, state: "locked" };
  try {
    const selected = await prisma.specialty.findUnique({ where: { id: specialtyId }, select: { slug: true } });
    const alias: Record<string, string> = { "כירורגיה-פלסטית": "plastic-surgery", "פתולוגיה": "diagnostic-pathology", "פסיכיאטריה-של-הילד-והמתבגר": "child-psychiatry" };
    const canonicalSlug = selected && alias[selected.slug];
    const canonical = canonicalSlug ? await prisma.specialty.findUnique({ where: { slug: canonicalSlug }, select: { id: true } }) : null;
    const resolvedId = canonical?.id ?? specialtyId;
    const source = await prisma.externalSurveySource.findFirst({ where: { id: SOURCE_ID, sourceType: "EXTERNAL_SURVEY", aggregateRightsStatus: "DOCUMENTED", aggregateRightsEvidence: { not: Prisma.DbNull } }, select: { title: true, datasetHash: true, quoteRightsStatus: true, quoteRightsEvidence: true } });
    if (!source) return { ...empty, state: "empty" };
    const rows = await prisma.externalSurveyAggregate.findMany({ where: { sourceId: SOURCE_ID, specialtyId: resolvedId, institutionId: null, status: "PUBLISHED", respondentCount: { gte: 10 }, datasetHash: source.datasetHash, privacyReviewHash: source.datasetHash }, select: { metricKey: true, respondentCount: true, value: true, method: true, calculatedCount: true, periodStartYear: true, periodEndYear: true, status: true, institutionId: true, datasetHash: true, privacyReviewHash: true } });
    const metrics = rows.flatMap(row => { const metric = publicMetric(row, source.datasetHash); return metric ? [metric] : []; });
    if (!metrics.length) return { ...empty, state: "empty" };
    const quotes = source.quoteRightsStatus === "DOCUMENTED" && source.quoteRightsEvidence ? await prisma.externalSurveyResponse.findMany({ where: { sourceId: SOURCE_ID, specialtyId: resolvedId, tipStatus: "APPROVED", status: "PUBLISHED", approvedTip: { not: null } }, select: { approvedTip: true }, take: 20, orderBy: { fingerprint: "asc" } }) : [];
    return { state: "published", sourceTitle: source.title, metrics, quotes: quotes.flatMap(q => q.approvedTip ? [q.approvedTip] : []) };
  } catch {
    console.error("[external-survey] Summary unavailable; content withheld");
    return { ...empty, state: "unavailable" };
  }
}
