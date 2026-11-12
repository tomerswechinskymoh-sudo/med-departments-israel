import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';
import { parseCandidates } from '../../src/server/staz-survey/parse';
import { readCatalog } from '../../src/server/staz-survey/importer';
import { suggestMapping } from '../../src/lib/staz-survey/domain';
async function main() {
 const db=new PrismaClient({log:[]});try {
  const rows=parseCandidates(await readFile(process.argv[2]));const catalog=await readCatalog(db);const reasons:Record<string,number>={},targets:Record<string,{hospital:string;department:string;count:number}>={};
  for(const row of rows){const m=suggestMapping(row,catalog);reasons[m.mappingReason]=(reasons[m.mappingReason]??0)+1;if(m.suggestedDepartmentId){const d=catalog.find(d=>d.id===m.suggestedDepartmentId)!;targets[d.id]??={hospital:d.institution.name,department:d.name,count:0};targets[d.id].count++;}}
  await writeFile(process.argv[3],JSON.stringify({rows:rows.length,eligibleCatalogDepartments:catalog.length,reasons,suggestedTargets:Object.values(targets).sort((a,b)=>b.count-a.count),allSuggestionsRequireManualConfirmation:true},null,2)+'\n');console.log('Aggregate mapping report saved; no respondent text or identifiers');
 }finally{await db.$disconnect();}
}
main().catch(()=>{console.error('REPORT_FAILED');process.exitCode=1});
