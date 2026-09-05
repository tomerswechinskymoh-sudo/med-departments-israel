import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  metricExplanationRegistry,
  type MetricExplanationContext,
  type MetricExplanationOverrideRecord
} from "@/lib/metric-explanations";

const metricExplanationOverrideSelect = {
  id: true,
  metricKey: true,
  scopeType: true,
  scopeKey: true,
  specialtyId: true,
  departmentId: true,
  text: true,
  title: true,
  explanation: true,
  sourceLabel: true,
  sourceUrl: true
} satisfies Prisma.MetricExplanationOverrideSelect;

export async function getMetricExplanationOverrides(
  context: MetricExplanationContext,
  metricKeys: string[] = Object.keys(metricExplanationRegistry)
): Promise<MetricExplanationOverrideRecord[]> {
  const scopes: Prisma.MetricExplanationOverrideWhereInput[] = [
    { scopeType: "GLOBAL", scopeKey: "GLOBAL" }
  ];

  if (context.specialtyId) {
    scopes.push({ scopeType: "SPECIALTY", specialtyId: context.specialtyId });
  }

  if (context.departmentId) {
    scopes.push({ scopeType: "DEPARTMENT", departmentId: context.departmentId });
  }

  const rows = await prisma.metricExplanationOverride.findMany({
    where: {
      metricKey: { in: metricKeys },
      OR: scopes
    },
    select: metricExplanationOverrideSelect
  });

  return rows.map((row) => ({
    ...row,
    scopeType: row.scopeType as MetricExplanationOverrideRecord["scopeType"]
  }));
}
