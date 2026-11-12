import { createHash } from 'node:crypto';
import type { Candidate, ElectiveCorrection } from '@/lib/staz-survey/domain';
import manifest from './reviewed-elective-corrections.json';
import encodingManifest from './encoding-elective-corrections.json';

export function electiveContextHash(c: Candidate): string {
  if (!c.electives) throw new Error('ELECTIVE_CONTEXT_REQUIRED');
  const a = c.electives.ELECTIVE_1, b = c.electives.ELECTIVE_2;
  return createHash('sha256').update(JSON.stringify([c.sourceReviewKey, c.sourceYear, c.originalText,
    a.hospital, a.department, a.rating.rawAnswer, b.hospital, b.department, b.rating.rawAnswer])).digest('hex');
}

// Existing per-response decisions take precedence and keep their original version.
// The second manifest is a bounded, audited encoding cohort, never a year rule.
export function applyReviewedElectiveCorrection(c: Candidate): Candidate {
  const correction = manifest.corrections.find(r => r.sourceReviewKey === c.sourceReviewKey);
  if (correction) {
    if (c.sourceColumnLetter === 'BG' || !c.sourceVerified || electiveContextHash(c) !== correction.contextHash) throw new Error('ELECTIVE_CORRECTION_SOURCE_CHANGED');
    return { ...c, electiveCorrection: { ...correction, version: manifest.version } as ElectiveCorrection };
  }
  const encoded = (encodingManifest.corrections as { sourceReviewKey: string; contextHash: string; rotation: string }[]).find(r => r.sourceReviewKey === c.sourceReviewKey);
  if (!encoded) return c;
  if (c.sourceColumnLetter === 'BG' || !c.sourceVerified || c.workbookHash !== encodingManifest.workbookHash || electiveContextHash(c) !== encoded.contextHash || encoded.rotation !== (c.sourceColumnLetter === 'BL' ? 'ELECTIVE_2' : 'ELECTIVE_1')) throw new Error('ELECTIVE_ENCODING_SOURCE_CHANGED');
  return { ...c, electiveCorrection: { version: encodingManifest.version, rotation: encoded.rotation,
    contextHash: encoded.contextHash, reason: encodingManifest.reason, requiresManualTarget: false } as ElectiveCorrection };
}
