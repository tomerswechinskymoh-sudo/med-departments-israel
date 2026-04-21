import { prisma } from "../../lib/prisma";
import { MockDepartmentEnrichmentService } from "../../lib/services/mock-department-enrichment";

async function main() {
  const service = new MockDepartmentEnrichmentService();
  const departments = await prisma.department.findMany({
    include: {
      institution: true
    },
    take: 3
  });

  for (const department of departments) {
    const result = await service.enrichDepartmentHeads({
      departmentName: department.name,
      institutionName: department.institution.name
    });

    console.log(`Mock enrichment for ${department.name}:`, result);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
