import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prisma } from '../../src/lib/prisma';
import { getSpecialtyDashboardMetrics } from '../../src/lib/queries';
async function main(){
 const [reference]=await prisma.$queryRaw<{average:number,count:bigint}[]>`SELECT avg(value)::float8 AS average, count(*) AS count FROM "SpecialtyMetric" WHERE metric_key='relativeDemandIndex' AND value IS NOT NULL AND value >= 0`;
 const samples=await prisma.specialtyMetric.findMany({where:{metricKey:'relativeDemandIndex',specialty:{name:{in:['מחלות עור ומין','פסיכיאטריה','גריאטריה']}}},select:{specialtyId:true,value:true,specialty:{select:{name:true}}}});
 assert.equal(samples.length,3);
 const results=[];
 for(const sample of samples){
  const dashboard=await getSpecialtyDashboardMetrics(sample.specialtyId);
  const demand=dashboard.metrics.find(m=>m.key==='relativeDemandIndex');assert(demand?.demandComparison);assert(Math.abs(demand.demandComparison.average!-reference.average)<1e-10);assert.equal(demand.demandComparison.specialtyCount,Number(reference.count));
  const gender=dashboard.metrics.find(m=>m.key==='genderDistribution');assert(gender&&!gender.isPlaceholder);assert.match(gender.value,/^\d+% נשים$/);
  assert(dashboard.metrics.some(m=>m.key==='boardPassA'));assert(!dashboard.metrics.some(m=>['salaryGap','centerSalary','peripherySalary'].includes(m.key)));
  results.push({name:sample.specialty.name,id:sample.specialtyId,value:demand.value,comparison:demand.demandComparison,women:gender.value});
 }
 const report={passed:true,independentSqlReference:{average:reference.average,specialtyCount:Number(reference.count)},results};
 fs.writeFileSync(process.env.DEMAND_TEST_REPORT??'docs/demand-benchmark-20261123/integration.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
main().finally(()=>prisma.$disconnect());
