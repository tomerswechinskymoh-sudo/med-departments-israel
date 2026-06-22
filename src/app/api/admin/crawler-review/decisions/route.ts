import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  CRAWLER_REVIEW_DECISIONS,
  loadCrawlerReviewDecisions,
  saveCrawlerReviewDecisions,
  validateAdminReviewDecisions
} from "@/lib/server/crawler-review-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const decisionSchema = z.object({
  reviewEntityId: z.string().min(1),
  reviewEntityType: z.enum(["canonicalDoctor", "doctorDepartmentLink", "reviewIssue"]),
  hospitalSlug: z.string().min(1),
  manualDecision: z.union([z.enum(CRAWLER_REVIEW_DECISIONS), z.literal("")]),
  manualNotes: z.string().max(2000).optional(),
  sourceSheet: z.enum(["Canonical Doctors", "Department Links", "Review Needed"]),
  sourceType: z.enum(["canonicalDoctor", "doctorDepartmentLink", "reviewIssue"])
});

const payloadSchema = z.object({
  decisions: z.array(decisionSchema).min(1).max(500)
});

async function requireAdminJson() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: NextResponse.json({ error: "גישה נדחתה." }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export async function GET() {
  const { error } = await requireAdminJson();
  if (error) return error;

  const decisions = await loadCrawlerReviewDecisions();
  const validation = await validateAdminReviewDecisions(decisions);
  return NextResponse.json({ decisions, validation });
}

export async function POST(request: Request) {
  const { error, session } = await requireAdminJson();
  if (error) return error;

  try {
    const body = payloadSchema.parse(await request.json());
    const result = await saveCrawlerReviewDecisions({
      decisions: body.decisions,
      reviewer: session.fullName || session.email
    });
    return NextResponse.json({
      ok: true,
      savedCount: body.decisions.length,
      decisionCount: result.decisions.length,
      validation: result.validation,
      persistence: "local-file"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "בקשת שמירה לא תקינה.", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "שמירת החלטות נכשלה.",
        persistence: "local-file"
      },
      { status: 500 }
    );
  }
}
