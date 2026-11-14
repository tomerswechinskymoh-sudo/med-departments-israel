import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { residentConditionMetrics } from '../../src/lib/resident-conditions';
import { readSignupExperienceReceipt } from '../../src/lib/server/signup-experience';

const db = new PrismaClient({ log: [] }), base = 'http://localhost:3097', out = 'docs/resident-conditions-form-20261114';
const marker = 'resident-form-' + randomUUID(), email = marker + '@example.invalid';
const conditions = { version: 'resident-conditions-v1', year: 2024, workStart: '07:30', workEnd: '16:00', monthlyDuties: 4, salaryGross: 18000, calm: 2, peers: 3, seniors: 4, family: 5 };
function cookie(userId: string, role: string) {
  const payload = Buffer.from(JSON.stringify({ userId, role, exp: Date.now() + 3600000 })).toString('base64url');
  return { name: 'med_departments_session', value: payload + '.' + createHmac('sha256', process.env.AUTH_SECRET!).update(payload).digest('base64url'), url: base };
}
async function main() {
  assert.ok(process.env.RESIDENT_TEST_HOST?.startsWith('ep-icy-meadow-'));
  const browser = await chromium.launch({ channel: 'chrome' }), context = await browser.newContext(), page = await context.newPage();
  const errors: string[] = [], scans: unknown[] = [];
  let submitted: Record<string, unknown> | undefined;
  const before = await db.externalSurveyResponse.count();
  page.setDefaultTimeout(60000); page.on('pageerror', e => errors.push(e.message));
  await context.route('**/*', r => r.request().url().startsWith(base + '/') ? r.continue() : r.abort());
  try {
    await context.addCookies([cookie('staz-test-student', 'student')]);
    await page.goto(base + '/departments');
    const href = await page.locator('.department-card').first().getByRole('link', { name: 'לעמוד המחלקה' }).getAttribute('href'); assert.ok(href);
    await page.goto(base + href); console.log('Opened department form context');
    await page.getByRole('button', { name: 'הוספת חוויה', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'הוספת חוויה' });
    await dialog.locator('label').filter({ has: page.locator('input[value="RESIDENT"]') }).click();
    if (!await dialog.locator('[name="departmentId"]').inputValue()) {
      const options = await dialog.locator('[name="departmentId"] option').evaluateAll(els => els.map(el => (el as HTMLOptionElement).value).filter(Boolean));
      assert.ok(options[0]); await dialog.locator('[name="departmentId"]').selectOption(options[0]);
    }
    const departmentId = await dialog.locator('[name="departmentId"]').inputValue();
    await dialog.locator('[name="email"]').fill(email);
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'synthetic.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic test only') });
    await dialog.getByRole('button', { name: 'המשך', exact: true }).click();
    for (const key of ['calm', 'peers', 'seniors', 'family']) assert.equal(await dialog.locator(`[name="roleDetails.residentConditions.${key}"]`).inputValue(), '');
    assert.equal(await dialog.locator('[name="overallRecommendation"]').inputValue(), '');
    assert.equal(await dialog.locator('details select').evaluateAll(els => els.every(el => (el as HTMLSelectElement).value === '')), true);
    for (const [key, value] of Object.entries(conditions)) {
      if (key === 'version') continue;
      const field = dialog.locator(`[name="roleDetails.residentConditions.${key}"]`);
      if (['calm', 'peers', 'seniors', 'family'].includes(key)) await field.selectOption(String(value));
      else await field.fill(String(value));
    }
    await dialog.locator('[name="roleDetails.residentConditions.monthlyDuties"]').fill('0');
    assert.equal(await dialog.locator('[name="roleDetails.residentConditions.calm"]').isDisabled(), true);
    assert.equal(await dialog.locator('[name="roleDetails.residentConditions.calm"]').inputValue(), '');
    await dialog.locator('[name="roleDetails.residentConditions.monthlyDuties"]').fill('4');
    await dialog.locator('[name="roleDetails.residentConditions.calm"]').selectOption('2');
    await dialog.locator('[name="overallRecommendation"]').selectOption('4');
    await dialog.locator('[name="tips"]').fill(marker + ' — חוויה סינתטית לצורך בדיקה בלבד');
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await dialog.getByRole('heading', { name: 'תנאי ההתמחות', exact: true }).scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
      const violations = await dialog.evaluate(async el => (await (window as any).axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
      assert.deepEqual(violations, []); scans.push({ width, overflow: false, violations });
      await page.screenshot({ path: out + '/form-' + width + '.png' });
    }
    await dialog.getByRole('button', { name: 'המשך', exact: true }).click();
    await dialog.getByRole('button', { name: 'חזרה', exact: true }).click();
    assert.equal(await dialog.locator('[name="roleDetails.residentConditions.salaryGross"]').inputValue(), '18000');
    await dialog.getByRole('button', { name: 'המשך', exact: true }).click();
    const responsePromise = page.waitForResponse(r => r.url() === base + '/api/reviews' && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'שליחה', exact: true }).click();
    const response = await responsePromise; console.log('Submitted resident form'); assert.equal(response.status(), 200, await response.text());
    const pending = await db.reviewSubmission.findFirstOrThrow({ where: { email } });
    submitted = pending.roleDetails as Record<string, unknown>;
    assert.deepEqual(submitted.residentConditions, conditions);
    assert.equal(pending.status, 'PENDING_REVIEW'); assert.equal(pending.verificationStatus, 'PENDING_ADMIN_REVIEW');
    assert.equal(pending.teachingQuality, null); assert.equal(pending.workAtmosphere, null); assert.equal(pending.lifestyleBalance, null);
    assert.equal((submitted as any).overallRating, undefined);
    assert.equal(await db.review.count({ where: { submissionId: pending.id } }), 0);
    const moderationUrl = base + '/api/admin/reviews/' + pending.id;
    const denied = await context.request.post(moderationUrl, { headers: { origin: base }, data: { status: 'APPROVED' } }); assert.equal(denied.status(), 403);
    await context.addCookies([cookie('staz-test-admin', 'admin')]);
    const approved = await context.request.post(moderationUrl, { headers: { origin: base }, data: { status: 'APPROVED' } }); assert.equal(approved.status(), 200, await approved.text());
    const published = await db.review.findUniqueOrThrow({ where: { submissionId: pending.id }, include: { submission: true } });
    assert.equal(published.overallRecommendation, 4); assert.equal(published.teachingQuality, null);
    assert.equal(published.verificationStatus, 'VERIFIED'); assert.equal(published.submission.status, 'PUBLISHED');
    assert.equal(residentConditionMetrics([published]).find(m => m.key === 'hours')?.value, 8.5);
    await page.goto(base + href);
    await page.getByRole('button', { name: /מתמחים ורופאים/ }).click();
    const nativePanel = page.getByRole('region', { name: 'תנאי ההתמחות מדיווחים באתר' });
    await nativePanel.waitFor(); assert.ok((await nativePanel.innerText()).includes('2024'));
    const quote = page.locator('[data-experience-quote="native:' + published.id + '"]');
    // Other real historical responses may precede our synthetic record; select by carousel navigation.
    const carousel = page.getByRole('region', { name: 'תגובות מהמחלקה' });
    const count = Number((await carousel.locator('.experience-carousel-position').innerText()).split('מתוך')[1].trim());
    for (let i = 0; i < count && !(await quote.count()); i++) await carousel.getByRole('button', { name: 'התגובה הבאה' }).click();
    assert.equal(await quote.count(), 1); assert.equal(await quote.locator('.experience-quote-year').innerText(), '2024'); assert.ok((await quote.innerText()).includes(marker));
    await context.clearCookies(); const guest = await page.goto(base + href); assert.ok(!(await guest!.text()).includes(marker)); assert.equal(await nativePanel.count(), 0);
    // The same schema supports signup contributions and issues a receipt only with proof + text.
    const form = new FormData();
    for (const [k, v] of Object.entries({ departmentId, reviewerType: 'RESIDENT', email, fullName: '', phone: '', pros: '', cons: '', isAnonymous: 'true', overallRecommendation: '4', roleDetails: JSON.stringify({ residentCurrentStatus: 'active', residentConditions: conditions }), tips: marker, signupContribution: 'true', consentToContact: 'true', consentToTerms: 'true', consentNoPatientInfo: 'true' })) form.set(k, v);
    form.set('verificationDocument', new File(['%PDF-1.4\nSynthetic'], 'synthetic.pdf', { type: 'application/pdf' }));
    const direct = await fetch(base + '/api/reviews', { method: 'POST', headers: { origin: base, 'x-forwarded-for': '127.0.0.231' }, body: form });
    const body = await direct.json(); assert.equal(direct.status, 200, JSON.stringify(body)); assert.ok(readSignupExperienceReceipt(body.signupExperienceReceipt));
    assert.deepEqual(errors, []); assert.equal(await db.externalSurveyResponse.count(), before);
    const report = { passed: true, pendingThenApproved: true, allSourceQuestionsPersisted: true, absentScoresNull: true, recommendationIndependent: true, experienceYearPreserved: true, signupReceipt: true, nonAdminDenied: true, guestTextAndMetricsPrivate: true, externalDataUnchanged: true, scans, errors, externalMessagesSent: 0 };
    await writeFile(out + '/integration.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } finally {
    const submissions = await db.reviewSubmission.findMany({ where: { email }, select: { id: true } });
    const ids = submissions.map(s => s.id);
    await db.auditLog.deleteMany({ where: { entityId: { in: ids }, entityType: 'ReviewSubmission' } });
    await db.uploadedFile.deleteMany({ where: { reviewSubmissionId: { in: ids } } });
    await db.reviewSubmission.deleteMany({ where: { id: { in: ids } } });
    await browser.close();
  }
}
main().catch(e => { console.error(e?.name?.startsWith('Prisma') ? { name: e.name, code: e.code } : e); process.exitCode = 1; }).finally(() => db.$disconnect());
