import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { request } from 'playwright';
const base='http://127.0.0.1:3094';const p=Buffer.from(JSON.stringify({userId:'staz-test-admin',role:'admin',exp:Date.now()+3600000})).toString('base64url');
const context=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base,Cookie:'med_departments_session='+p+'.'+createHmac('sha256','synthetic-test-secret-'.repeat(3)).update(p).digest('base64url')}});
try {
 const record={source_batch_key:'STAZ_SURVEY_2020_2025',source_review_key:'STAZ_SURVEY_2020_2025:R49021:CBL',source_row_number:'49021',source_column_letter:'BL',survey_year:'2022',survey_hospital:'מוסד סינתטי',survey_department_or_scope:'פנימית',raw_hospital_from_source_row:'מוסד סינתטי',raw_department_from_source_row:'פנימית',source_question:'סינתטי',review_text_proposed:'טקסט, סינתטי\nבלבד',auto_sentiment:'חיובית',text_approved_for_publication:'TRUE',ratings_approved_for_publication:'TRUE',rating_1_to_5_proposed:'5',moderation_status:'APPROVED'};
 const quote=v=>'"'+v.replaceAll('"','""')+'"';const buffer=Buffer.from(Object.keys(record).join(',')+'\n'+Object.values(record).map(quote).join(','));
 const file={name:'synthetic.csv',mimeType:'text/csv',buffer};let response=await context.post('/api/admin/survey-reviews/import',{multipart:{file,commit:'false'}});assert.equal(response.status(),200);const preview=await response.json();assert.equal(preview.read,1);assert.equal(preview.withVerifiedRating,0);
 response=await context.post('/api/admin/survey-reviews/import',{multipart:{file,commit:'true',previewHash:'wrong'}});assert.equal(response.status(),400);
 response=await context.post('/api/admin/survey-reviews/import',{multipart:{file,commit:'true',previewHash:preview.previewHash}});assert.equal(response.status(),200);const first=await response.json();assert.equal(first.inserted,1);
 response=await context.post('/api/admin/survey-reviews/import',{multipart:{file,commit:'true',previewHash:preview.previewHash}});assert.equal(response.status(),200);assert.equal((await response.json()).inserted,0);
 const queue=await (await context.get('/api/admin/survey-reviews?q='+encodeURIComponent('טקסט, סינתטי'))).json();const row=await (await context.get('/api/admin/survey-reviews/'+queue.rows[0].id)).json();assert.equal(row.status,'PENDING_REVIEW');assert.equal(row.publishText,false);assert.equal(row.publishRatings,false);assert.equal(row.sourceVerified,false);assert.deepEqual(row.ratings,[]);assert.equal(queue.source.isPublicEnabled,false);
 response=await context.post('/api/admin/survey-reviews/import',{multipart:{file:{...file,name:'synthetic.xlsm'},commit:'false'}});assert.equal(response.status(),400);
 console.log(JSON.stringify({passed:true,csvPreview:true,hashBoundConfirmation:true,idempotent:true,untrustedApprovalFlagsIgnored:true,unverifiedRatingNeverImported:true,extensionValidation:true,sourceStayedOff:true}));
} finally {await context.dispose();}
