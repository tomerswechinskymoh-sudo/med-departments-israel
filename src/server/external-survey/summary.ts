import 'server-only';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readSurveySummary } from './public';
import type { SurveySummary } from '@/lib/external-survey/presentation';
export async function getExternalSurveySummary(specialtyId: string, local?: Parameters<typeof readSurveySummary>[3]): Promise<SurveySummary> {
  try { return await readSurveySummary(prisma, specialtyId, await getSession(), local); }
  catch { console.error('[external-survey] Summary unavailable; content withheld'); return { state: 'unavailable', metrics: [], quotes: [] }; }
}
