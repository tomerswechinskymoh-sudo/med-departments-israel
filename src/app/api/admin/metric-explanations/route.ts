import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  canManageMetricExplanations,
  isMetricExplanationKey,
  type MetricExplanationScope
} from "@/lib/metric-explanations";
import { prisma } from "@/lib/prisma";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/public-data-cache";
import { revalidatePublicDataCache } from "@/lib/public-data-cache-invalidation";

const scopeSchema = z.enum(["GLOBAL", "SPECIALTY", "DEPARTMENT"]);
const targetSchema = z.object({
  metricKey: z.string().refine(isMetricExplanationKey, "מדד לא מוכר."),
  scopeType: scopeSchema,
  specialtyId: z.string().min(1).nullable().optional(),
  departmentId: z.string().min(1).nullable().optional()
});
const saveSchema = targetSchema.extend({
  text: z.string().trim().min(1, "יש להזין הסבר.").max(4000, "ההסבר ארוך מדי.")
});

async function validatedTarget(input: z.infer<typeof targetSchema>) {
  const scopeType = input.scopeType as MetricExplanationScope;

  if (scopeType === "GLOBAL") {
    if (input.specialtyId || input.departmentId) {
      throw new Error("היקף כל האתר אינו מקבל מזהי תחום או מחלקה.");
    }

    return {
      scopeType,
      scopeKey: "GLOBAL",
      specialtyId: null,
      departmentId: null
    };
  }

  if (scopeType === "SPECIALTY") {
    if (!input.specialtyId || input.departmentId) {
      throw new Error("היקף תחום דורש תחום התמחות בלבד.");
    }

    const specialty = await prisma.specialty.findUnique({
      where: { id: input.specialtyId },
      select: { id: true }
    });
    if (!specialty) throw new Error("תחום ההתמחות לא נמצא.");

    return {
      scopeType,
      scopeKey: specialty.id,
      specialtyId: specialty.id,
      departmentId: null
    };
  }

  if (!input.departmentId) {
    throw new Error("היקף מחלקה/מערך דורש מזהה מחלקה.");
  }

  const department = await prisma.department.findUnique({
    where: { id: input.departmentId },
    select: { id: true, specialtyId: true }
  });
  if (!department) throw new Error("המחלקה/המערך לא נמצאו.");
  if (input.specialtyId && input.specialtyId !== department.specialtyId) {
    throw new Error("המחלקה אינה שייכת לתחום ההתמחות שסופק.");
  }

  return {
    scopeType,
    scopeKey: department.id,
    specialtyId: department.specialtyId,
    departmentId: department.id
  };
}

function validationError(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "קלט לא תקין." },
    { status: 400 }
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !canManageMetricExplanations(session)) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  try {
    const target = await validatedTarget(parsed.data);
    const override = await prisma.metricExplanationOverride.upsert({
      where: {
        metricKey_scopeType_scopeKey: {
          metricKey: parsed.data.metricKey,
          scopeType: target.scopeType,
          scopeKey: target.scopeKey
        }
      },
      create: {
        metricKey: parsed.data.metricKey,
        ...target,
        text: parsed.data.text,
        updatedByUserId: session.userId
      },
      update: {
        specialtyId: target.specialtyId,
        departmentId: target.departmentId,
        text: parsed.data.text,
        updatedByUserId: session.userId
      },
      select: {
        id: true,
        metricKey: true,
        scopeType: true,
        scopeKey: true,
        specialtyId: true,
        departmentId: true,
        text: true
      }
    });

    revalidatePublicDataCache([
      PUBLIC_DATA_CACHE_TAGS.metricExplanations,
      PUBLIC_DATA_CACHE_TAGS.specialtyMetrics,
      PUBLIC_DATA_CACHE_TAGS.departmentDetails
    ]);

    return NextResponse.json({ override });
  } catch (error) {
    return validationError(error);
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !canManageMetricExplanations(session)) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const parsed = targetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  try {
    const target = await validatedTarget(parsed.data);
    await prisma.metricExplanationOverride.deleteMany({
      where: {
        metricKey: parsed.data.metricKey,
        scopeType: target.scopeType,
        scopeKey: target.scopeKey
      }
    });

    revalidatePublicDataCache([
      PUBLIC_DATA_CACHE_TAGS.metricExplanations,
      PUBLIC_DATA_CACHE_TAGS.specialtyMetrics,
      PUBLIC_DATA_CACHE_TAGS.departmentDetails
    ]);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return validationError(error);
  }
}
