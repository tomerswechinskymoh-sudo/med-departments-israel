import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSpecialtyMetricKey } from "@/lib/specialty-metrics";

const metricArraySchema = z
  .array(z.string())
  .transform((values) =>
    Array.from(new Set(values.filter(isSpecialtyMetricKey)))
  );

const dashboardConfigSchema = z.object({
  specialtyId: z.string().min(1),
  enabledMetrics: metricArraySchema,
  displayOrder: metricArraySchema
});

function jsonValue(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = dashboardConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "קלט לא תקין." }, { status: 400 });
  }

  const specialty = await prisma.specialty.findUnique({
    where: {
      id: parsed.data.specialtyId
    },
    select: {
      id: true
    }
  });

  if (!specialty) {
    return NextResponse.json({ error: "תחום ההתמחות לא נמצא." }, { status: 404 });
  }

  const enabledMetrics = parsed.data.enabledMetrics;
  const displayOrder = [
    ...parsed.data.displayOrder.filter((key) => enabledMetrics.includes(key)),
    ...enabledMetrics.filter((key) => !parsed.data.displayOrder.includes(key))
  ];

  const config = await prisma.specialtyDashboardConfig.upsert({
    where: {
      specialtyId: specialty.id
    },
    create: {
      specialtyId: specialty.id,
      enabledMetricsJson: jsonValue(enabledMetrics),
      displayOrderJson: jsonValue(displayOrder)
    },
    update: {
      enabledMetricsJson: jsonValue(enabledMetrics),
      displayOrderJson: jsonValue(displayOrder)
    }
  });

  return NextResponse.json({
    message: "הגדרת הדשבורד נשמרה.",
    config
  });
}
