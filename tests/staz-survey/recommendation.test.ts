import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { combineRecommendations, experienceRecommendation, recommendationSummary } from '../../src/lib/experience-recommendation';
import { DepartmentExperienceTabs } from '../../src/components/departments/department-experience-tabs';
import { ExternalSurveyView } from '../../src/components/departments/external-survey-view';
import type { PublicSurveyExperience } from '../../src/lib/staz-survey/domain';
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const experience = (value?: number): PublicSurveyExperience => ({ id: 'synthetic', text: 'חוויה סינתטית', year: 2023, hospitalScope: false, ratings: value === undefined ? [] : [{ code: 'ELECTIVE_RECOMMENDATION', label: 'old source label', value }] });

test('one recommendation is weighted by rating counts, never by text counts or averages of averages', () => {
  const native = recommendationSummary([2]);
  const imported = recommendationSummary([5, 5, 5]);
  assert.deepEqual(combineRecommendations(native, imported), { count: 4, average: 4.25 });
  assert.deepEqual(experienceRecommendation([{ overallRecommendation: 2 }], [experience(5), experience(5), experience(5), experience()]), { count: 4, average: 4.25 });
  assert.deepEqual(recommendationSummary([0, NaN, 6, -1]), { count: 0, average: 0 });
  assert.deepEqual(experienceRecommendation([], [{ ...experience(5), hospitalScope: true }, { ...experience(), ratings: [{ code: 'TEACHING', label: 'teaching', value: 1 }] }]), { count: 0, average: 0 });
});

test('intern experiences share the general recommendation metric without a source heading', () => {
  const native = { id: 'native', reviewerType: 'INTERN' as const, displayName: null, isAnonymous: true, teachingQuality: 3, workAtmosphere: 4, seniorsApproachability: 2, researchExposure: 1, lifestyleBalance: 5, overallRecommendation: 2, pros: 'synthetic', cons: '', tips: '', publishedAt: null };
  const markup = renderToStaticMarkup(React.createElement(DepartmentExperienceTabs, { title: 'חוות דעת מהמחלקה', reviews: [native], surveyExperiences: [experience(4)], canReport: false }));
  assert.ok(markup.includes('דירוג 3 מתוך 5'));
  assert.ok(!markup.includes('old source label'));
  assert.equal((markup.match(/דירוג כללי/g) ?? []).length, 1);
});

test('an empty unrelated survey does not create a separate experience section', () => {
  for (const state of ['empty', 'unavailable'] as const) assert.equal(renderToStaticMarkup(React.createElement(ExternalSurveyView, { summary: { state, metrics: [], quotes: [] }, specialtyName: 'רפואה פנימית' })), '');
});
