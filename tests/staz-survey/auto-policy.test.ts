import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyText,planAutomaticReview} from '../../src/server/staz-survey/auto-policy';
import {automationQueueWhere} from '../../src/server/staz-survey/queue';
import type {Candidate,DepartmentOption,RatingEvidence} from '../../src/lib/staz-survey/domain';
import audited from '../../src/server/staz-survey/encoding-elective-corrections.json';
const catalog:DepartmentOption[]=[{id:'unit',name:'מחלקת עיניים',slug:'unit',institutionId:'hospital',institution:{name:'כרמל'},specialty:{name:'מחלות עיניים'}}];
function fixture(value:number|null=3){
  const r:RatingEvidence&{id:string}={id:'rating',metricCode:'ELECTIVE_RECOMMENDATION',label:'המלצה',questionCode:'qus_70',question:'המלצה',sourceRowNumber:10,sourceColumn:'BK',rawAnswer:value===null?'99-לא רלוונטי':value+'-דירוג',scale:'1–5',normalizedValue:value,rotationContext:'ELECTIVE_1',confidence:'EXACT',verified:value!==null};
  const c:Candidate={sourceReviewKey:'test',sourceRowNumber:10,sourceColumnLetter:'BL',sourceYear:2020,originalHospital:'כרמל',rawHospital:'כרמל',originalDepartmentOrScope:'מחלות עיניים',rawDepartment:'מחלות עיניים',sourceQuestion:'פירוט',proposedText:'מחלקה מעולה, צוות מקצועי ויחס נעים',originalText:'מחלקה מעולה, צוות מקצועי ויחס נעים',sourceVerified:true,workbookHash:audited.workbookHash,privacyFlags:[],ratings:[r],sourceEncodingProfile:'LEGACY'};
  return {c,r};
}
test('clear positive text is independent from grades and excludes mixed or unfamiliar language',()=>{
  assert.equal(classifyText('מחלקה מעולה, צוות מקצועי ויחס נעים').category,'POSITIVE');
  for(const text of ['מחלקה טובה אבל לא מלמדים','צוות נחמד, עבודה שחורה','מחלקה טובה?','רונית מדהימה','לא ממליץ, זוועה','רק יחס טוב','מחלקה מצוינת כביכול'])assert.notEqual(classifyText(text).category,'POSITIVE',text);
  assert.equal(classifyText('צוות מעולה בהנהלת ד״ר דוגמה').category,'PRIVACY');
  assert.notEqual(classifyText('יחס טוב למטופל בן 32').category,'POSITIVE');
});
test('3 is included; 2, irrelevant and wrong-row ratings never gain approval',()=>{
  for(const value of [null,1,2,3,4,5]){const {c,r}=fixture(value);const plan=planAutomaticReview(c,catalog,[r]);assert.equal(plan.approveText,true);assert.equal(plan.selectedMetricIds.length,value!==null&&value>=3?1:0);}
  const {c,r}=fixture(5);c.proposedText='מחלקה טובה אבל לא מלמדים';let plan=planAutomaticReview(c,catalog,[r]);assert.equal(plan.approveText,false);assert.deepEqual(plan.selectedMetricIds,['rating']);
  plan=planAutomaticReview(c,catalog,[{...r,sourceRowNumber:11}]);assert.deepEqual(plan.selectedMetricIds,[]);
});
test('unresolved associations, unavailable targets, family and hospital-wide scope block automatic publication',()=>{
  const {c,r}=fixture(5);
  for(const profile of ['UNKNOWN','CONFLICT','MODERN'] as const){const plan=planAutomaticReview({...c,sourceEncodingProfile:profile},catalog,[r]);assert.equal(plan.category,'ASSOCIATION');assert.equal(plan.approveText,false);assert.deepEqual(plan.selectedMetricIds,[]);}
  assert.equal(planAutomaticReview({...c,workbookHash:'different'},catalog,[r]).category,'ASSOCIATION');
  assert.equal(planAutomaticReview(c,[],[r]).category,'MAPPING');
  assert.equal(planAutomaticReview({...c,rawDepartment:'רפואת משפחה'},catalog,[r]).category,'EXCLUDED');
  assert.equal(planAutomaticReview({...c,sourceColumnLetter:'BG'},catalog,[]).category,'EXCLUDED');
});
test('default queue contains only unresolved uncertain text, including rows with approved ratings',()=>{
  assert.deepEqual(automationQueueWhere(null),{automationCategory:'UNCERTAIN',publishText:false,status:{not:'REJECTED'}});
  assert.deepEqual(automationQueueWhere('all'),{});
  assert.deepEqual(automationQueueWhere('invalid'),{id:{in:[]}});
});
