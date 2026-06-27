import {
  getDepartmentPageData,
  getDirectoryData,
  getPublicDepartmentVisibility,
  requiredMedicalArraySpecialtyDisplayName
} from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import {
  getDepartmentEffectiveHospitalSubDepartment,
  getEffectiveHospitalAssignmentForDepartment,
  RABIN_BEILINSON,
  RABIN_GEHA,
  RABIN_HASHARON,
  RABIN_MEDICAL_CENTER,
  RABIN_SCHNEIDER
} from "@/lib/effective-hospital";

const ACTIVE_RESIDENTS_METRIC_KEYS = [
  "מספר_מתמחים",
  "residentsCount",
  "activeResidentsCount"
];
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

function isTargetSpecialty(name: string, target: "neurosurgery" | "ent") {
  if (target === "neurosurgery") {
    return name.includes("נוירוכירורג");
  }

  return name.includes("א.א.ג") || name.includes("אוזן") || name.includes("ראש וצוואר");
}

async function main() {
  const rows = await prisma.department.findMany({
    where: {
      importStableKey: {
        not: null
      }
    },
    select: {
      id: true,
      slug: true,
      name: true,
      importStableKey: true,
      residentsCount: true,
      yearlyMetrics: {
        select: {
          metricKey: true,
          year: true,
          value: true,
          rawValue: true
        }
      },
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
    },
    orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
  });
  const decisions = rows.map((department) => {
    const assignment = getEffectiveHospitalAssignmentForDepartment(department);
    const activeMetric = department.metrics.find((metric) =>
      ACTIVE_RESIDENTS_METRIC_KEYS.includes(metric.metricKey)
    );
    const visibility = getPublicDepartmentVisibility(department);

    return {
      department,
      assignment,
      visibility,
      debug: {
        departmentId: department.id,
        slug: department.slug,
        originalHospital: department.institution.name,
        effectiveHospital: assignment.effectiveHospitalName,
        specialtyOrArray: requiredMedicalArraySpecialtyDisplayName(department.specialty.name),
        subDepartment: getDepartmentEffectiveHospitalSubDepartment(department),
        departmentResidentsCount: department.residentsCount,
        metricResidentsCount: activeMetric
          ? {
              key: activeMetric.metricKey,
              value: activeMetric.value,
              rawValue: activeMetric.rawValue
            }
          : null,
        parsedActiveResidents: visibility.parsedActiveResidents,
        publicVisible: visibility.isPublic,
        contributesMetrics: visibility.isPublic,
        selectedAsRepresentative: false
      }
    };
  });

  const zeroRows = decisions.filter((item) => item.visibility.parsedActiveResidents === 0);
  const publicRows = decisions.filter((item) => item.visibility.isPublic);
  const positiveRows = decisions.filter(
    (item) => typeof item.visibility.parsedActiveResidents === "number" && item.visibility.parsedActiveResidents > 0
  );
  const zeroWithYearlyRows = zeroRows.filter((item) => item.department.yearlyMetrics.length > 0);
  const rabinFamilyDebugRows = decisions
    .filter((item) => RABIN_FAMILY.includes(item.assignment.canonicalOriginalHospitalName))
    .map((item) => item.debug);

  assert(zeroRows.length > 0, "No zero-resident imported department row found to verify");

  for (const item of zeroRows.slice(0, 25)) {
    const directoryRows = await getDirectoryData({
      specialties: [item.department.specialty.id]
    });
    const leakedDirectoryRow = directoryRows.find(
      (department) =>
        department.id === item.department.id ||
        department.hrefDepartmentId === item.department.id ||
        department.favoriteDepartmentId === item.department.id
    );
    const detail = await getDepartmentPageData(item.department.slug, undefined, item.department.id);

    assert(!leakedDirectoryRow, `Zero-resident department leaked in directory: ${item.department.id}`);
    assert(!detail, `Zero-resident department direct detail returned: ${item.department.id}`);
  }

  for (const target of ["neurosurgery", "ent"] as const) {
    const targetZeroRows = zeroRows.filter(
      (item) =>
        item.department.institution.name === RABIN_MEDICAL_CENTER &&
        isTargetSpecialty(item.department.specialty.name, target)
    );

    for (const item of targetZeroRows) {
      const cards = await getDirectoryData({
        specialties: [item.department.specialty.id],
        institutions: [item.assignment.effectiveHospitalName]
      });
      const positivePeerExists = publicRows.some(
        (candidate) =>
          candidate.department.specialty.id === item.department.specialty.id &&
          candidate.assignment.effectiveHospitalName === item.assignment.effectiveHospitalName
      );
      const leakedCard = cards.find(
        (card) =>
          card.institutionName === item.assignment.effectiveHospitalName &&
          (card.specialtyName === item.department.specialty.name ||
            card.specialtyName === requiredMedicalArraySpecialtyDisplayName(item.department.specialty.name))
      );

      if (!positivePeerExists) {
        assert(!leakedCard, `Zero-only Rabin ${target} card leaked: ${item.department.id}`);
      }
    }
  }

  assert(positiveRows.length > 0, "No positive-resident imported department row found");
  const positiveSample = positiveRows[0].department;
  assert(
    await getDepartmentPageData(positiveSample.slug, undefined, positiveSample.id),
    `Positive-resident department direct detail missing: ${positiveSample.id}`
  );

  console.log(
    JSON.stringify({
      ok: true,
      totals: {
        importedDepartments: rows.length,
        publicRows: publicRows.length,
        zeroRows: zeroRows.length,
        zeroRowsWithYearlyMetrics: zeroWithYearlyRows.length,
        positiveRows: positiveRows.length
      },
      targetCases: {
        rabinNeurosurgeryZeroRows: zeroRows.filter(
          (item) =>
            item.department.institution.name === RABIN_MEDICAL_CENTER &&
            isTargetSpecialty(item.department.specialty.name, "neurosurgery")
        ).length,
        rabinEntZeroRows: zeroRows.filter(
          (item) =>
            item.department.institution.name === RABIN_MEDICAL_CENTER &&
            isTargetSpecialty(item.department.specialty.name, "ent")
        ).length
      },
      rabinFamilyRows: rabinFamilyDebugRows
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
