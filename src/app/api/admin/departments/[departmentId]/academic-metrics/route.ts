import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { hasValidSameOrigin } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { revalidatePublicDataCache } from '@/lib/public-data-cache-invalidation';
import { academicMetricDefinitions, departmentAcademicSchema, departmentAcademicValues } from '@/lib/department-academic-metrics';

export async function PATCH(request: Request, { params }: { params: Promise<{ departmentId: string }> }) {
  const session = await getSession();
  if (session?.role !== 'admin' || !hasValidSameOrigin(request)) return NextResponse.json({ error: 'גישה נדחתה.' }, { status: 403 });
  const parsed = departmentAcademicSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'יש להזין אחוז בין 0 ל־100, או להשאיר שדה ריק.' }, { status: 400 });
  const { departmentId } = await params;
  const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true, slug: true } });
  if (!department) return NextResponse.json({ error: 'המחלקה לא נמצאה.' }, { status: 404 });
  const values = await prisma.$transaction(async tx => {
    const before = await tx.departmentMetric.findMany({ where: { departmentId, metricKey: { in: academicMetricDefinitions.map(metric => metric.key) } } });
    for (const { key, label } of academicMetricDefinitions) {
      const value = parsed.data[key];
      // Leave absent values absent; do not generate placeholder database records.
      if (value === null && !before.some(metric => metric.metricKey === key)) continue;
      const data = { value, rawValue: value === null ? null : String(value), unit: '%', sourceNotes: 'נתון מחלקתי שהוזן על ידי מנהל האתר', lastUpdated: new Date() };
      await tx.departmentMetric.upsert({ where: { departmentId_metricKey: { departmentId, metricKey: key } }, create: { departmentId, metricKey: key, label, ...data }, update: data });
    }
    await tx.auditLog.create({ data: { actorUserId: session.userId, action: 'admin.department_academic_metrics_updated', entityType: 'Department', entityId: departmentId, metadata: { before: departmentAcademicValues(before), after: parsed.data } } });
    return parsed.data;
  });
  revalidatePublicDataCache();
  revalidatePath(`/departments/${department.slug}`);
  revalidatePath(`/admin/departments/${departmentId}`);
  return NextResponse.json({ values }, { headers: { 'Cache-Control': 'no-store' } });
}
