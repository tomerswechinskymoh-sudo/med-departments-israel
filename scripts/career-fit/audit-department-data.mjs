// Read-only aggregates only: no people, review texts, submissions or applicant records.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import dotenv from 'dotenv';
const root=process.env.HITMACHUT_DATA_ROOT??process.cwd();
const env=dotenv.parse(readFileSync(root+'/.env.production.local'));
const db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}},log:[]});
const out='/private/tmp/hitmachut-phase4c';
try {
 const response=await fetch('https://www.hitmachut.org/api/career-fit/catalog');
 if(!response.ok)throw Error('Public catalog unavailable');
 const catalog=await response.json();
 const ids=catalog.departments.map(d=>d.id);
 const q=(sql)=>db.$queryRawUnsafe(sql,ids);
 const inventory=await q(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='Department' ORDER BY ordinal_position`);
 const scalar=await q(`SELECT d.specialty_id, x.key AS field, count(*) FILTER (WHERE x.value <> 'null'::jsonb AND x.value <> '\"\"'::jsonb)::int AS departments FROM "Department" d CROSS JOIN LATERAL jsonb_each(to_jsonb(d)) x WHERE d.id=ANY($1::text[]) GROUP BY d.specialty_id,x.key ORDER BY d.specialty_id,x.key`);
 const metrics=await q(`SELECT d.specialty_id,m.metric_key, min(m.label) label,count(*)::int rows,count(m.value)::int numeric,count(m.raw_value)::int raw,min(m.value) minimum,max(m.value) maximum,count(DISTINCT m.value)::int distinct_values,min(m.source_notes) source_example,min(m.last_updated) first_updated,max(m.last_updated) last_updated FROM "DepartmentMetric" m JOIN "Department" d ON d.id=m.department_id WHERE d.id=ANY($1::text[]) GROUP BY d.specialty_id,m.metric_key ORDER BY m.metric_key,d.specialty_id`);
 const yearly=await q(`SELECT d.specialty_id,m.metric_key,m.year,count(*)::int rows,count(m.value)::int numeric,min(m.source_notes) source_example FROM "DepartmentYearlyMetric" m JOIN "Department" d ON d.id=m.department_id WHERE d.id=ANY($1::text[]) GROUP BY d.specialty_id,m.metric_key,m.year ORDER BY m.metric_key,m.year,d.specialty_id`);
 const research=await q(`SELECT d.specialty_id,m.year,m.source,m.needs_mapping,m.is_ambiguous,count(*)::int rows,count(m.publications_count)::int numeric,min(m.confidence_score) min_confidence,max(m.confidence_score) max_confidence FROM "DepartmentResearchMetric" m JOIN "Department" d ON d.id=m.department_id WHERE d.id=ANY($1::text[]) GROUP BY d.specialty_id,m.year,m.source,m.needs_mapping,m.is_ambiguous ORDER BY d.specialty_id,m.year`);
 const reviews=await q(`SELECT d.specialty_id,r.reviewer_type,r.verification_status,count(*)::int responses,count(DISTINCT r.department_id)::int departments,min(r.published_at) first_publication,max(r.published_at) last_publication FROM "Review" r JOIN "Department" d ON d.id=r.department_id WHERE d.id=ANY($1::text[]) GROUP BY d.specialty_id,r.reviewer_type,r.verification_status`);
 const sampleDistribution=await q(`WITH samples AS (SELECT d.specialty_id,r.reviewer_type,r.department_id,count(*) n FROM "Review" r JOIN "Department" d ON d.id=r.department_id WHERE d.id=ANY($1::text[]) AND r.verification_status='VERIFIED' GROUP BY d.specialty_id,r.reviewer_type,r.department_id) SELECT specialty_id,reviewer_type,count(*)::int departments,count(*) FILTER(WHERE n>=5)::int departments_at_least_5,max(n)::int largest_sample FROM samples GROUP BY specialty_id,reviewer_type`);
 const relations={};
 for(const table of ['ResearchOpportunity','DepartmentExternalMetric','DepartmentExternalPerson','DepartmentHead','OfficialDepartmentUpdate']) {
  relations[table]=await q(`SELECT d.specialty_id,count(*)::int rows,count(DISTINCT t.department_id)::int departments FROM "${table}" t JOIN "Department" d ON d.id=t.department_id WHERE d.id=ANY($1::text[]) GROUP BY d.specialty_id`);
 }
 const external=await q(`SELECT m.metric_key,m.source_name,m.approved,count(*)::int rows,count(DISTINCT d.specialty_id)::int specialties FROM "DepartmentExternalMetric" m JOIN "Department" d ON d.id=m.department_id WHERE d.id=ANY($1::text[]) GROUP BY m.metric_key,m.source_name,m.approved`);
 const explanations=await db.$queryRawUnsafe(`SELECT sheet,metric_key,readable_label,explanation,source_label,is_national_metric FROM "DataExplanation"`);
 const institution=await q(`SELECT i.region,i.type,count(*)::int departments FROM "Department" d JOIN "Institution" i ON i.id=d.institution_id WHERE d.id=ANY($1::text[]) GROUP BY i.region,i.type`);
 const result={retrievedAt:new Date().toISOString(),catalogSha256:createHash('sha256').update(JSON.stringify(catalog.departments)).digest('hex'),inventory,scalar,metrics,yearly,research,reviews,sampleDistribution,relations,external,institution,explanations};
 writeFileSync(out+'/catalog.json',JSON.stringify(catalog,null,2));
 writeFileSync(out+'/database-audit.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({departments:ids.length,specialties:catalog.specialties.length,scalarFields:inventory.length,metricKeys:[...new Set(metrics.map(m=>m.metric_key))],researchRows:research.reduce((s,m)=>s+m.rows,0),reviews,sampleDistribution,external,institution},null,2));
} finally {await db.$disconnect();}
