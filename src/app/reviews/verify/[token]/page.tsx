import { notFound } from "next/navigation";
import { ReviewProofUploadForm } from "@/components/forms/review-proof-upload-form";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReviewVerificationPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const submission = await prisma.reviewSubmission.findUnique({
    where: {
      verificationToken: token
    },
    select: {
      id: true,
      tokenExpiry: true,
      department: {
        select: {
          name: true,
          institution: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  if (!submission) {
    notFound();
  }

  const isExpired = submission.tokenExpiry ? submission.tokenExpiry < new Date() : false;

  return (
    <PageShell className="flex min-h-[70vh] items-center justify-center bg-[radial-gradient(circle_at_top,#e7f5ff,transparent_35%),linear-gradient(180deg,#f8fbff,#ffffff)]">
      <Card className="w-full max-w-xl rounded-[2rem] border-brand-100/80 shadow-2xl shadow-brand-900/10">
        <p className="text-sm font-bold text-brand-700">אימות שיתוף חוויה</p>
        <h1 className="mt-2 text-3xl font-black text-ink">העלאת אסמכתא פרטית</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          עבור {submission.department.institution.name} · {submission.department.name}
        </p>

        {isExpired ? (
          <p className="mt-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            קישור האימות פג תוקף. אפשר לפנות לתמיכה כדי לקבל קישור חדש.
          </p>
        ) : (
          <div className="mt-6">
            <ReviewProofUploadForm token={token} />
          </div>
        )}
      </Card>
    </PageShell>
  );
}
