import { NextResponse } from 'next/server';
import { getDepartmentOptions } from '@/lib/queries';
import { prisma } from '@/lib/prisma';
import { normalizePublicRegion } from '@/lib/regions';
import { VERSION } from '@/lib/career-fit/config';
export const dynamic = 'force-dynamic';
/** Read-only public projection. No answer payloads, reviews, rosters or restricted metrics. */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) throw new Error('unavailable');
    const options=await getDepartmentOptions();
    const rows=await prisma.department.findMany({where:{id:{in:options.map(d=>d.id)}},select:{id:true,institution:{select:{name:true,region:true,type:true}}}});
    const index=new Map(rows.map(d=>[d.id,d.institution]));
    const departments=options.map(d=>{
      const raw=index.get(d.id);
      // The directory uses effective hospital identities, not database institution IDs.
      // Do not attribute the original institution's facts to a reassigned hospital.
      const verified=raw?.name.normalize('NFKC').trim()===d.institution.name.normalize('NFKC').trim()?raw:null;
      return {id:d.id,slug:d.slug,name:d.name,specialtyId:d.specialty.id,specialtyName:d.specialty.name,hospital:d.institution.id,hospitalName:d.institution.name,region:normalizePublicRegion(verified?.region),type:verified?.type??null};
    });
    return NextResponse.json({version:VERSION,retrievedAt:new Date().toISOString(),departments,specialties:Array.from(new Map(options.map(d=>[d.specialty.id,d.specialty])).values())},{headers:{'Cache-Control':'private, no-store'}});
  } catch {
    // Deliberately omit request data and database diagnostics from logs/responses.
    return NextResponse.json({error:'CATALOG_UNAVAILABLE'},{status:503});
  }
}
