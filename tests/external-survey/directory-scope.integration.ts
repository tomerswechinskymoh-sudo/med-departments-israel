import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {prisma as db} from '../../src/lib/prisma';
import {getExperienceDirectoryData} from '../../src/server/staz-survey/directory';
import {getDepartmentPageData} from '../../src/lib/queries';
import {readSurveySummary,resolveSurveyScope} from '../../src/server/external-survey/public';
async function main(){
 assert.ok(process.env.RESIDENT_TEST_HOST?.startsWith('ep-icy-meadow-'));
 const all=await getExperienceDirectoryData({searchAcrossSpecialties:true},null);
 const populated=all.filter(c=>c.residentSurveyCount>0);
 const c={institutions:await db.institution.findMany({select:{id:true,name:true,slug:true}}),specialties:await db.specialty.findMany({select:{id:true,slug:true}})};
 const rows=await db.externalSurveyResponse.findMany({where:{sourceId:'resident-conditions-survey-2024',status:'PUBLISHED'},select:{id:true,specialtyId:true,institutionId:true}});
 const covered=new Set<string>();const targetProblems:unknown[]=[];
 for(let offset=0;offset<populated.length;offset+=6) await Promise.all(populated.slice(offset,offset+6).map(async card=>{
  const scope=resolveSurveyScope(card.specialtyId,card.institutionName,c)!;
  const expected=rows.filter(r=>r.specialtyId===scope.specialtyId&&r.institutionId===scope.institutionId);
  assert.equal(card.residentSurveyCount,expected.length);
  expected.forEach(r=>covered.add(r.id));
  const profile=await getDepartmentPageData(card.slug,undefined,card.hrefDepartmentId);
  if(!profile){targetProblems.push({card:card.id,reason:'missing-profile'});return;}

  const local=await readSurveySummary(db,profile.specialty.id,{role:'admin',emailVerified:true,verificationStatus:'VERIFIED'},{institutionName:profile.institution.name,specialtyName:profile.specialty.name,isArray:Boolean(card.isArrayCard),siblingCount:profile.siblingDepartmentCount});
  if(profile.siblingDepartmentCount>1)assert.ok(local.quotes.every(q=>q.scopeLabel?.includes('ללא זיהוי המחלקה הנפרדת')));
  if(local.quotes.length!==card.residentSurveyCount)targetProblems.push({card:card.id,count:card.residentSurveyCount,local:local.quotes.length});
 }));
 const aggregates=await db.externalSurveyAggregate.findMany({where:{sourceId:'resident-conditions-survey-2024',status:'PUBLISHED',institutionId:{not:null}},select:{groupKey:true,specialtyId:true,institutionId:true}});
 const scopes=all.flatMap(card=>{const scope=resolveSurveyScope(card.specialtyId,card.institutionName,c);return scope?[scope]:[]});
 const coveredMetrics=aggregates.filter(a=>scopes.some(s=>s.institutionId===a.institutionId&&s.specialtyId===a.specialtyId));
 const report={passed:targetProblems.length===0,localMetricCellsOnPublicProfiles:coveredMetrics.length,localGroupsOnPublicProfiles:new Set(coveredMetrics.map(m=>m.groupKey)).size,totalCards:all.length,populatedCards:populated.length,publishedQuotes:rows.length,quotesWithPublicProfile:covered.size,quotesWithoutPublicProfile:rows.length-covered.size,targetProblems};
 await writeFile('docs/resident-survey-local-20261114/directory-scope.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.ok(report.passed);
}
main().catch(e=>{console.error(e.code||e.message);process.exitCode=1}).finally(()=>db.$disconnect());
