import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveSurveyScope} from '../../src/server/external-survey/public';
import {experienceQuotes, filterExperienceQuotes} from '../../src/lib/experience-carousel';
const catalog={specialties:[{id:'p',slug:'pediatrics'},{id:'a',slug:'פתולוגיה'},{id:'b',slug:'diagnostic-pathology'}],institutions:[{id:'B1',slug:'rabin-beilinson',name:'מרכז רפואי רבין - בילינסון'},{id:'B2',slug:'ביהח-בילינסון',name:'ביה"ח בילינסון מרכז רפואי רבין'},{id:'H',slug:'hasharon',name:'ביה"ח השרון מרכז רפואי רבין'},{id:'S',slug:'schneider',name:'מרכז שניידר לרפואת ילדים בישראל'}]};
test('effective campus names resolve to canonical survey IDs without cross-campus assignment',()=>{
 assert.deepEqual(resolveSurveyScope('p','ביה"ח בילינסון מרכז רפואי רבין',catalog),{specialtyId:'p',institutionId:'B1'});
 assert.deepEqual(resolveSurveyScope('p','ביה"ח השרון מרכז רפואי רבין',catalog),{specialtyId:'p',institutionId:'H'});
 assert.deepEqual(resolveSurveyScope('a','מרכז שניידר לילדים',catalog),{specialtyId:'b',institutionId:'S'});
 assert.equal(resolveSurveyScope('p','מרכז רפואי רבין',catalog),null);
 assert.equal(resolveSurveyScope('p','מוסד לא מזוהה',catalog),null);
});
test('resident survey joins the same carousel with exact year/text and no fabricated recommendation',()=>{
 const result=experienceQuotes([],[],[{id:'test',text:'Exact original text',year:2024,scopeLabel:'Hospital specialty array'}]);
 assert.equal(result.length,1);assert.equal(result[0].role,'RESIDENT');assert.equal(result[0].rating,null);
 assert.equal(result[0].parts[0].text,'Exact original text');assert.equal(result[0].year,2024);
 assert.equal(filterExperienceQuotes(result,'5').length,0);assert.equal(filterExperienceQuotes(result,'unrated').length,1);
});
test('legacy catalog aliases preserve HMO and Hadassah campus boundaries',()=>{
 const c={specialties:catalog.specialties,institutions:[{id:'K',slug:'clalit',name:'כללית'},{id:'Kold',slug:'שירותי-בריאות-כללית',name:'שירותי בריאות כללית'},{id:'R',slug:'rambam',name:'רמב"ם - הקריה הרפואית לבריאות האדם'},{id:'Rold',slug:'מרכז-רפואי-רמבם',name:'מרכז רפואי רמב"ם'},{id:'E',slug:'hadassah-ein-kerem',name:'הדסה עין כרם'},{id:'Eold',slug:'ביהח-הדסה-עין-כרם',name:'ביה"ח הדסה עין כרם'},{id:'M',slug:'hadassah-mount-scopus',name:'הדסה הר הצופים'}]};
 assert.equal(resolveSurveyScope('p','שירותי בריאות כללית',c)?.institutionId,'K');
 assert.equal(resolveSurveyScope('p','מרכז רפואי רמב"ם',c)?.institutionId,'R');
 assert.equal(resolveSurveyScope('p','ביה"ח הדסה עין כרם',c)?.institutionId,'E');
 assert.equal(resolveSurveyScope('p','הדסה הר הצופים',c)?.institutionId,'M');
 assert.equal(resolveSurveyScope('p','הדסה',c),null);
});
