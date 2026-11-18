import test from 'node:test';
import assert from 'node:assert/strict';
import { isLevHasharon, LEV_HASHARON } from '../../src/lib/hospital-identity';
import { canonicalRabinHospitalName, resolveEffectiveHospitalName, resolveEffectiveHospitalAssignment, RABIN_HASHARON, RABIN_MEDICAL_CENTER } from '../../src/lib/effective-hospital';
import { resolveSurveyScope } from '../../src/server/external-survey/public';
import { getHospitalLogo, getEffectiveInstitutionBrandingKey } from '../../src/components/departments/hospital-logos';
import { getHospitalLogo as getLegacyLogo } from '../../src/lib/hospital-logos';
import { slugForHospitalAlias } from '../../src/crawler/hospitals/hospital-alias-registry';
import { resolveOpenAlexAliases } from '../../src/lib/server/openalex-research';
import { suggestMapping, type Candidate } from '../../src/lib/staz-survey/domain';
import { mapValue } from '../../src/lib/external-survey/mapping';

const levNames = ['לב השרון', 'מרכז לבה"נ לב השרון', 'המרכז לבריאות הנפש לב השרון', 'בית חולים לב השרון', 'לב־השרון', 'לב\u200f  השרון', 'lev-hasharon', 'Lev HaSharon'];
for (const name of levNames) test(`Lev Hasharon stays independent: ${name}`, () => {
 assert(isLevHasharon(name));assert.equal(canonicalRabinHospitalName(name), null);
 assert.equal(resolveEffectiveHospitalName(name, 'רבין'), LEV_HASHARON);
 const assignment=resolveEffectiveHospitalAssignment(name, 'רבין');
 assert.equal(assignment.isRabinRelated,false);assert.equal(assignment.isReassigned,false);assert.equal(assignment.countsAsPhysicalDepartment,true);
 assert.equal(slugForHospitalAlias(name),'lev-hasharon');
 assert.equal(getLegacyLogo({name,slug:'lev-hasharon'}),null);
});
test('Hasharon Hospital retains its Rabin identity and campus reassignment',()=>{
 for(const name of [RABIN_HASHARON,'בית חולים השרון','השרון']){
  assert.equal(isLevHasharon(name),false);assert.equal(canonicalRabinHospitalName(name),RABIN_HASHARON);
  assert.equal(resolveEffectiveHospitalName(name),RABIN_HASHARON);assert.equal(slugForHospitalAlias(name),'rabin');
 }
 assert.equal(resolveEffectiveHospitalName(RABIN_HASHARON,'רבין'),RABIN_MEDICAL_CENTER);
 assert.equal(resolveEffectiveHospitalName(RABIN_MEDICAL_CENTER,'השרון'),RABIN_HASHARON);
 assert.equal(resolveEffectiveHospitalName(RABIN_MEDICAL_CENTER,'לב השרון'),RABIN_MEDICAL_CENTER);
});
const institutions=[{id:'lev',name:'מרכז לבה"נ לב השרון',slug:'מרכז-לבהנ-לב-השרון'}, {id:'rabin',name:'מרכז רפואי רבין - השרון',slug:'rabin-hasharon'}, {id:'rabin-import',name:RABIN_HASHARON,slug:'ביהח-השרון-מרכז-רפואי-רבין'}];
const catalog={specialties:[{id:'psych',slug:'psychiatry',name:'פסיכיאטריה'}],institutions};
test('resident survey scope preserves institution IDs and never crosses hospitals',()=>{
 for(const name of levNames) assert.deepEqual(resolveSurveyScope('psych',name,catalog),{specialtyId:'psych',institutionId:'lev'});
 assert.deepEqual(resolveSurveyScope('psych',RABIN_HASHARON,catalog),{specialtyId:'psych',institutionId:'rabin'});
 assert.equal(mapValue('INSTITUTION','לב השרון',catalog).targetId,'lev');
});
test('intern survey mapping distinguishes both hospitals with the same specialty',()=>{
 const departments=institutions.slice(0,2).map(i=>({id:i.id,name:'פסיכיאטריה',slug:i.id,institutionId:i.id,institution:{name:i.name},specialty:{name:'פסיכיאטריה'}}));
 for(const [name,id] of [[LEV_HASHARON,'lev'],[RABIN_HASHARON,'rabin']]){
  const candidate={rawHospital:name,originalHospital:name,rawDepartment:'פסיכיאטריה',originalDepartmentOrScope:'פסיכיאטריה',sourceColumnLetter:'BL'} as Candidate;
  assert.equal(suggestMapping(candidate,departments).suggestedDepartmentId,id);
 }
});
test('branding uses a neutral Lev Hasharon mark and retains the Rabin logo',()=>{
 const key=getEffectiveInstitutionBrandingKey(institutions[0],LEV_HASHARON);
 assert.equal(key,'lev-hasharon');assert.equal(getHospitalLogo({...institutions[0],brandingKey:key}),null);
 assert(getHospitalLogo({slug:'rabin-hasharon'})?.includes(encodeURIComponent('השרון רבין')));
});
test('research enrichment never borrows Rabin aliases for Lev Hasharon',async()=>{
 const db={openAlexAliasMapping:{findUnique:async()=>null}} as unknown as Parameters<typeof resolveOpenAlexAliases>[0];
 const lev=await resolveOpenAlexAliases(db,{institutionName:institutions[0].name,specialtyName:'פסיכיאטריה'});
 assert.deepEqual(lev.institutionAliases,[]);assert.equal(lev.needsMapping,true);
 const rabin=await resolveOpenAlexAliases(db,{institutionName:RABIN_HASHARON,specialtyName:'רפואה פנימית'});
 assert(rabin.institutionAliases.includes('Rabin Medical Center'));
});

test('original import rows retain their identifiers and never map Rabin doctors to Lev Hasharon', async()=>{
 const {loadMasterDeptTargets,matchDoctorToMasterDept}=await import('../../src/crawler/hospitals/master-dept');
 const targets=await loadMasterDeptTargets();const lev=targets.filter(t=>isLevHasharon(t.hospitalNameRaw));
 assert(lev.length>0);assert(lev.every(t=>t.providerGuess==='government'&&t.institutionType==='psychiatricHospital'));
 const match=matchDoctorToMasterDept({hospital:'Rabin Medical Center',sourceUrl:lev[0].sourceUrlNormalized!,unit:'פסיכיאטריה',rawText:''},lev);
 assert.equal(match.matchedMasterDeptRowIds.length,0);
});
