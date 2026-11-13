import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { experienceQuotes, filterExperienceQuotes, wrapQuoteIndex } from '../../src/lib/experience-carousel';
import { ExperienceCarousel } from '../../src/components/departments/experience-carousel';
import type { PublicSurveyExperience } from '../../src/lib/staz-survey/domain';
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const sample = (id: string, year: number, value?: number, text: string | null = 'synthetic quote'): PublicSurveyExperience => ({ id, year, text, hospitalScope: false, ratings: value === undefined ? [] : [{ code: 'ELECTIVE_RECOMMENDATION', label: 'original question', value }] });
test('quote filters use only each experience’s approved personal rating and preserve its year and text', () => {
  const input = [sample('low', 2023, 3), sample('high', 2024, 5), sample('unrated', 2025), sample('rating-only', 2025, 4, null), { ...sample('other-metric', 2022), ratings: [{ code: 'TEACHING', label: 'teaching', value: 5 }] }];
  const before = JSON.stringify(input), quotes = experienceQuotes([], input);
  assert.deepEqual(quotes.map(q => q.id), ['import:unrated', 'import:high', 'import:low', 'import:other-metric']);
  assert.deepEqual(filterExperienceQuotes(quotes, '5').map(q => q.id), ['import:high']);
  assert.deepEqual(filterExperienceQuotes(quotes, '3').map(q => q.id), ['import:low']);
  assert.deepEqual(filterExperienceQuotes(quotes, 'unrated').map(q => q.id), ['import:unrated', 'import:other-metric']);
  assert.equal(filterExperienceQuotes(quotes, '1').length, 0);
  assert.equal(JSON.stringify(input), before);
  assert.equal(quotes[0].year, 2025);
  assert.equal(quotes[0].parts[0].text, input[2].text);
});
test('navigation wraps in both directions and handles a single quote', () => {
  assert.equal(wrapQuoteIndex(-1, 3), 2);
  assert.equal(wrapQuoteIndex(3, 3), 0);
  assert.equal(wrapQuoteIndex(1, 1), 0);
  assert.equal(wrapQuoteIndex(-1, 0), 0);
});
test('only one escaped quote is rendered; rating-only experiences never produce blank cards', () => {
  const html = renderToStaticMarkup(React.createElement(ExperienceCarousel, { reviews: [], surveyExperiences: [sample('new', 2025, 5, '<script>synthetic</script>'), sample('old', 2020, 3, 'should not be rendered')], canReport: false }));
  assert.equal((html.match(/data-experience-quote=/g) ?? []).length, 1);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('should not be rendered'));
  const ratingOnly = renderToStaticMarkup(React.createElement(ExperienceCarousel, { reviews: [], surveyExperiences: [sample('rating', 2024, 5, null)], canReport: false }));
  assert.ok(!ratingOnly.includes('data-experience-quote'));
  assert.ok(ratingOnly.includes('אין תגובות טקסט'));
});
