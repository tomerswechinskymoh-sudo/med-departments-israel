import test from 'node:test';
import assert from 'node:assert/strict';
import { readCareerFitVisibility, setCareerFitVisibility } from '../../src/server/site-features/policy';
test('missing, false, or unavailable settings never open the questionnaire', async () => {
  for (const [value, expected] of [[null, false], [{ enabled: false }, false], [{ enabled: true }, true]] as const) {
    const db = { siteFeature: { findUnique: async () => value } } as any;
    assert.deepEqual(await readCareerFitVisibility(db), { enabled: expected, available: true });
  }
  assert.deepEqual(await readCareerFitVisibility({ siteFeature: { findUnique: async () => { throw Error('offline'); } } } as any), { enabled: false, available: false });
});
test('visibility and administrator audit are committed in one transaction', async () => {
  let committed = false; const calls: unknown[] = [];
  const tx = { siteFeature: { upsert: async (args: any) => { calls.push(args); return { enabled: args.update.enabled }; } }, auditLog: { create: async (args: any) => { calls.push(args); } } };
  const db = { $transaction: async (fn: any) => { const result = await fn(tx); committed = true; return result; } } as any;
  assert.deepEqual(await setCareerFitVisibility(db, true, 'test-admin'), { enabled: true });
  assert.equal(committed, true); assert.equal(calls.length, 2);
  tx.auditLog.create = async () => { throw Error('audit failed'); }; committed = false;
  await assert.rejects(setCareerFitVisibility(db, false, 'test-admin')); assert.equal(committed, false);
});
