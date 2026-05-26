import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDepartmentWebsiteRefreshSuggestion } from "@/lib/server/department-website-refresh";

const scrapeRequestSchema = z.object({
  sourceUrl: z.string().trim().url("יש להזין כתובת URL תקינה.").max(1000)
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const { departmentId } = await params;
  const [revisions, department] = await Promise.all([
    prisma.departmentScrapeRevision.findMany({
      where: { departmentId },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        about: true,
        contactName: true,
        publicContactEmail: true,
        publicContactPhone: true,
        applicationUrl: true,
        metrics: {
          where: {
            metricKey: {
              in: ["seniorPhysiciansCount", "bedsCount", "researchActivityText"]
            }
          },
          select: {
            metricKey: true,
            value: true,
            rawValue: true
          }
        }
      }
    })
  ]);

  return NextResponse.json({ revisions, current: department });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> }
) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const { departmentId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = scrapeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  try {
    const revision = await createDepartmentWebsiteRefreshSuggestion(prisma, {
      departmentId,
      sourceUrl: parsed.data.sourceUrl
    });

    return revision.status === "FAILED"
      ? NextResponse.json({ error: revision.adminNotes ?? "הסריקה נכשלה.", revision }, { status: 500 })
      : NextResponse.json({ revision });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "הסריקה נכשלה." },
      { status: 500 }
    );
  }
}
