import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prisma } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
import { getDepartmentPageData, getSpecialtyDashboardMetrics } from '../../src/lib/queries';
import { departmentAcademicValues } from '../../src/lib/department-academic-metrics';
assert(new URL(process.env.DATABASE_URL!).hostname.startsWith('ep-old-wind-ampriwfg'), 'Only the isolated academic test branch is permitted');
async function main(){
  const passwordHash=await hashPassword('Academic-Isolated-Test-2026!');
  for(const roleKey of ['ADMIN','STUDENT'] as const) await prisma.user.upsert({where:{email:`academic-${roleKey.toLowerCase()}@example.invalid`},update:{passwordHash},create:{email:`academic-${roleKey.toLowerCase()}@example.invalid`,fullName:`בדיקת מדדים ${roleKey}`,passwordHash,roleKey,emailVerified:true,verificationStatus:'VERIFIED'}});
  const selected=await prisma.department.findFirstOrThrow({where:{name:'פסיכיאטריה',institutionId:'cmpniduzg015l11deghvyxjnu'},select:{id:true,slug:true,specialtyId:true}});
  const profile=await getDepartmentPageData(selected.slug,undefined,selected.id);assert(profile);
  assert.deepEqual(departmentAcademicValues(profile.metrics),{professorsAmongSeniors:null,departmentBoardPassA:null,departmentBoardPassB:null});
  assert(profile.specialty.metrics.some(m=>m.metricKey==='מעבר_שלב_א'&&m.value!==null));
  assert(!profile.metrics.some(m=>m.metricKey.startsWith('שכר')));
  const dashboard=await getSpecialtyDashboardMetrics(selected.specialtyId);
  assert(dashboard.metrics.some(m=>m.key==='boardPassA'&&!m.isPlaceholder));
  assert(dashboard.metrics.some(m=>m.key==='boardPassB'&&!m.isPlaceholder));
  assert(!dashboard.metrics.some(m=>['salaryGap','centerSalary','peripherySalary'].includes(m.key)));
  fs.writeFileSync('docs/academic-metrics-20261122/test-target.json',JSON.stringify(selected,null,2));
  console.log(JSON.stringify({passed:true,profile:profile.institution.name,examMetrics:dashboard.metrics.filter(m=>['boardPassA','boardPassB'].includes(m.key)),target:selected}));
}
main().finally(()=>prisma.$disconnect());
