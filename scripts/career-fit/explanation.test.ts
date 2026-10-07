import {test} from 'node:test';
import assert from 'node:assert/strict';
import {medical,RIASEC} from '../../src/lib/career-fit/evidence/model';
import {rankSpecialties} from '../../src/lib/career-fit/evidence/scoring';
import {explainSpecialty} from '../../src/lib/career-fit/evidence/explanation';
test('real occupation explanations trace every reason to the scored dimension and direction',()=>{
 for(const values of [[3,4,0,3,1,2],[4,1,3,0,2,1],[0,1,2,3,4,2]]){
  const answers=Object.fromEntries(medical.map(i=>[i.id,values[RIASEC.indexOf(i.dimension!)]]));
  const result=rankSpecialties('quick',answers),before=JSON.stringify(result);
  for(const row of result.ranked){
   const explanation=explainSpecialty(row);
   assert.deepEqual(explanation,explainSpecialty(row));
   for(const reason of explanation.shared){const d=row.dimensions.find(d=>d.dimension===reason.dimension)!;assert(d.contribution>0);assert.equal(reason.text.startsWith('פחות דגש'),d.userCentered<0);}
   for(const reason of explanation.considerations){const d=row.dimensions.find(d=>d.dimension===reason.dimension)!;assert(d.contribution<0);assert.equal(reason.text.startsWith('הדגש שלך'),d.userCentered>0);}
   assert(!/עצמאות|קצב גבוה|לחץ|רצף טיפולי|קשר ממושך|סיכוי|הצלחה/.test(JSON.stringify(explanation)));
   assert(explanation.shared.length<=3&&explanation.considerations.length<=2);
  }
  assert.equal(JSON.stringify(result),before);
 }
});
