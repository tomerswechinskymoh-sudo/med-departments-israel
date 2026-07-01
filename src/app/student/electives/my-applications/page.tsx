import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InstitutionLogo } from "@/components/departments/institution-logo";
import { ElectiveAlternativeDecisionButtons } from "@/components/electives/student-electives-actions";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { requireStudentElectivesPreviewEnabled } from "@/lib/student-electives";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function MyElectiveApplicationsPage() {
  requireStudentElectivesPreviewEnabled();
  const session = await requireAuth();
  const applications = await prisma.electiveApplication.findMany({
    where: { applicantUserId: session.userId },
    include: {
      department: {
        select: {
          slug: true,
          name: true,
          institution: { select: { name: true, city: true, slug: true, coverImageUrl: true } },
          specialty: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <PageShell className="space-y-6 py-8">
      <SectionHeading
        eyebrow="Private preview"
        title="בקשות האלקטיב שלי"
        description="תצוגה פרטית למשתמש המחובר בלבד. אין גישה לבקשות של משתמשים אחרים."
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-right text-sm">
            <thead className="text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-2">מחלקה</th>
                <th className="px-3 py-2">תאריכים</th>
                <th className="px-3 py-2">סטטוס</th>
                <th className="px-3 py-2">חלופה</th>
                <th className="px-3 py-2">הוגש</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <InstitutionLogo institution={application.department.institution} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/electives/${application.department.slug}`} className="font-semibold text-brand-800">
                          {application.department.institution.name} · {application.department.specialty.name}
                        </Link>
                        <p className="text-xs text-slate-500">{application.department.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {application.requestedStartDate ? formatDate(application.requestedStartDate) : "לא צוין"}
                    {" - "}
                    {application.requestedEndDate ? formatDate(application.requestedEndDate) : "לא צוין"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone="default">{application.status}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    {application.proposedStartDate && application.proposedEndDate ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700">
                          {formatDate(application.proposedStartDate)}
                          {" - "}
                          {formatDate(application.proposedEndDate)}
                        </p>
                        {application.status === "ALTERNATIVE_OFFERED" ? (
                          <ElectiveAlternativeDecisionButtons applicationId={application.id} />
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">אין חלופה</span>
                    )}
                  </td>
                  <td className="px-3 py-3">{formatDate(application.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {applications.length === 0 ? <p className="mt-4 text-sm text-slate-600">עדיין אין בקשות אלקטיב.</p> : null}
        </div>
      </Card>
    </PageShell>
  );
}
