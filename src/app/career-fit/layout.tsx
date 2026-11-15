import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getCareerFitVisibility } from '@/server/site-features/visibility';

export const dynamic = 'force-dynamic';
export default async function CareerFitLayout({ children }: { children: ReactNode }) {
  if (!(await getCareerFitVisibility()).enabled) notFound();
  return children;
}
