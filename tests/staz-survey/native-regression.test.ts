import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load } from 'cheerio';
import { DepartmentExperienceTabs } from '../../src/components/departments/department-experience-tabs';
(globalThis as typeof globalThis & { React: typeof React }).React = React;
// The requested carousel replaces stacked markup while retaining native data.
test('native experiences retain all text sections, scores, anonymity and reporting while rendering one quote', () => {
  const native = { id: 'synthetic', reviewerType: 'INTERN' as const, displayName: 'must stay private', isAnonymous: true, teachingQuality: 3, workAtmosphere: 4, seniorsApproachability: 2, researchExposure: 1, lifestyleBalance: 5, overallRecommendation: 4, pros: 'synthetic positive', cons: 'synthetic negative', tips: 'synthetic tip', publishedAt: '2024-01-01', submission: { roleDetails: { clinicalExposure: 3 } } };
  const reviews = [native, { ...native, id: 'older', pros: 'older positive', publishedAt: '2022-01-01', overallRecommendation: 2 }];
  const before = JSON.stringify(reviews);
  const html = renderToStaticMarkup(React.createElement(DepartmentExperienceTabs, { title: 'Synthetic department', reviews, canReport: true }));
  const $ = load(html);
  assert.equal($('[data-experience-quote]').length, 1);
  assert.equal($('[data-experience-quote]').attr('data-experience-quote'), 'native:synthetic');
  assert.deepEqual($('blockquote').map((_, el) => $(el).text()).get(), [native.pros, native.cons, native.tips]);
  assert.equal($('.experience-quote-year').text(), '2024');
  assert.ok($('.experience-recommendation-summary [role=img]').attr('aria-label')?.includes('דירוג 3 מתוך 5'));
  assert.ok(html.includes('דיווח על תוכן'));
  assert.ok(!html.includes(native.displayName));
  assert.ok(!html.includes('older positive'));
  assert.equal(JSON.stringify(reviews), before);
});
test('empty categories retain their contribution action and show no carousel', () => {
  const html = renderToStaticMarkup(React.createElement(DepartmentExperienceTabs, { title: 'Synthetic department', reviews: [], canReport: false, emptyAction: React.createElement('button', null, 'הוספת חוויה') }));
  assert.ok(html.includes('אין עדיין חוויות מאושרות'));
  assert.ok(html.includes('הוספת חוויה'));
  assert.ok(!html.includes('data-experience-quote'));
});
