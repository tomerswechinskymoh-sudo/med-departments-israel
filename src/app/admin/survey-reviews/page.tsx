import { requireAdmin } from '@/lib/auth-guards';
import { PageShell } from '@/components/layout/page-shell';
import { SurveyReviewWorkbench } from '@/components/admin/survey-review-workbench';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'אישור חוויות סקר הסטאז׳', robots: { index: false, follow: false } };
export default async function SurveyReviewsPage() {
  await requireAdmin();
  return <PageShell className="py-8"><SurveyReviewWorkbench /></PageShell>;
}
