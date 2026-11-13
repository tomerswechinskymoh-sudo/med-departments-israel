import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { prisma as db } from '../../src/lib/prisma';
import { SOURCE_ID } from '../../src/lib/staz-survey/domain';
import { publicSurveyExperiences, publicSurveyWhere } from '../../src/server/staz-survey/public';
import { publicVisibleDepartmentWhere } from '../../src/lib/queries';
const base = 'http://127.0.0.1:3097', out = 'docs/staz-survey-carousel-20261113';

async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_TEST_DATABASE_HOST);
  assert.ok(!process.env.DATABASE_URL!.includes('ep-odd-pine-'));
  await mkdir(out, { recursive: true });
  const fixture = JSON.parse(await readFile('docs/staz-survey-presentation-20261113/integration.json', 'utf8'));
  const source = await db.surveyReviewSource.findUniqueOrThrow({ where: { id: SOURCE_ID } });
  const fingerprint = async () => createHash('sha256').update(JSON.stringify(await db.surveyReview.findMany({ orderBy: { id: 'asc' }, include: { ratings: { orderBy: { id: 'asc' } } } }))).digest('hex');
  const before = await fingerprint();
  const browser = await chromium.launch({ channel: 'chrome' }), context = await browser.newContext(), page = await context.newPage();
  page.setDefaultTimeout(60000);
  await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const errors: string[] = [], scans: unknown[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const payload = Buffer.from(JSON.stringify({ userId: 'staz-test-admin', role: 'admin', exp: Date.now() + 3600000 })).toString('base64url');
  await context.addCookies([{ name: 'med_departments_session', value: payload + '.' + createHmac('sha256', 'synthetic-test-secret-'.repeat(3)).update(payload).digest('base64url'), url: base }]);
  const quote = page.locator('[data-experience-quote]');
  const id = () => quote.getAttribute('data-experience-quote');
  const next = () => page.getByRole('button', { name: 'התגובה הבאה', exact: true }).click();
  let syntheticId: string | null = null;
  try {
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: true } });
    const targetId = new URL(fixture.rambam.href, base).searchParams.get('departmentId')!;
    const target = await db.department.findUniqueOrThrow({ where: { id: targetId }, select: { medicalArrayId: true } });
    const members = await db.department.findMany({ where: { AND: [publicVisibleDepartmentWhere, { medicalArrayId: target.medicalArrayId }] }, select: { id: true } });
    const experiences = await publicSurveyExperiences(db, members.map(d => d.id), { role: 'admin' }, [target.medicalArrayId!]);
    const texts = experiences.filter(experience => experience.text?.trim());
    assert.ok(texts.length > 5 && texts.some(text => !text.ratings.length));
    await page.goto(base + fixture.rambam.href + '#department-experiences');
    await page.getByRole('button', { name: /^סטאז׳רים \(/ }).click();
    await quote.waitFor();
    const summaryBefore = await page.locator('.experience-recommendation-summary').innerText();
    const seen = new Set<string>();
    for (let i = 0; i < texts.length; i++) {
      assert.equal(await quote.count(), 1);
      const activeId = await id(); seen.add(activeId!);
      const expected = texts.find(text => 'import:' + text.id === activeId)!;
      assert.ok(expected);
      assert.equal(await quote.locator('blockquote').textContent(), expected.text);
      assert.equal(await quote.locator('.experience-quote-year').innerText(), String(expected.year));
      await next();
    }
    assert.equal(seen.size, texts.length);
    assert.equal(await page.locator('.experience-carousel-position').innerText(), `1 מתוך ${texts.length}`);
    await page.getByRole('button', { name: 'התגובה הקודמת', exact: true }).click();
    assert.equal(await page.locator('.experience-carousel-position').innerText(), `${texts.length} מתוך ${texts.length}`);
    const carousel = page.getByRole('region', { name: 'תגובות מהמחלקה' });
    await carousel.focus(); await carousel.press('Home'); const firstId = await id();
    await carousel.press('ArrowLeft'); assert.notEqual(await id(), firstId);
    await carousel.press('ArrowRight'); assert.equal(await id(), firstId);
    await carousel.press('End'); assert.equal(await page.locator('.experience-carousel-position').innerText(), `${texts.length} מתוך ${texts.length}`);
    const filter = page.getByLabel('סינון לפי דירוג', { exact: true });
    for (const value of ['5', '4', '3', '2', '1', 'unrated']) {
      await filter.selectOption(value);
      const expected = texts.filter(text => {
        const rating = text.ratings.find(r => r.code === 'ELECTIVE_RECOMMENDATION')?.value;
        return value === 'unrated' ? rating === undefined : rating === Number(value);
      });
      if (!expected.length) {
        assert.equal(await quote.count(), 0);
        assert.ok((await page.getByRole('status').innerText()).includes('אין תגובות בדירוג'));
      } else {
        const ids = new Set<string>();
        for (let i = 0; i < expected.length; i++) {
          assert.equal(await quote.count(), 1); ids.add((await id())!);
          const rating = await quote.locator('.experience-quote-meta').innerText();
          assert.ok(rating.includes(value === 'unrated' ? 'ללא דירוג' : Number(value).toFixed(1)));
          if (expected.length > 1) await next();
        }
        assert.deepEqual([...ids].sort(), expected.map(e => 'import:' + e.id).sort());
        if (expected.length === 1) assert.equal(await page.getByRole('button', { name: 'התגובה הבאה', exact: true }).isDisabled(), true);
      }
      assert.equal(await page.locator('.experience-recommendation-summary').innerText(), summaryBefore);
    }
    await filter.selectOption('1'); await page.getByRole('button', { name: 'הצגת כל התגובות', exact: true }).click();
    assert.equal(await filter.inputValue(), 'all');
    await filter.selectOption('5'); await page.getByRole('button', { name: /^סטודנטים \(/ }).click();
    assert.equal(await quote.count(), 0);
    await page.getByRole('button', { name: /^סטאז׳רים \(/ }).click(); assert.equal(await filter.inputValue(), 'all');
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 1050 });
      const section = page.locator('#department-experiences').locator('..'); await section.scrollIntoViewIfNeeded();
      assert.equal(await quote.locator('blockquote').evaluate(node => getComputedStyle(node).fontStyle), 'italic');
      await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
      const violations = await section.evaluate(async el => (await (window as any).axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.deepEqual(violations, []); assert.equal(overflow, false);
      scans.push({ width, height: (await section.boundingBox())!.height, violations, overflow });
      await section.screenshot({ path: out + '/carousel-' + width + '.png' });
    }
    // Approved real quotes are short. Exercise expansion with an explicitly
    // synthetic, temporary public-DTO fixture on this guarded test branch only.
    const template = await db.surveyReview.findFirstOrThrow({ where: { AND: [publicSurveyWhere(), { publishText: true, targetMedicalArrayId: target.medicalArrayId }] } });
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } = template;
    syntheticId = 'carousel-ui-' + randomUUID();
    const longText = 'זו תגובת בדיקה סינתטית ארוכה לבדיקת המשך קריאה. הטקסט המלא נשמר גם כאשר התצוגה מקוצרת. '.repeat(20);
    await db.surveyReview.create({ data: { ...fields, id: syntheticId, sourceReviewKey: `${SOURCE_ID}:UI:${syntheticId}`, sourceRowNumber: 49034, sourceYear: 2025, approvedPublicText: longText, publishRatings: false } });
    await page.reload();
    await page.getByRole('button', { name: /^סטאז׳רים \(/ }).click(); await quote.waitFor();
    for (let i = 0; i < texts.length + 1 && await id() !== 'import:' + syntheticId; i++) await next();
    assert.equal(await id(), 'import:' + syntheticId);
    const more = page.getByRole('button', { name: 'המשך קריאה', exact: true }); await more.waitFor();
    assert.ok((await quote.locator('.experience-quote-body').boundingBox())!.height <= 257);
    await more.click(); assert.equal(await quote.locator('blockquote').textContent(), longText);
    assert.equal(await page.getByRole('button', { name: 'הצג פחות', exact: true }).getAttribute('aria-expanded'), 'true');
    await page.getByRole('button', { name: 'הצג פחות', exact: true }).click();
    await db.surveyReview.deleteMany({ where: { id: syntheticId, sourceReviewKey: `${SOURCE_ID}:UI:${syntheticId}` } }); syntheticId = null;
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: false } });
    await page.reload();
    assert.equal(await quote.count(), 0);
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: true } });
    await page.reload(); await quote.waitFor(); assert.equal(await quote.count(), 1);
    await context.clearCookies(); await page.reload(); assert.equal(await quote.count(), 0);
    assert.equal(await fingerprint(), before); assert.deepEqual(errors, []);
    const report = { passed: true, quotesTraversed: texts.length, oneQuoteOnly: true, originalTextYearAndRatingPreserved: true, ratingAndUnratedFilters: true, ratingOnlyNotRendered: true, aggregateUnaffectedByFilter: true, wrappingAndKeyboardNavigation: true, emptyAndSingleResultStates: true, roleChangeResetsFilter: true, fullLongTextExpandable: true, sourceHideRestoreAndViewerGate: true, approvalsAndRecordsUnchanged: true, scans, errors };
    await writeFile(out + '/browser-checks.json', JSON.stringify(report, null, 2) + '\n');
    await writeFile(out + '/integration.json', JSON.stringify({ passed: true, approvalsAndRecordsUnchanged: true, publishedQuotesTraversed: texts.length, sourceHideRestoreAndViewerGate: true }, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    if (syntheticId) await db.surveyReview.deleteMany({ where: { id: syntheticId, sourceReviewKey: `${SOURCE_ID}:UI:${syntheticId}` } });
    await db.surveyReviewSource.update({ where: { id: SOURCE_ID }, data: { isPublicEnabled: source.isPublicEnabled } });
    await browser.close();
  }
}
main().finally(() => db.$disconnect()).catch(error => { console.error(error?.name?.startsWith('Prisma') ? { name: error.name, code: error.code ?? 'DATABASE_FIXTURE_FAILED' } : error); process.exitCode = 1; });
