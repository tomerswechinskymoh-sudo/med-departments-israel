import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getSession } from "@/lib/auth";
import { resolveImportedMetric, type ImportedMetricLike } from "@/lib/imported-metric-resolver";
import { prisma } from "@/lib/prisma";
import { getDepartmentPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const metricKeys = [
  "מספר_מתמחים",
  "זמן_המתנה_חציוני_לתקן",
  "משך_התמחות_רשמי",
  "משך_ממוצע_בפועל",
  "אחוז_נשים",
  "אחוז_גברים",
  "מספר המתקבלים שדיווחו שמצאו מיד התמחות",
  "מספר המתקבלים שדיווחו שמצאו עד חצי שנה",
  "מספר המתקבלים שדיווחו שמצאו עד שנה",
  "מספר המתקבלים שדיווחו שמצאו עד שנתיים",
  "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים"
];

function isInvalidRawValue(value: string | null | undefined) {
  const rawValue = value?.trim();
  return Boolean(rawValue && /^#(?:DIV\/0!|N\/A|VALUE!|REF!|NUM!)/i.test(rawValue));
}

function displayMetric(metric: ImportedMetricLike | null | undefined) {
  if (!metric) return null;
  if (isInvalidRawValue(metric.rawValue)) return null;
  if (metric.rawValue?.trim()) return metric.rawValue.trim();
  if (typeof metric.value !== "number" || !Number.isFinite(metric.value)) return null;

  const formatted = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 }).format(metric.value);
  if (metric.unit === "%") return `${formatted}%`;
  if (metric.unit === "currency") return `${formatted} ₪`;
  if (metric.unit === "months") return `${formatted} חודשים`;
  if (metric.unit === "years") return `${formatted} שנים`;
  return formatted;
}

function metricPayload(metric: ImportedMetricLike | null | undefined) {
  return metric
    ? {
        metricKey: metric.metricKey,
        label: metric.label ?? null,
        value: metric.value,
        rawValue: metric.rawValue ?? null,
        unit: metric.unit ?? null,
        displayValue: displayMetric(metric),
        lastUpdated: metric.lastUpdated ?? null
      }
    : null;
}

export async function GET(request: Request) {
  noStore();

  const session = await getSession();
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev && session?.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const url = new URL(request.url);
  const departmentId = url.searchParams.get("departmentId");

  if (!departmentId) {
    return NextResponse.json({ error: "departmentId is required." }, { status: 400 });
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: {
      id: true,
      slug: true,
      name: true,
      importStableKey: true,
      institution: { select: { name: true, slug: true } },
      specialty: { select: { name: true, slug: true } },
      metrics: {
        orderBy: { metricKey: "asc" },
        select: {
          metricKey: true,
          label: true,
          value: true,
          rawValue: true,
          unit: true,
          sourceNotes: true,
          lastUpdated: true
        }
      }
    }
  });

  if (!department) {
    return NextResponse.json({ error: "Department not found.", departmentId }, { status: 404 });
  }

  const pageQuery = await getDepartmentPageData(department.slug, undefined, departmentId);
  const metrics = Object.fromEntries(
    metricKeys.map((key) => {
      const exactDbMetric = department.metrics.find((metric) => metric.metricKey === key) ?? null;
      const pageResolverMetric = pageQuery ? resolveImportedMetric(pageQuery.metrics, key) : null;

      return [
        key,
        {
          dbExact: metricPayload(exactDbMetric),
          pageQueryResolved: metricPayload(pageResolverMetric),
          pageResolverMatchesDb:
            displayMetric(exactDbMetric) === displayMetric(pageResolverMetric)
        }
      ];
    })
  );

  return NextResponse.json(
    {
      requestedDepartmentId: departmentId,
      department: {
        id: department.id,
        slug: department.slug,
        importStableKey: department.importStableKey,
        name: department.name,
        hospital: department.institution.name,
        hospitalSlug: department.institution.slug,
        specialty: department.specialty.name,
        specialtySlug: department.specialty.slug
      },
      departmentMetricCount: department.metrics.length,
      pageQuery: {
        resolved: Boolean(pageQuery),
        resolvedDepartmentId: pageQuery?.id ?? null,
        resolvedSlug: pageQuery?.slug ?? null,
        resolvesSameDepartmentId: pageQuery?.id === departmentId
      },
      metrics
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
