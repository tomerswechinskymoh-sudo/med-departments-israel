import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestMapping, mappingOptions, type Candidate, type DepartmentOption } from '../../src/lib/staz-survey/domain';
const row = (hospital: string, department: string): Candidate => ({ sourceReviewKey: 'synthetic', sourceRowNumber: 3, sourceColumnLetter: 'BL', sourceYear: 2020, originalHospital: hospital, rawHospital: hospital, originalDepartmentOrScope: department, rawDepartment: department, sourceQuestion: 'synthetic', proposedText: 'synthetic', originalText: 'synthetic', sourceVerified: true, workbookHash: null, privacyFlags: [], ratings: [] });
const department = (hospital: string, name = 'כירורגיה כללית', id = 'd1'): DepartmentOption => ({ id, name, slug: id, institutionId: hospital, institution: { name: hospital }, specialty: { name: 'כירורגיה כללית' } });
test('known hospital names and abbreviations match the existing catalog without mixing campuses', () => {
  for (const [survey, site] of [['אסף הרופא','מרכז רפואי יצחק שמיר'], ['איכילוב - סוראסקי','מרכז רפואי ת"א סוראסקי'], ['המרכזי בעמק','מרכז רפואי העמק'], ['רבקה זיו','ביה"ח זיו - צפת'], ['רבין בילינסון','ביה"ח בילינסון מרכז רפואי רבין'], ['אסותא אשדוד','בי"ח אסותא אשדוד'], ['נהריה','המרכז הרפואי לגליל']]) assert.equal(suggestMapping(row(survey,'כירורגיה'), [department(site)]).suggestedDepartmentId, 'd1');
  const catalog = [department('ביה"ח בילינסון מרכז רפואי רבין','כירורגיה כללית','beilinson'), department('ביה"ח השרון מרכז רפואי רבין','כירורגיה כללית','hasharon')];
  assert.equal(suggestMapping(row('רבין בילינסון','כירורגיה'), catalog).suggestedDepartmentId, 'beilinson');
  assert.equal(suggestMapping(row('רבין השרון','כירורגיה'), catalog).suggestedDepartmentId, 'hasharon');
  assert.equal(suggestMapping(row('רבין','כירורגיה'), catalog).suggestedDepartmentId, null);
});
test('general surgery maps to its actual array, while a named unit stays on that unit', () => {
  const array = { id: 'array', name: 'מערך כירורגיה כללית', slug: 'array' };
  const catalog = ['א','ב'].map((letter,i) => ({ ...department('מרכז רפואי כרמל','כירורגיה כללית '+letter,'d'+i), medicalArray: array }));
  const broad = suggestMapping(row('כרמל','כירורגיה'), catalog);
  assert.equal(broad.suggestedMedicalArrayId,'array'); assert.equal(broad.suggestedDepartmentId,null);
  const specific = suggestMapping(row('כרמל','כירורגיה א׳'), catalog);
  assert.equal(specific.suggestedDepartmentId,'d0'); assert.equal(specific.suggestedMedicalArrayId,null);
  assert.equal(suggestMapping(row('כרמל','כירורגיה ג'), catalog).suggestedMedicalArrayId,null);
  assert.equal(mappingOptions(catalog).filter(d=>d.kind==='ARRAY').length,1);
});
test('spelling aliases are explicit; missing arrays and hospital-wide comments never guess a unit', () => {
  const gyn = { ...department('מרכז רפואי כרמל','יילוד וגינקולוגיה'), specialty: { name: 'יילוד וגינקולוגיה' } };
  assert.equal(suggestMapping(row('כרמל','יילוד וגניקולוגיה'),[gyn]).suggestedDepartmentId,'d1');
  const ambiguous = [department('כרמל','כירורגיה כללית א','a'),department('כרמל','כירורגיה כללית ב','b')];
  assert.equal(suggestMapping(row('כרמל','כירורגיה'),ambiguous).suggestedDepartmentId,null);
  assert.equal(suggestMapping(row('כרמל','כירורגיה'),ambiguous).suggestedMedicalArrayId,null);
  assert.equal(suggestMapping({...row('כרמל','כירורגיה'), sourceColumnLetter:'BG'},ambiguous).suggestedMedicalArrayId,null);
});
