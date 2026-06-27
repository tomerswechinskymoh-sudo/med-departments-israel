import { prisma } from "@/lib/prisma";
import {
  getDirectoryData,
  getPublicDepartmentVisibility,
  requiredMedicalArraySpecialtyDisplayName
} from "@/lib/queries";
import {
  getDepartmentEffectiveHospitalSubDepartment,
  getEffectiveHospitalAssignmentForDepartment,
  RABIN_BEILINSON,
  RABIN_GEHA,
  RABIN_HASHARON,
  RABIN_MEDICAL_CENTER,
  RABIN_SCHNEIDER
} from "@/lib/effective-hospital";

const RABIN_FAMILY = [
  RABIN_MEDICAL_CENTER,
  RABIN_BEILINSON,
  RABIN_HASHARON,
  RABIN_GEHA,
  RABIN_SCHNEIDER
];

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const departments = await prisma.department.findMany({
    where: {
      importStableKey: {
        not: null
      },
      institution: {
        name: {
          in: RABIN_FAMILY
        }
      }
    },
    select: {
      id: true,
      slug: true,
      name: true,
      importStableKey: true,
      residentsCount: true,
      institution: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          city: true,
          region: true,
          coverImageUrl: true
        }
      },
      specialty: {
        select: {
          id: true,
          name: true
        }
      },
      metrics: {
        select: {
          metricKey: true,
          label: true,
          rawValue: true,
          value: true
        },
        orderBy: {
          metricKey: "asc"
        }
      }
    }
  });
  const publicRows = departments
    .map((department) => ({
      department,
      assignment: getEffectiveHospitalAssignmentForDepartment(department),
      visibility: getPublicDepartmentVisibility(department)
    }))
    .filter((item) => item.visibility.isPublic);
  const specialtyIds = Array.from(new Set(publicRows.map((item) => item.department.specialty.id)));
  const duplicateCards: Array<{
    specialtyId: string;
    key: string;
    count: number;
  }> = [];
  const cardSummaries: Array<{
    specialtyId: string;
    institutionName: string;
    specialtyName: string;
    id: string;
    hrefDepartmentId: string | null | undefined;
  }> = [];

  for (const specialtyId of specialtyIds) {
    const cards = await getDirectoryData({
      specialties: [specialtyId]
    });
    const rabinCards = cards.filter((card) => RABIN_FAMILY.includes(card.institutionName));
    const rabinArrayCards = rabinCards.filter((card) => card.isArrayCard);
    const byKey = new Map<string, typeof rabinCards>();

    for (const card of rabinArrayCards) {
      const key = `${card.institutionName}::${card.specialtyName}`;
      byKey.set(key, [...(byKey.get(key) ?? []), card]);
    }

    for (const card of rabinCards) {
      cardSummaries.push({
        specialtyId,
        institutionName: card.institutionName,
        specialtyName: card.specialtyName,
        id: card.id,
        hrefDepartmentId: card.hrefDepartmentId
      });
    }

    for (const [key, values] of byKey) {
      if (values.length > 1) {
        duplicateCards.push({
          specialtyId,
          key,
          count: values.length
        });
      }
    }
  }

  assert(duplicateCards.length === 0, `Duplicate Rabin-family directory cards found: ${JSON.stringify(duplicateCards)}`);

  const debugRows = publicRows.map((item) => ({
    departmentId: item.department.id,
    slug: item.department.slug,
    originalHospital: item.department.institution.name,
    effectiveHospital: item.assignment.effectiveHospitalName,
    specialtyOrArray: requiredMedicalArraySpecialtyDisplayName(item.department.specialty.name),
    subDepartment: getDepartmentEffectiveHospitalSubDepartment(item.department),
    residentsCount: item.department.residentsCount,
    parsedActiveResidents: item.visibility.parsedActiveResidents,
    countsAsPhysicalDepartment: item.assignment.countsAsPhysicalDepartment
  }));

  console.log(
    JSON.stringify({
      ok: true,
      publicRabinRows: debugRows.length,
      rabinDirectoryCards: cardSummaries.length,
      duplicateCards,
      debugRows,
      cardSummaries
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
