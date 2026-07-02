import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { seedElectivesDemo } from "@/lib/server/electives-demo-seed";
import { hasValidSameOrigin } from "@/lib/security";

type DemoAction = "seed" | "resetPassword";

function flattenSummary(summary: Awaited<ReturnType<typeof seedElectivesDemo>>) {
  return {
    representativeUsername: summary.representativeUsername,
    representativeEmail: summary.representativeEmail,
    legacyDepartmentUsername: summary.legacyDepartmentUsername,
    selectedDepartments: summary.selectedDepartments.join(" | "),
    selectedDepartmentIds: summary.selectedDepartmentIds.join(","),
    applicationsByStatus: Object.entries(summary.applicationsByStatus)
      .map(([status, count]) => `${status}: ${count}`)
      .join(" | "),
    previewLinks: summary.links.join(" | ")
  };
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  if (!hasValidSameOrigin(request)) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { action?: DemoAction; departmentId?: string } | null;
  const action = body?.action;

  if (action !== "seed" && action !== "resetPassword") {
    return NextResponse.json({ error: "פעולת דמו לא תקינה." }, { status: 400 });
  }

  const summary = await seedElectivesDemo({
    preferredDepartmentId: body?.departmentId
  });

  await createAuditLog({
    actorUserId: session.userId,
    action: action === "seed" ? "admin.electives_demo_seeded" : "admin.electives_demo_password_reset",
    entityType: "ElectiveRepresentativeAccount",
    entityId: summary.representativeUsername,
    metadata: {
      demo: true,
      representativeUsername: summary.representativeUsername,
      selectedDepartmentIds: summary.selectedDepartmentIds
    }
  });

  return NextResponse.json({
    message: action === "seed" ? "נתוני דמו לאלקטיבים נוצרו." : "סיסמה זמנית חדשה נוצרה.",
    temporaryPassword: summary.representativeTemporaryPassword,
    summary: flattenSummary(summary)
  });
}
