import 'server-only';
import { cache } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { readCareerFitVisibility } from './policy';

// Deduplicate within a render only; never persist this switch across requests.
export const getCareerFitVisibility = cache(async () => {
  noStore();
  return readCareerFitVisibility(prisma);
});
