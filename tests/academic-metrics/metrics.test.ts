import test from 'node:test';
import assert from 'node:assert/strict';
import { metricIsHidden, projectVisibleSources, sourceIsHidden } from '../../src/lib/source-visibility';
import { departmentAcademicSchema, departmentAcademicValues, formatAcademicPercent } from '../../src/lib/department-academic-metrics';
import { calculateSpecialtyMetrics } from '../../src/lib/specialty-metrics';

for (const ima of [false,true]) for (const imaFinance of [false,true]) for (const imaExams of [false,true]) for (const duns100 of [false,true]) {
  test(`visibility independent: metadata=${ima}, finance=${imaFinance}, exams=${imaExams}, duns=${duns100}`, () => {
    const flags={ima,imaFinance,imaExams,duns100};
    const rows=[{metricKey:'שכר_פריפריה',value:12345,sourceNotes:'הר׳׳י'},{metricKey:'מעבר_שלב_א',value:79.5,sourceNotes:'הר׳׳י'},{metricKey:'imaSyllabusText',rawValue:'syllabus',sourceNotes:'הר״י'},{metricKey:'DUNS100',value:9,sourceName:'DUNS100'},{metricKey:'professorsAmongSeniors',value:0}];
    const projected=projectVisibleSources(rows,flags);
    for(const [key,visible] of [['שכר_פריפריה',imaFinance],['מעבר_שלב_א',imaExams],['imaSyllabusText',ima],['DUNS100',duns100],['professorsAmongSeniors',true]] as const) assert.equal(projected.some(row=>row.metricKey===key),visible,key);
    const nested=projectVisibleSources({salary:12345,shlavAlephPassRate:79.5,departmentBoardPassA:0,metrics:rows},flags);
    assert.equal(nested.salary,imaFinance?12345:null); assert.equal(nested.shlavAlephPassRate,imaExams?79.5:null); assert.equal(nested.departmentBoardPassA,imaExams?0:null);
    assert.deepEqual(projectVisibleSources(nested,flags),nested,'projection is idempotent');
    for(const key of ['boardPassA','boardPassB','boardStageAPassRate','inherited_boardStageBPassRate','מעבר_שלב_ב']) {
      assert.equal(metricIsHidden(key,flags),!imaExams);
      assert.equal(sourceIsHidden('https://www.ima.org.il',flags,key),!imaExams);
      assert.equal(projectVisibleSources([{key,sourceLabel:'הר״י',value:'80%'}],flags).length,imaExams?1:0);
    }
  });
}
test('legacy visibility objects retain their previous all-IMA meaning',()=>{
  assert(metricIsHidden('salary',{ima:false,duns100:true}));
  assert(metricIsHidden('boardPassA',{ima:false,duns100:true}));
});
test('department results never inherit national or legacy department values',()=>{
  const values=departmentAcademicValues([{metricKey:'מעבר_שלב_א',value:89},{metricKey:'boardStageBPassRate',value:92},{metricKey:'inherited_boardStageAPassRate',value:89}]);
  assert.deepEqual(values,{professorsAmongSeniors:null,departmentBoardPassA:null,departmentBoardPassB:null});
  assert.deepEqual(departmentAcademicValues([{metricKey:'professorsAmongSeniors',value:0},{metricKey:'departmentBoardPassA',value:82.75},{metricKey:'departmentBoardPassB',value:101}]),{professorsAmongSeniors:0,departmentBoardPassA:82.75,departmentBoardPassB:null});
  assert.equal(formatAcademicPercent(0),'0%'); assert.equal(formatAcademicPercent(null),null);
});
test('admin inputs preserve null and zero and reject invalid percentages and unrelated fields',()=>{
  const data={professorsAmongSeniors:null,departmentBoardPassA:0,departmentBoardPassB:100};
  assert(departmentAcademicSchema.safeParse(data).success);
  for(const invalid of [-1,100.1,NaN,Infinity,'55','']) assert(!departmentAcademicSchema.safeParse({...data,professorsAmongSeniors:invalid}).success);
  assert(!departmentAcademicSchema.safeParse({...data,seniorPhysiciansCount:25}).success);
});
test('national rates use specialty sources, never average copied department results',()=>{
  const input=[{id:'d',shlavAlephPassRate:98,shlavBetPassRate:99,metrics:[]}];
  const missing=calculateSpecialtyMetrics(input as never,['boardPassA','boardPassB'],['boardPassA','boardPassB'],{specialtyMetrics:[]});
  assert(missing.every(m=>m.isPlaceholder));
  const present=calculateSpecialtyMetrics(input as never,['boardPassA'],['boardPassA'],{specialtyMetrics:[{metricKey:'מעבר_שלב_א',value:73.6,rawValue:'73.6%',sourceNotes:'הר״י'}]});
  assert.equal(present[0].value,'74%');assert.equal(present[0].metricLevel,'ארצי לתחום');
});
