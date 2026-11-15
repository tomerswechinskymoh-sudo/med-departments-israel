import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { prisma as db } from '../../src/lib/prisma';
const base = 'http://localhost:3097', out = 'docs/career-fit-visibility-20261115';
const protectedPaths = ['/career-fit', '/career-fit/departments', '/career-fit/sources', '/career-fit/methodology'];
async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, 'ep-icy-meadow-amxew6gx.c-5.us-east-1.aws.neon.tech');
  const original = await db.siteFeature.findUniqueOrThrow({ where: { key: 'career_fit' } });
  assert.equal(original.enabled, false);
  const users = await db.user.findMany({ where: { id: { in: ['staz-test-admin', 'staz-test-student'] } } });
  assert.equal(users.length, 2);
  for (const user of users) { assert.equal(user.email, user.id + '@example.invalid'); assert.equal(user.roleKey, user.id === 'staz-test-admin' ? 'ADMIN' : 'STUDENT'); }
  const browser = await chromium.launch({ channel: 'chrome' });
  const admin = await browser.newContext(), guest = await browser.newContext(), student = await browser.newContext();
  for (const [ctx, id, role] of [[admin, 'staz-test-admin', 'admin'], [student, 'staz-test-student', 'student']] as const) {
    const payload = Buffer.from(JSON.stringify({ userId: id, role, exp: Date.now() + 3600000 })).toString('base64url');
    await ctx.addCookies([{ name: 'med_departments_session', value: payload + '.' + createHmac('sha256', process.env.AUTH_SECRET!).update(payload).digest('base64url'), url: base }]);
  }
  for (const context of [admin, guest, student]) await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
  const page = await admin.newPage(), publicPage = await guest.newPage(), errors: string[] = [], scans: unknown[] = [];
  for (const p of [page, publicPage]) { p.setDefaultTimeout(60000); p.on('pageerror', e => errors.push(e.message)); }
  const endpoint = base + '/api/admin/career-fit-visibility';
  const patch = (ctx: typeof admin, data: unknown, origin = base) => ctx.request.patch(endpoint, { headers: { Origin: origin }, data });
  try {
    for (const ctx of [guest, student]) assert.equal((await patch(ctx, { enabled: true })).status(), 403);
    assert.equal((await patch(admin, { enabled: true }, 'https://example.invalid')).status(), 403);
    assert.equal((await admin.request.patch(endpoint, { data: { enabled: true } })).status(), 403);
    for (const data of [{ enabled: 'true' }, { enabled: true, extra: true }, {}]) assert.equal((await patch(admin, data)).status(), 400);
    assert.equal((await db.siteFeature.findUniqueOrThrow({ where: { key: 'career_fit' } })).enabled, false);
    const off = async () => {
      for (const path of ['/', '/departments', '/about', '/faq', '/sitemap']) {
        await publicPage.goto(base + path);
        assert.equal(await publicPage.locator('a[href^="/career-fit"]').count(), 0, path);
        assert.equal(await publicPage.getByText('שאלון Beta', { exact: true }).count(), 0);
        assert.equal(await publicPage.locator('[data-career-fit-control]').count(), 0);
      }
      for (const path of protectedPaths) {
        const response = await publicPage.goto(base + path);
        assert.ok([200, 404].includes(response!.status()));
        assert.equal(await publicPage.locator('.beta-badge').count(), 0, path);
        assert.equal(await publicPage.locator('meta[name="robots"][content="noindex"]').count() > 0, true, path);
      }
      assert.equal((await guest.request.get(base + '/api/career-fit/catalog')).status(), 404);
    };
    await off();
    await page.goto(base + '/admin');
    const control = page.locator('[data-career-fit-control]');
    await control.getByRole('button', { name: 'הצגת השאלון באתר', exact: true }).waitFor();
    assert.equal(await page.locator('header a[href="/admin"]').count(), 1);
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
      const violations = await control.evaluate(async el => (await (window as any).axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id));
      assert.deepEqual(violations, []); scans.push({ width, violations, overflow: false });
      await control.screenshot({ path: out + '/admin-' + width + '.png' });
      await publicPage.setViewportSize({ width, height: 1000 }); await publicPage.goto(base + '/');
      assert.equal(await publicPage.locator('.journey-cards article').count(), 2);
      assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await publicPage.screenshot({ path: out + '/home-' + width + '.png', fullPage: true });
    }
    await control.getByRole('button', { name: 'הצגת השאלון באתר', exact: true }).click();
    await control.getByRole('button', { name: 'הסתרת השאלון מהאתר', exact: true }).waitFor();
    await page.reload(); await control.getByRole('button', { name: 'הסתרת השאלון מהאתר', exact: true }).waitFor();
    assert.equal((await db.siteFeature.findUniqueOrThrow({ where: { key: 'career_fit' } })).enabled, true);
    await publicPage.goto(base + '/'); assert.equal(await publicPage.locator('.journey-cards article').count(), 3);
    assert.equal(await publicPage.locator('a[href="/career-fit"]').count(), 3);
    await publicPage.goto(base + '/faq'); assert.equal(await publicPage.getByRole('button', { name: 'שאלון Beta', exact: true }).count(), 1);
    for (const path of protectedPaths) {
      assert.equal((await publicPage.goto(base + path))!.status(), 200);
      assert.ok(await publicPage.locator('.beta-badge').count() > 0);
    }
    assert.equal((await guest.request.get(base + '/api/career-fit/catalog')).status(), 200);
    await control.getByRole('button', { name: 'הסתרת השאלון מהאתר', exact: true }).click();
    await control.getByRole('button', { name: 'הצגת השאלון באתר', exact: true }).waitFor();
    await off();
    const logs = await db.auditLog.findMany({ where: { action: 'admin.career_fit_visibility_updated', createdAt: { gte: original.updatedAt } }, orderBy: { createdAt: 'desc' }, take: 2 });
    assert.deepEqual(logs.map(l => l.metadata), [{ enabled: false }, { enabled: true }]);
    assert.ok(logs.every(l => l.actorUserId === 'staz-test-admin'));
    assert.deepEqual(errors, []);
    const report = { passed: true, adminToggleBothDirections: true, persistedAfterReload: true, guestAndStudentDenied: true, sameOriginEnforced: true, malformedInputRejected: true, auditVerified: true, hiddenLinksAndRoutes: true, enabledRoutesRestored: true, finalEnabled: false, scans, errors };
    await writeFile(out + '/integration.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } finally {
    await db.siteFeature.update({ where: { key: 'career_fit' }, data: { enabled: original.enabled } });
    await browser.close();
  }
}
main().finally(() => db.$disconnect()).catch(e => { console.error(e?.name?.startsWith('Prisma') ? { name: e.name, code: e.code } : e); process.exitCode = 1; });
