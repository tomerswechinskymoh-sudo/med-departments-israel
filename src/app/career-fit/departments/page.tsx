import { getSourceVisibility } from "@/lib/server/source-visibility";
import { profiles, unprofiledBase } from "@/lib/career-fit/profile-data";
import { CareerFitClient } from '@/components/career-fit/career-fit-client';
export const metadata = {title:'התאמה להעדפות מחלקה | Hitmachut'};
export const dynamic = "force-dynamic";
export default async function DepartmentFitPage(){const flags = await getSourceVisibility(); return <CareerFitClient direct profiles={flags.ima ? profiles : []} unprofiledBase={flags.ima ? unprofiledBase : []}/>;}
