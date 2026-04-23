import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRepresentative } from "@/lib/auth-guards";
import { OpeningApplicationModerationForm } from "@/components/admin/opening-application-moderation-form";
import { OpeningEditorForm } from "@/components/openings/opening-editor-form";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getOpeningManagementData, getRepresentativeOpeningFormData, reviewerTypeLabel } from "@/lib/queries";

export const dynamic = "force-dynamic";

function jsonList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function RepresentativeOpeningPage({
  params
}: {
  params: Promise<{ openingId: string }>;
}) {
  const session = await requireRepresentative();
  const { openingId } = await params;
  const [data, opening] = await Promise.all([
    getRepresentativeOpeningFormData(session.userId, openingId),
    getOpeningManagementData(session.userId, openingId)
  ]);

  if (!opening || !data.opening) {
    notFound();
  }

  return (
    <PageShell className="space-y-8 py-10">
      <Card className="bg-brand-900 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-100">ניהול פתיחה רשמית</p>
            <h1 className="mt-2 text-3xl font-bold">{opening.title}</h1>
            <p className="mt-3 text-sm text-brand-50">
              {opening.department.institution.name} · {opening.department.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/openings/${opening.id}`}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-900"
            >
              תצוגה ציבורית
            </Link>
            <Link
              href="/representative"
              className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white"
            >
              חזרה לאזור הנציגים
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionHeading
            title="עריכת פרטי הפתיחה"
            description="עדכון התוכן הציבורי, קריטריוני הקבלה והקבצים הפנימיים."
          />
          <div className="mt-6">
            <OpeningEditorForm
              openingId={opening.id}
              departmentOptions={data.departmentOptions}
              initialValues={{
                departmentId: opening.departmentId,
                title: opening.title,
                summary: opening.summary,
                openingType: opening.openingType,
                isImmediate: opening.isImmediate,
                openingsCount: opening.openingsCount ?? undefined,
                topApplicantsToEmail: opening.topApplicantsToEmail,
                status: opening.status,
                committeeDate: opening.committeeDate
                  ? new Date(opening.committeeDate).toISOString().slice(0, 10)
                  : "",
                applicationDeadline: opening.applicationDeadline
                  ? new Date(opening.applicationDeadline).toISOString().slice(0, 10)
                  : "",
                expectedStartDate: opening.expectedStartDate
                  ? new Date(opening.expectedStartDate).toISOString().slice(0, 10)
                  : "",
                notes: opening.notes ?? "",
                supportingInfo: opening.supportingInfo ?? "",
                acceptanceCriteria: {
                  researchImportance: opening.acceptanceCriteria?.researchImportance ?? 3,
                  departmentElectiveImportance:
                    opening.acceptanceCriteria?.departmentElectiveImportance ?? 3,
                  departmentInternshipImportance:
                    opening.acceptanceCriteria?.departmentInternshipImportance ?? 3,
                  residentSelectionInfluence:
                    opening.acceptanceCriteria?.residentSelectionInfluence ?? 3,
                  specialistSelectionInfluence:
                    opening.acceptanceCriteria?.specialistSelectionInfluence ?? 3,
                  departmentHeadInfluence: opening.acceptanceCriteria?.departmentHeadInfluence ?? 3,
                  medicalSchoolInfluence: opening.acceptanceCriteria?.medicalSchoolInfluence ?? 3,
                  recommendationsImportance:
                    opening.acceptanceCriteria?.recommendationsImportance ?? 3,
                  personalFitImportance: opening.acceptanceCriteria?.personalFitImportance ?? 3,
                  previousDepartmentExperienceImportance:
                    opening.acceptanceCriteria?.previousDepartmentExperienceImportance ?? 3,
                  notes: opening.acceptanceCriteria?.notes ?? "",
                  whatWeAreLookingFor: opening.acceptanceCriteria?.whatWeAreLookingFor ?? ""
                }
              }}
            />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionHeading
              title="קבצים פנימיים"
              description="הקבצים כאן פרטיים ונגישים רק לנציגים מורשים ולאדמינים."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              {opening.attachments.length === 0 ? (
                <p className="text-sm text-slate-600">עדיין לא צורפו קבצים לפתיחה הזו.</p>
              ) : (
                opening.attachments.map((file) => (
                  <Link
                    key={file.id}
                    href={`/api/files/${file.id}`}
                    className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-800"
                  >
                    {file.originalName}
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="אוטומציה אחרי הדדליין"
              description="כשהדדליין עובר, המערכת מדרגת את המועמדויות ושולחת לבעל/ת הפתיחה רק את ההתאמות החזקות ביותר."
            />
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <p>
                <span className="font-semibold text-ink">מספר מועמדים במייל: </span>
                Top {opening.topApplicantsToEmail}
              </p>
              <p>
                <span className="font-semibold text-ink">נשלח לאחרונה: </span>
                {opening.topMatchesDeliveredAt
                  ? new Date(opening.topMatchesDeliveredAt).toLocaleDateString("he-IL")
                  : "עדיין לא נשלח"}
              </p>
              {opening.topMatchesLastError ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  {opening.topMatchesLastError}
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <SectionHeading
              title="מועמדויות שהתקבלו"
              description="המועמדויות מסודרות לפי ההתאמה הגבוהה ביותר. Top matches מסומנים בראש הרשימה."
            />
            <div className="mt-4 space-y-4">
              {opening.applications.length === 0 ? (
                <p className="text-sm text-slate-600">עדיין לא הוגשו מועמדויות לפתיחה הזו.</p>
              ) : (
                opening.applications.map((application) => (
                  <div id={`application-${application.id}`} key={application.id} className="rounded-2xl bg-brand-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{application.fullName}</p>
                        <p className="text-sm text-slate-600">
                          {reviewerTypeLabel(application.applicantType)} · {application.phone}
                          {application.email ? ` · ${application.email}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {application.isTopMatch ? <Badge tone="warning">Top match</Badge> : null}
                        {application.matchScore !== null ? (
                          <Badge tone="success">התאמה {application.matchScore}/100</Badge>
                        ) : null}
                        <Badge>{application.status}</Badge>
                      </div>
                    </div>
                    {application.medicalSchool ? (
                      <p className="mt-3 text-sm text-slate-600">
                        מוסד לימודים: {application.medicalSchool}
                      </p>
                    ) : null}
                    {application.matchShortSummary ? (
                      <p className="mt-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
                        <span className="font-semibold text-ink">סיכום התאמה: </span>
                        {application.matchShortSummary}
                      </p>
                    ) : null}
                    {jsonList(application.matchStrengths).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {jsonList(application.matchStrengths).map((item) => (
                          <span
                            key={`${application.id}-${item}`}
                            className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {jsonList(application.matchConcerns).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {jsonList(application.matchConcerns).map((item) => (
                          <span
                            key={`${application.id}-concern-${item}`}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-3 text-sm leading-7 text-slate-700">{application.motivationText}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{application.relevantExperience}</p>
                    {application.recommendationDetails ? (
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        <span className="font-semibold text-ink">המלצות / אנשי קשר: </span>
                        {application.recommendationDetails}
                      </p>
                    ) : null}
                    {application.departmentFamiliarityDetails ? (
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        <span className="font-semibold text-ink">היכרות נוספת עם המחלקה: </span>
                        {application.departmentFamiliarityDetails}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {application.files.map((file) => (
                        <Link
                          key={file.id}
                          href={`/api/files/${file.id}`}
                          className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-800"
                        >
                          {file.originalName}
                        </Link>
                      ))}
                    </div>
                    <OpeningApplicationModerationForm
                      openingId={opening.id}
                      applicationId={application.id}
                      currentStatus={application.status}
                    />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
