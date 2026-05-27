import { getDirectoryData, getSpecialtyDashboardMetrics } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const specialtyName = argValue("--specialty") ?? "רפואה פנימית";
  const specialty = await prisma.specialty.findFirst({
    where: {
      name: specialtyName
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!specialty) {
    throw new Error(`Specialty not found: ${specialtyName}`);
  }

  const [
    departments,
    summary,
    departmentMetricCount,
    departmentYearlyMetricCount,
    specialtyMetricCount,
    specialtyYearlyMetricCount
  ] = await Promise.all([
    getDirectoryData({
      specialties: [specialty.id]
    }),
    getSpecialtyDashboardMetrics(specialty.id),
    prisma.departmentMetric.count({
      where: {
        department: {
          specialtyId: specialty.id
        }
      }
    }),
    prisma.departmentYearlyMetric.count({
      where: {
        department: {
          specialtyId: specialty.id
        }
      }
    }),
    prisma.specialtyMetric.count({
      where: {
        specialtyId: specialty.id
      }
    }),
    prisma.specialtyYearlyMetric.count({
      where: {
        specialtyId: specialty.id
      }
    })
  ]);

  const result = {
    specialty,
    departmentsReturned: departments.length,
    metricCounts: {
      departmentMetricCount,
      departmentYearlyMetricCount,
      specialtyMetricCount,
      specialtyYearlyMetricCount
    },
    sampleDepartmentCards: departments.slice(0, 5).map((department) => ({
      id: department.id,
      name: department.name,
      institutionName: department.institutionName,
      residentsCount: department.residentsCount,
      newResidentsLatest: department.newResidentsLatest,
      seniorPhysiciansCount: department.seniorPhysiciansCount,
      expectedOpeningsCount: department.expectedOpeningsCount,
      duns100PhysiciansCount: department.duns100PhysiciansCount,
      estimatedPublicationsCount: department.estimatedPublicationsCount
    })),
    computedSummary: summary.metrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      value: metric.value,
      isPlaceholder: Boolean(metric.isPlaceholder)
    })),
    placeholderKeys: summary.metrics
      .filter((metric) => metric.isPlaceholder)
      .map((metric) => metric.key)
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
