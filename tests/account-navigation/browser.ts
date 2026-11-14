import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { prisma as db } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
// Next's local middleware redirects use localhost; keep cookies on that origin.
const base = 'http://localhost:3097', out = 'docs/account-navigation-20261114';

async function main() {
  assert.equal(new URL(process.env.DATABASE_URL!).hostname, process.env.STAZ_TEST_DATABASE_HOST);
  assert.ok(new URL(process.env.DATABASE_URL!).hostname.startsWith('ep-icy-meadow-'));
  const users = await db.user.findMany({ where: { id: { in: ['staz-test-student', 'staz-test-admin'] } } });
  assert.equal(users.length, 2);
  for (const user of users) {
    assert.equal(user.email, user.id + '@example.invalid');
    assert.equal(user.roleKey, user.id === 'staz-test-admin' ? 'ADMIN' : 'STUDENT');
    assert.equal(user.emailVerified, true);
    assert.equal(user.verificationStatus, 'VERIFIED');
  }
  const password = 'Synthetic-' + randomUUID(), passwordHash = await hashPassword(password);
  const browser = await chromium.launch({ channel: 'chrome' });
  const errors: string[] = [], scans: unknown[] = [], redirects: unknown[] = [];
  try {
    for (const user of users) await db.user.update({ where: { id: user.id }, data: { passwordHash } });
    for (const [userId, start] of [
      ['staz-test-student', '/login'],
      ['staz-test-student', '/login?next=%2Fdashboard'],
      ['staz-test-admin', '/login?next=%2Fadmin']
    ]) {
      const user = users.find(user => user.id === userId)!;
      const context = await browser.newContext(), page = await context.newPage();
      page.setDefaultTimeout(60000);
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
      await page.goto(base + start);
      await page.getByLabel('אימייל', { exact: true }).fill(user.email);
      await page.getByLabel('סיסמה', { exact: true }).fill(password);
      const result = page.waitForResponse(response => response.url() === base + '/api/auth/login');
      await page.locator('button.auth-submit').click();
      assert.equal((await result).status(), 200);
      await page.waitForURL(base + '/departments');
      const header = page.locator('header.site-header'), nav = header.getByRole('navigation', { name: 'ניווט ראשי' });
      await nav.getByRole('link', { name: 'אזור אישי', exact: true }).waitFor();
      for (const href of ['/departments', '/career-fit', '/about', '/faq', '/favorites', '/dashboard']) assert.equal(await nav.locator(`a[href="${href}"]`).count(), 1);
      assert.equal(await nav.locator('a[href="/admin"]').count(), 0);
      assert.equal(await page.locator('footer a[href="/sitemap"]').count(), 1);
      redirects.push({ role: user.roleKey, start, destination: new URL(page.url()).pathname });
      if (start === '/login') { await context.close(); continue; }
      if (start !== '/login') {
        for (const width of [1440, 1024, 375]) {
          await page.setViewportSize({ width, height: 1000 });
          if (width === 375) await header.getByRole('button', { name: /תפריט/ }).click();
          assert.equal(await nav.getByRole('link', { name: 'אזור אישי', exact: true }).isVisible(), true);
          assert.equal(await nav.locator('a[href="/departments"]').isVisible(), true);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          await page.addScriptTag({ content: await readFile('node_modules/axe-core/axe.min.js', 'utf8') });
          const violations = await header.evaluate(async el => (await (window as any).axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
          assert.deepEqual(violations, []);
          scans.push({ role: user.roleKey, width, violations, overflow: false });
          await header.screenshot({ path: `${out}/header-${user.roleKey}-${width}.png` });
          if (width === 375) {
            await nav.locator('a[href="/departments"]').focus(); await page.keyboard.press('Escape');
            assert.equal(await header.getByRole('button', { name: /תפריט/ }).getAttribute('aria-expanded'), 'false');
          }
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await nav.getByRole('link', { name: 'אזור אישי', exact: true }).click();
      await page.waitForURL(base + '/dashboard'); await page.getByRole('heading', { name: user.fullName, exact: true }).waitFor();
      const management = page.locator('main a[href="/admin"]');
      assert.equal(await management.count(), user.roleKey === 'ADMIN' ? 1 : 0);
      if (user.roleKey === 'ADMIN') {
        await management.click(); await page.waitForURL(base + '/admin');
        await nav.getByRole('link', { name: 'אזור אישי', exact: true }).waitFor();
      } else {
        const denied = await context.request.get(base + '/api/admin/survey-reviews'); assert.equal(denied.status(), 403);
        await page.goto(base + '/admin');
        await page.waitForURL(url => ['/', '/dashboard'].includes(url.pathname));
        await nav.getByRole('link', { name: 'אזור אישי', exact: true }).waitFor();
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    const report = { passed: true, actualPasswordLogins: 3, redirects, sharedNavigationAndSitemapRetained: true, personalAccountLinkForStudentAndAdmin: true, adminManagementOnlyInAdminAccount: true, studentAdminAccessDenied: true, scans, errors };
    await writeFile(out + '/browser-checks.json', JSON.stringify(report, null, 2) + '\n');
    await writeFile(out + '/integration.json', JSON.stringify({ passed: true, actualPasswordLogins: 3, navigationAndAuthorizationPassed: true }, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    for (const user of users) await db.user.update({ where: { id: user.id }, data: { passwordHash: user.passwordHash } });
    await browser.close();
  }
  for (const user of users) assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash, user.passwordHash);
}
main().finally(() => db.$disconnect()).catch(error => { console.error(error?.name?.startsWith('Prisma') ? { name: error.name, code: error.code } : error); process.exitCode = 1; });
