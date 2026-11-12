import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DepartmentExperienceTabs } from '../../src/components/departments/department-experience-tabs';
(globalThis as typeof globalThis & { React: typeof React }).React = React;
test('native review cards, averages and empty tabs render identically to the pre-survey implementation', async () => {
  await mkdir('tmp', { recursive: true }); const dir = await mkdtemp(resolve('tmp/staz-regression-'));
  try {
    const original = execFileSync('git', ['show', '7397eb8d5a6e0bbc4f0a0cd6cfff0755ee09c314:src/components/departments/department-experience-tabs.tsx'], { encoding: 'utf8' });
    const path = resolve(dir, 'previous-tabs.tsx'); await writeFile(path, original);
    const { DepartmentExperienceTabs: Previous } = await import(pathToFileURL(path).href);
    const native = { id: 'synthetic', reviewerType: 'INTERN' as const, displayName: null, isAnonymous: true, teachingQuality: 3, workAtmosphere: 4, seniorsApproachability: 2, researchExposure: 1, lifestyleBalance: 5, overallRecommendation: 4, pros: 'synthetic positive', cons: 'synthetic negative', tips: 'synthetic tip', publishedAt: '2022-01-01', submission: { roleDetails: { clinicalExposure: 3 } } };
    for (const reviews of [[], [native], [{ ...native, reviewerType: 'RESIDENT' as const }], [native, { ...native, id: 'synthetic-two', overallRecommendation: 2 }]]) {
      const props = { title: 'Synthetic department', reviews, canReport: false };
      assert.equal(renderToStaticMarkup(React.createElement(DepartmentExperienceTabs, props)), renderToStaticMarkup(React.createElement(Previous, props)));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
