import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySourceEncoding } from '../../src/server/staz-survey/source-encoding';
import { applyReviewedElectiveCorrection } from '../../src/server/staz-survey/association';
import type { Candidate } from '../../src/lib/staz-survey/domain';
const full = { BQ: "מסלול מלא (שאינו ישיר לסטאז')" };
test('conditional direct-track answer and exact irrelevant-six code identify the audited encoding', () => {
  assert.equal(classifySourceEncoding({ ...full, BR: '' }).profile, 'MODERN');
  assert.equal(classifySourceEncoding({ ...full, BR: '-' }).profile, 'LEGACY');
  assert.equal(classifySourceEncoding({ BF: '6-לא רלוונטי' }).profile, 'MODERN');
  assert.equal(classifySourceEncoding({ BF: '6-something else' }).profile, 'UNKNOWN');
  assert.equal(classifySourceEncoding({ BF: '99-לא רלוונטי' }).profile, 'UNKNOWN');
});
test('year, comment wording, and absence of dashes alone cannot reverse a row', () => {
  for (const B of ['01/01/2020', '31/12/2025']) {
    assert.equal(classifySourceEncoding({ B, BQ: 'מסלול ישיר', BR: '5-מאוד', BL: 'מחלקת ילדים', BP: '-' }).profile, 'UNKNOWN');
    assert.equal(classifySourceEncoding({ B, BQ: '', BR: '' }).profile, 'UNKNOWN');
  }
  assert.equal(classifySourceEncoding({ ...full, BR: '', C: '-' }).profile, 'CONFLICT');
  assert.equal(classifySourceEncoding({ ...full, BR: '', BG: '-', BH: '-', BL: '-', BP: '-' }).profile, 'MODERN');
});
test('cohort corrections reject unverified or different workbooks before interpreting evidence', () => {
  const c = { sourceReviewKey: 'STAZ_SURVEY_2020_2025:R76:CBL', sourceColumnLetter: 'BL', sourceVerified: false, workbookHash: 'other' } as Candidate;
  assert.throws(() => applyReviewedElectiveCorrection(c), /ENCODING_SOURCE_CHANGED/);
  assert.throws(() => applyReviewedElectiveCorrection({ ...c, sourceVerified: true }), /ENCODING_SOURCE_CHANGED/);
});
