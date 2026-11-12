import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:3094',out=new URL('../../docs/staz-survey-mapping-20261112/',import.meta.url).pathname;
const fixture=JSON.parse(await readFile('/private/tmp/hitmachut-staz-mapping-private-20261112/browser-fixture.json','utf8'));
const axe=await readFile(new URL('../../node_modules/axe-core/axe.min.js',import.meta.url),'utf8');
const token=role=>{const p=Buffer.from(JSON.stringify({userId:'staz-test-'+role,role,exp:Date.now()+3600000})).toString('base64url');return p+'.'+createHmac('sha256','synthetic-test-secret-'.repeat(3)).update(p).digest('base64url');};
const browser=await chromium.launch({channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1100}});
await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[],scans=[],patches=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(r.method()==='PATCH'&&r.url().endsWith('/'+fixture.reviewId))patches.push(r.postDataJSON());});
async function scan(label){
 await page.addScriptTag({content:axe});
 const violations=await page.evaluate(async()=>(await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})));
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
 scans.push({label,violations,overflow});
}
try{
 for(const role of [null,'student']){await context.clearCookies();if(role)await context.addCookies([{name:'med_departments_session',value:token(role),url:base}]);assert.equal((await context.request.get(base+'/api/admin/survey-reviews')).status(),403);}
 await context.clearCookies();await context.addCookies([{name:'med_departments_session',value:token('admin'),url:base}]);
 assert.equal((await context.request.patch(base+'/api/admin/survey-reviews/'+fixture.reviewId,{headers:{Origin:'https://invalid.example'},data:{}})).status(),403);
 const current=await(await context.request.get(base+'/api/admin/survey-reviews/'+fixture.reviewId)).json();
 assert.equal(current.sourceQuestion,fixture.question);assert.ok(fixture.question.startsWith('בדיקת מערך סינתטית '));
 assert.equal((await context.request.patch(base+'/api/admin/survey-reviews/'+fixture.reviewId,{headers:{Origin:base},data:{revision:current.revision,action:'SAVE',targetDepartmentId:null,targetMedicalArrayId:null,mappingConfirmed:false,mappingExceptionReason:'',approvedPublicText:'',publishText:false,publishRatings:false,selectedMetricIds:[],privacyReviewed:false,adminNotes:''}})).status(),200);patches.length=0;
 const queue=await(await context.request.get(base+'/api/admin/survey-reviews?question='+encodeURIComponent(fixture.question))).json();
 assert.equal(queue.source.isPublicEnabled,true);assert.equal(queue.rows[0].suggestedMedicalArrayId,fixture.arrayId);assert.equal(queue.rows[0].suggestedDepartmentId,null);
 await page.goto(base+'/admin/survey-reviews');await page.getByText('חיפוש וסינון התגובות',{exact:true}).click();await page.getByLabel('שאלת מקור',{exact:true}).selectOption(fixture.question);
 const card=page.locator(`[data-review-id="${fixture.reviewId}"]`);await card.waitFor();await page.getByText('חיפוש וסינון התגובות',{exact:true}).click();
 await card.getByText('המערך המוצע',{exact:true}).waitFor();assert.equal(await card.getByRole('combobox').count(),0);
 await card.getByRole('button',{name:'פרסום תגובה',exact:true}).click();await card.getByRole('button',{name:'התגובה פורסמה ✓',exact:true}).waitFor();assert.equal(patches.length,1);
 await card.getByRole('button',{name:'פרסום ציון המלצה',exact:true}).click();await card.getByRole('button',{name:'הציון פורסם ✓',exact:true}).waitFor();assert.equal(patches.length,2);
 assert.ok(patches.every(p=>p.targetMedicalArrayId===fixture.arrayId&&p.targetDepartmentId===null));
 for(const width of [1440,375]){await page.setViewportSize({width,height:1100});await scan('admin-'+width);await card.screenshot({path:out+'admin-card-'+width+'.png'});}
 await page.setViewportSize({width:1440,height:1100});
 await page.goto(base+'/departments/'+fixture.departmentSlug);
 await page.getByText(fixture.text,{exact:true}).waitFor();assert.ok(await page.getByRole('img',{name:'דירוג 5 מתוך 5',exact:true}).count()>=1);
 await page.getByRole('link',{name:/חוויות מאושרות/}).waitFor();
 const metricSizes=[];
 for(const width of [1440,768,375]){
  await page.setViewportSize({width,height:1100});await scan('profile-'+width);
  const sizes=await page.locator('.profile-kpi-strip .profile-data-metric').evaluateAll(nodes=>nodes.map(el=>({height:el.getBoundingClientRect().height,value:parseFloat(getComputedStyle(el.querySelector('.profile-metric-value')).fontSize),caption:el.querySelector('.profile-metric-caption')?parseFloat(getComputedStyle(el.querySelector('.profile-metric-caption')).fontSize):null})));
  assert.ok(sizes.length>0);assert.ok(sizes.every(s=>s.value<=22&&(!s.caption||s.caption<=12)&&s.height<190),JSON.stringify(sizes));metricSizes.push({width,sizes});
  await page.locator('.profile-kpi-strip').screenshot({path:out+'profile-metrics-'+width+'.png'});
  await page.getByText(fixture.text,{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:out+'experience-'+width+'.png'});
 }
 for(const [label,path]of [['directory','/departments'],['comparison','/compare?departments='+fixture.departmentId+','+fixture.otherDepartmentId],['home','/'],['dashboard','/dashboard'],['admin','/admin']]){
  await page.goto(base+path);assert.ok(!page.url().includes('/login'));
  for(const width of [1440,375]){await page.setViewportSize({width,height:1100});await page.evaluate(()=>scrollTo(0,0));await scan(label+'-'+width);await page.screenshot({path:out+label+'-'+width+'.png'});}
 }
 const report={passed:errors.length===0&&scans.every(s=>!s.violations.length&&!s.overflow),syntheticOnly:true,arrayPreselected:true,oneClickText:true,oneClickRating:true,publicArrayExperienceAndRating:true,truthfulSurveyHeader:true,metricSizes,scans,errors};
 await writeFile(out+'browser-results.json',JSON.stringify(report,null,2)+'\n');assert.ok(report.passed,JSON.stringify({errors,scans}));console.log('PASS: mapping, one-click publication, visible public experience and rating, compact metric sizes and '+scans.length+' accessibility/layout scans.');
}finally{await writeFile(out+'browser-diagnostics.json',JSON.stringify({errors,scans},null,2));await browser.close();}
