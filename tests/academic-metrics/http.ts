import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://localhost:3117';
const target=JSON.parse(fs.readFileSync('docs/academic-metrics-20261122/test-target.json','utf8'));
const endpoint=`/api/admin/departments/${target.id}/academic-metrics`;
const profile=`/departments/${encodeURIComponent(target.slug)}?departmentId=${target.id}`;
const empty={professorsAmongSeniors:null,departmentBoardPassA:null,departmentBoardPassB:null};
async function login(role:string){const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({email:`academic-${role}@example.invalid`,password:'Academic-Isolated-Test-2026!'})});assert.equal(r.status,200);return r.headers.get('set-cookie')!.split(';')[0];}
async function patch(path:string,body:unknown,cookie='',origin=base){return fetch(base+path,{method:'PATCH',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify(body)});}
async function html(path:string,cookie:string){const r=await fetch(base+path,{headers:{Cookie:cookie}});assert.equal(r.status,200);return r.text();}
async function main(){
 const admin=await login('admin'),member=await login('student');
 for(const cookie of ['',member]){assert.equal((await patch(endpoint,empty,cookie)).status,403);assert.equal((await patch('/api/admin/source-visibility',{source:'imaExams',enabled:false},cookie)).status,403);}
 assert.equal((await patch(endpoint,empty,admin,'https://example.invalid')).status,403);
 for(const value of [-1,101,'50']) assert.equal((await patch(endpoint,{...empty,professorsAmongSeniors:value},admin)).status,400);
 assert.equal((await patch(endpoint,{...empty,unrelated:true},admin)).status,400);
 let page=await html(profile,member);assert(page.includes('לב השרון'));assert(page.includes('שיעור פרופסורים מתוך הבכירים'));assert(page.includes('הנתון עדיין לא סופק'));assert(page.includes('specialty-exams-title'));assert(page.includes('department-exams-title'));assert(!page.includes('profile-salary-panel'));
 const edit=await html(`/admin/departments/${target.id}`,admin);assert(edit.includes('שמירת מדדי המחלקה'));assert(!edit.includes('value="78"'));
 const supplied={professorsAmongSeniors:23.45,departmentBoardPassA:0,departmentBoardPassB:92.75};
 assert.equal((await patch(endpoint,supplied,admin)).status,200);
 page=await html(profile,member);for(const value of ['23.45%','0%','92.75%'])assert(page.includes(value),value);
 const persisted=await html(`/admin/departments/${target.id}`,admin);assert(persisted.includes('value="23.45"'));
 assert.equal((await patch(endpoint,empty,admin)).status,200);
 page=await html(profile,member);assert(!page.includes('23.45%'));assert(!page.includes('92.75%'));
 for(const imaFinance of [false,true])for(const imaExams of [false,true]){
   for(const [source,enabled] of [['imaFinance',imaFinance],['imaExams',imaExams]])assert.equal((await patch('/api/admin/source-visibility',{source,enabled},admin)).status,200);
   page=await html(profile,member);assert.equal(page.includes('id="profile-exams"'),imaExams);assert.equal(page.includes('profile-salary-panel'),imaFinance);
   const dashboard=await html('/departments?specialty='+target.specialtyId,member);
   assert.equal(dashboard.includes('data-metric-key="boardPassA"'),imaExams);assert.equal(dashboard.includes('data-metric-key="boardPassB"'),imaExams);assert.equal(dashboard.includes('data-metric-key="salaryGap"'),imaFinance);
 }
 for(const [source,enabled] of [['imaFinance',false],['imaExams',true]])assert.equal((await patch('/api/admin/source-visibility',{source,enabled},admin)).status,200);
 const report={passed:true,checks:['admin authorization','cross-origin rejection','input validation','missing vs zero','department and specialty separation','persistent saving and clearing','public cache invalidation','finance/exam matrix on both levels']};
 fs.writeFileSync('docs/academic-metrics-20261122/http-tests.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main();
