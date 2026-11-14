import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { reviewSubmissionSchema } from '../../src/lib/validation';
import { residentConditionsSchema, RESIDENT_CONDITIONS_VERSION, residentConditionMetrics, residentConditionRows } from '../../src/lib/resident-conditions';
import { experienceQuotes } from '../../src/lib/experience-carousel';
import { average } from '../../src/lib/utils';
import { DepartmentExperienceTabs } from '../../src/components/departments/department-experience-tabs';
(globalThis as any).React = React;
const conditions = { version: RESIDENT_CONDITIONS_VERSION, year: 2024, workStart: '07:30', workEnd: '16:00', monthlyDuties: 4, salaryGross: 18000, calm: 2, peers: 3, seniors: 4, family: 5 };
const submission = { departmentId: 'synthetic', reviewerType: 'RESIDENT', isAnonymous: true, overallRecommendation: 4, roleDetails: { residentCurrentStatus: 'active', residentConditions: conditions }, consentToContact: true, consentToTerms: true, consentNoPatientInfo: true };
const review = { id: 'one', reviewerType: 'RESIDENT' as const, displayName: 'private', isAnonymous: true, overallRecommendation: 4, teachingQuality: null, workAtmosphere: null, seniorsApproachability: null, researchExposure: null, lifestyleBalance: null, pros: '', cons: '', tips: 'synthetic tip', publishedAt: '2026-11-14', submission: { roleDetails: submission.roleDetails } };

test('new resident answers survive validation without invented legacy ratings', () => {
  const data = reviewSubmissionSchema.parse(submission);
  assert.deepEqual(data.roleDetails.residentConditions, conditions);
  assert.equal(data.teachingQuality, undefined);
  assert.equal(data.roleDetails.overallRating, undefined);
  const minimal = reviewSubmissionSchema.parse({ ...submission, teachingQuality: null, roleDetails: { ...submission.roleDetails, residentConditions: { version: RESIDENT_CONDITIONS_VERSION, year: 2024, salaryGross: '', peers: '' } } });
  assert.equal(minimal.roleDetails.residentConditions?.salaryGross, undefined);
  assert.equal(minimal.roleDetails.residentConditions?.peers, undefined);
  assert.equal(minimal.teachingQuality, undefined);
});
test('units, clock pairs, years, scale bounds and zero duty eligibility are validated', () => {
  for (const invalid of [{ salaryGross: 18 }, { monthlyDuties: 32 }, { monthlyDuties: -1 }, { monthlyDuties: 2.2 }, { workStart: '99:00' }, { workEnd: '' }, { workEnd: '06:00' }, { peers: 0 }, { seniors: 6 }, { calm: 2.5 }, { monthlyDuties: 0 }, { year: new Date().getFullYear() + 1 }]) {
    assert.equal(residentConditionsSchema.safeParse({ ...conditions, ...invalid }).success, false, JSON.stringify(invalid));
  }
  const noDuty = residentConditionsSchema.parse({ ...conditions, monthlyDuties: 0, calm: '' });
  assert.equal(noDuty.monthlyDuties, 0); assert.equal(noDuty.calm, undefined);
  assert.equal(reviewSubmissionSchema.safeParse({ ...submission, overallRecommendation: '' }).success, false);
});
test('legacy resident and other role required fields cannot be bypassed', () => {
  assert.equal(reviewSubmissionSchema.safeParse({ ...submission, reviewerType: 'INTERN' }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...submission, roleDetails: { residentCurrentStatus: 'active' } }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...submission, roleDetails: { ...submission.roleDetails, residentCurrentStatus: 'completed' } }).success, false);
});
test('metrics use per-question denominators, preserve zero, keep salary in gross and exclude other roles/legacy', () => {
  const second = { ...review, submission: { roleDetails: { residentConditions: { version: RESIDENT_CONDITIONS_VERSION, year: 2025, monthlyDuties: 0, peers: 5 } } } };
  const metrics = residentConditionMetrics([review, second, { ...review, reviewerType: 'INTERN' }, { ...review, submission: { roleDetails: {} } }]);
  const byKey = Object.fromEntries(metrics.map(m => [m.key, m]));
  assert.equal(byKey.shifts.value, 2); assert.equal(byKey.shifts.respondents, 2);
  assert.equal(byKey.peers.value, 4); assert.equal(byKey.peers.respondents, 2);
  assert.equal(byKey.salaryGross.value, 18000); assert.equal(byKey.salaryGross.respondents, 1);
  assert.equal(byKey.salaryNet, undefined); assert.equal(byKey.hours.value, 8.5);
  assert.equal(byKey.calm.value, 2); assert.equal(byKey.calm.respondents, 1);
  assert.equal(byKey.peers.startYear, 2024); assert.equal(byKey.peers.endYear, 2025);
  assert.equal(average([null, 2, 4]), 3);
});
test('quote uses experience year, recommendation stays independent, nullable fields never become ratings', () => {
  const quote = experienceQuotes([review], [])[0];
  assert.equal(quote.year, 2024); assert.equal(quote.rating, 4); assert.deepEqual(quote.otherRatings, []);
  assert.equal(quote.author, null);
  assert.ok(residentConditionRows(submission.roleDetails).some(([k, v]) => k === 'שכר חודשי ברוטו' && String(v).includes('18,000')));
  const html = renderToStaticMarkup(React.createElement(DepartmentExperienceTabs, { title: 'Synthetic', reviews: [review], canReport: false }));
  assert.ok(html.includes('דיווחים באתר')); assert.ok(html.includes('2024')); assert.ok(html.includes('1 משיבים'));
  assert.ok(!html.includes('דירוג 0 מתוך 5')); assert.ok(!html.includes('מדדים נוספים בקטגוריה')); assert.ok(!html.includes('private'));
});
