import { publicVisibleDepartmentWhere, isRequiredMedicalArraySpecialty } from '@/lib/queries';
import type { PrismaClient, Prisma } from '@prisma/client';
export async function readCatalog(db: PrismaClient | Prisma.TransactionClient) {
  const rows = await db.department.findMany({ where: publicVisibleDepartmentWhere, select: { id: true, name: true, slug: true, institutionId: true, institution: { select: { name: true } }, specialty: { select: { name: true, groupAsArray: true } }, medicalArray: { select: { id: true, name: true, slug: true, hospitalId: true, specialtyId: true } }, specialtyId: true }, orderBy: [{ institution: { name: 'asc' } }, { name: 'asc' }] });
  return rows.map(d => ({ ...d, medicalArray: d.medicalArray && d.medicalArray.hospitalId === d.institutionId && d.medicalArray.specialtyId === d.specialtyId && (d.specialty.groupAsArray || isRequiredMedicalArraySpecialty(d.specialty.name)) ? d.medicalArray : null }));
}
