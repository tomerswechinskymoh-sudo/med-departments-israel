import { prisma } from "@/lib/prisma";
import {
  getDepartmentEffectiveHospitalSubDepartment,
  getEffectiveHospitalAssignmentForDepartment,
  effectiveHospitalFilterId,
  RABIN_BEILINSON,
  RABIN_MEDICAL_CENTER
} from "@/lib/effective-hospital";
import { getDirectoryData, requiredMedicalArraySpecialtyDisplayName } from "@/lib/queries";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function isInternalMedicineCard(card: { specialtyName?: string | null }) {
  return card.specialtyName === requiredMedicalArraySpecialtyDisplayName("רפואה פנימית");
}

async function main() {
  const specialty = await prisma.specialty.findFirst({
    where: {
      name: "רפואה פנימית"
    },
    select: {
      id: true,
      name: true
    }
  });

  assert(specialty, "רפואה פנימית specialty missing");

  const rows = await prisma.department.findMany({
    where: {
      specialtyId: specialty!.id,
      importStableKey: {
        not: null
      },
      institution: {
        name: {
          contains: "רבין"
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
          name: true
        }
      },
      specialty: {
        select: {
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
    },
    orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
  });

  const debugRows = rows.map((department) => {
    const subDepartment = getDepartmentEffectiveHospitalSubDepartment(department);
    const assignment = getEffectiveHospitalAssignmentForDepartment(department);

    return {
      departmentId: department.id,
      slug: department.slug,
      originalHospital: department.institution.name,
      subDepartmentRaw: department.metrics.find((metric) => metric.metricKey === "תת מחלקה")?.rawValue ?? null,
      normalizedSubDepartment: subDepartment,
      effectiveHospital: assignment.effectiveHospitalName,
      specialtyOrArray: requiredMedicalArraySpecialtyDisplayName(department.specialty.name),
      contributesMetrics: true,
      countsAsPhysicalDepartment: assignment.countsAsPhysicalDepartment,
      residentsCount: department.residentsCount
    };
  });

  const rabinContribution = debugRows.find(
    (row) =>
      row.originalHospital === RABIN_MEDICAL_CENTER &&
      row.normalizedSubDepartment === "בילינסון" &&
      row.effectiveHospital === RABIN_BEILINSON
  );

  assert(
    rabinContribution,
    "Rabin internal medicine contribution row did not resolve to Beilinson"
  );
  assert(
    rabinContribution?.countsAsPhysicalDepartment === false,
    "Rabin contribution row should not count as a physical department"
  );

  const cards = await getDirectoryData({
    specialties: [specialty!.id]
  });
  const rabinInternalCard = cards.find(
    (card) => card.institutionName === RABIN_MEDICAL_CENTER && isInternalMedicineCard(card)
  );
  const bilinsonInternalCard = cards.find(
    (card) => card.institutionName === RABIN_BEILINSON && isInternalMedicineCard(card)
  );

  assert(!rabinInternalCard, "Public Rabin internal medicine card should not exist");
  assert(bilinsonInternalCard, "Public Beilinson internal medicine card missing");
  assert(
    typeof bilinsonInternalCard?.residentsCount === "number" &&
      bilinsonInternalCard.residentsCount >= (rabinContribution?.residentsCount ?? 0),
    "Beilinson card does not include reassigned Rabin row metrics"
  );

  const bilinsonFilterCards = await getDirectoryData({
    specialties: [specialty!.id],
    institutions: [effectiveHospitalFilterId(RABIN_BEILINSON)]
  });
  const rabinFilterCards = await getDirectoryData({
    specialties: [specialty!.id],
    institutions: [effectiveHospitalFilterId(RABIN_MEDICAL_CENTER)]
  });

  assert(
    bilinsonFilterCards.some((card) => card.institutionName === RABIN_BEILINSON && isInternalMedicineCard(card)),
    "Filtering by Beilinson should include the reassigned internal medicine card"
  );
  assert(
    !rabinFilterCards.some((card) => card.institutionName === RABIN_MEDICAL_CENTER && isInternalMedicineCard(card)),
    "Filtering by Rabin should not include the reassigned internal medicine card"
  );

  const nonRabinAssignment = getEffectiveHospitalAssignmentForDepartment({
    name: "רפואה פנימית בילינסון",
    institution: {
      name: "מרכז רפואי שיבא"
    },
    specialty: {
      name: "רפואה פנימית"
    }
  });
  assert(nonRabinAssignment.effectiveHospitalName === "מרכז רפואי שיבא", "Non-Rabin hospital changed unexpectedly");

  console.log(
    JSON.stringify({
      ok: true,
      debugRows,
      cards: {
        total: cards.length,
        bilinsonInternalMedicine: {
          hospital: bilinsonInternalCard?.institutionName,
          specialty: bilinsonInternalCard?.specialtyName,
          residentsCount: bilinsonInternalCard?.residentsCount,
          arrayDepartmentCount: bilinsonInternalCard?.arrayDepartmentCount ?? null
        },
        rabinInternalMedicineExists: Boolean(rabinInternalCard),
        bilinsonFilterCount: bilinsonFilterCards.length,
        rabinFilterCount: rabinFilterCards.length
      }
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
