import { createHash } from 'node:crypto';
import type { Candidate, ElectiveCorrection } from '@/lib/staz-survey/domain';
import manifest from './reviewed-elective-corrections.json';

export function electiveContextHash(c: Candidate): string {
  if (!c.electives) throw new Error('ELECTIVE_CONTEXT_REQUIRED');
  const a = c.electives.ELECTIVE_1, b = c.electives.ELECTIVE_2;
  return createHash('sha256').update(JSON.stringify([c.sourceReviewKey, c.sourceYear, c.originalText,
    a.hospital, a.department, a.rating.rawAnswer, b.hospital, b.department, b.rating.rawAnswer])).digest('hex');
}

// These are reviewed, per-response corrections bound to exact source evidence.
// No inference is made from survey year, sentiment, or an adjacent response.
export function applyReviewedElectiveCorrection(c: Candidate): Candidate {
  const correction = manifest.corrections.find(r => r.sourceReviewKey === c.sourceReviewKey);
  if (!correction) return c;
  if (c.sourceColumnLetter === 'BG' || !c.sourceVerified || electiveContextHash(c) !== correction.contextHash) throw new Error('ELECTIVE_CORRECTION_SOURCE_CHANGED');
  return { ...c, electiveCorrection: { ...correction, version: manifest.version } as ElectiveCorrection };
}
