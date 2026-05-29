import { getDepartmentPageData, getDirectoryData, getSpecialtyDashboardMetrics } from "@/lib/queries";
import {
  findMetricDisplayMetadata,
  metadataDisplayAction,
  metadataSourceLabel,
  metadataTooltip,
  type MetricDisplayMetadata
} from "@/lib/metric-display";
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
    specialtyYearlyMetricCount,
    dataExplanations,
    importedSpecialtyDepartments,
    specialtyMetricRows
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
    }),
    prisma.dataExplanation.findMany({
      select: {
        sheet: true,
        criterion: true,
        normalizedCriterion: true,
        metricKey: true,
        readableLabel: true,
        explanation: true,
        sourceLabel: true,
        sourceLinkPolicy: true,
        sourceUrl: true,
        displayAction: true,
        displayMode: true,
        visualType: true,
        isHidden: true,
        isHighlighted: true,
        isNationalMetric: true
      }
    }),
    prisma.department.findMany({
      where: {
        specialtyId: specialty.id,
        importStableKey: {
          not: null
        }
      },
      select: {
        id: true,
        slug: true,
        name: true,
        about: true,
        contactName: true,
        publicContactEmail: true,
        publicContactPhone: true,
        institution: {
          select: {
            name: true
          }
        },
        heads: {
          select: {
            id: true,
            name: true,
            title: true,
            role: true
          }
        },
        metrics: {
          select: {
            id: true
          }
        },
        yearlyMetrics: {
          select: {
            id: true
          }
        }
      },
      orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
    }),
    prisma.specialtyMetric.findMany({
      where: {
        specialtyId: specialty.id
      },
      select: {
        metricKey: true,
        label: true,
        value: true,
        rawValue: true,
        unit: true,
        sourceNotes: true
      },
      orderBy: {
        metricKey: "asc"
      }
    })
  ]);
  const dashboardBurnout = summary.metrics.find((metric) => metric.key === "burnoutIndex");
  const dashboardSalaryGap = summary.metrics.find((metric) => metric.key === "salaryGap");
  const dashboardWaitingTime = summary.metrics.find((metric) => metric.key === "medianWaitingTime");
  const dashboardAcceptanceDistribution = summary.metrics.find((metric) => metric.key === "acceptanceDistribution");
  const dashboardExpectedOpenings = summary.metrics.find((metric) => metric.key === "expectedOpenings");
  const metadata: MetricDisplayMetadata[] = dataExplanations.map((row) => ({
    ...row,
    sheet: row.sheet as "MASTER_Spec" | "Master_Dept",
    visualType: row.visualType as "badge" | "clock" | "distribution" | "donut" | "salaryComparison" | "trend" | null
  }));
  const waitingMetadata = findMetricDisplayMetadata(metadata, "Master_Dept", "medianWaitingTime");
  const waitingVisualMetadata =
    waitingMetadata?.visualType
      ? waitingMetadata
      : findMetricDisplayMetadata(metadata, "MASTER_Spec", "medianWaitingTime");
  const womenCountMetadata = findMetricDisplayMetadata(metadata, "Master_Dept", "womenCount");
  const residentsMetadata = findMetricDisplayMetadata(metadata, "Master_Dept", "residentsCount");
  const expectedOpeningsMetadata = findMetricDisplayMetadata(metadata, "Master_Dept", "expectedOpenings2026");
  const hiddenExpectedNationalOpenings = findMetricDisplayMetadata(metadata, "MASTER_Spec", "expectedNationalOpenings");
  const groupedByInstitution = importedSpecialtyDepartments.reduce<
    Record<string, typeof importedSpecialtyDepartments>
  >((groups, department) => {
    const key = department.institution.name;
    groups[key] = [...(groups[key] ?? []), department];
    return groups;
  }, {});
  const multiSubdepartmentSample =
    Object.entries(groupedByInstitution).find(([, rows]) => rows.length > 1) ?? null;
  const detailCandidate =
    importedSpecialtyDepartments.find(
      (department) =>
        Boolean(department.about) &&
        (department.heads.length > 0 ||
          Boolean(department.contactName) ||
          Boolean(department.publicContactEmail) ||
          Boolean(department.publicContactPhone)) &&
        (department.metrics.length > 0 || department.yearlyMetrics.length > 0)
    ) ?? importedSpecialtyDepartments[0] ?? null;
  const detail = detailCandidate
    ? await getDepartmentPageData(detailCandidate.slug, undefined, detailCandidate.id)
    : null;
  const auditMetricKeys = [
    "peripherySalaryGap",
    "medianWaitingTime",
    "acceptedImmediatelyReports",
    "acceptedWithinSixMonthsReports",
    "acceptedWithinOneYearReports",
    "acceptedWithinTwoYearsReports",
    "acceptedAfterTwoYearsReports",
    "residentsCount",
    "officialResidencyDuration",
    "actualAverageDuration",
    "burnoutIndex"
  ];
  const auditMetric = (
    sheet: "MASTER_Spec" | "Master_Dept",
    key: string,
    row:
      | { value: number | null; rawValue?: string | null; sourceNotes?: string | null }
      | null
      | undefined,
    metricLevel: "מחלקתי" | "ארצי לתחום"
  ) => {
    const displayMetadata = findMetricDisplayMetadata(metadata, sheet, key);
    const value = row?.rawValue ?? row?.value ?? null;

    return {
      key,
      value,
      dataExpMatched: Boolean(displayMetadata),
      tooltip: metadataTooltip(displayMetadata, "NO_DATA_EXP_TOOLTIP"),
      source: metadataSourceLabel(displayMetadata, row?.sourceNotes ?? "NO_SOURCE"),
      displayAction: metadataDisplayAction(displayMetadata),
      metricLevel
    };
  };
  const specialtyMetricAudit = auditMetricKeys
    .filter((key) => key !== "residentsCount" && key !== "officialResidencyDuration" && key !== "actualAverageDuration")
    .map((key) =>
      auditMetric(
        "MASTER_Spec",
        key,
        specialtyMetricRows.find((metric) => metric.metricKey === key),
        "ארצי לתחום"
      )
    );
  const departmentMetricAudit = detail
    ? auditMetricKeys.map((key) =>
        auditMetric(
          "Master_Dept",
          key,
          detail.metrics.find((metric) => metric.metricKey === key),
          findMetricDisplayMetadata(metadata, "Master_Dept", key)?.isNationalMetric ? "ארצי לתחום" : "מחלקתי"
        )
      )
    : [];

  const result = {
    specialty,
    departmentsReturned: departments.length,
    metricCounts: {
      departmentMetricCount,
      departmentYearlyMetricCount,
      specialtyMetricCount,
      specialtyYearlyMetricCount,
      dataExplanationCount: dataExplanations.length
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
      sourceLabel: metric.sourceLabel,
      isPlaceholder: Boolean(metric.isPlaceholder)
    })),
    dashboardChecks: {
      hasBurnoutIndex: Boolean(dashboardBurnout && !dashboardBurnout.isPlaceholder),
      burnoutIndex: dashboardBurnout
        ? {
            value: dashboardBurnout.value,
            sourceLabel: dashboardBurnout.sourceLabel
          }
        : null,
      hasSalaryGap: Boolean(dashboardSalaryGap),
      salaryGap: dashboardSalaryGap
        ? {
            value: dashboardSalaryGap.value,
            sourceLabel: dashboardSalaryGap.sourceLabel,
            tooltip: dashboardSalaryGap.tooltip
          }
        : null,
      hasWaitingTime: Boolean(dashboardWaitingTime && !dashboardWaitingTime.isPlaceholder),
      waitingTime: dashboardWaitingTime
        ? {
            value: dashboardWaitingTime.value,
            sourceLabel: dashboardWaitingTime.sourceLabel,
            tooltip: dashboardWaitingTime.tooltip,
            displayAction: dashboardWaitingTime.displayAction
          }
        : null,
      hasAcceptanceDistribution: Boolean(
        dashboardAcceptanceDistribution && !dashboardAcceptanceDistribution.isPlaceholder
      ),
      acceptanceDistribution: dashboardAcceptanceDistribution
        ? {
            value: dashboardAcceptanceDistribution.value,
            sourceLabel: dashboardAcceptanceDistribution.sourceLabel,
            tooltip: dashboardAcceptanceDistribution.tooltip,
            displayAction: dashboardAcceptanceDistribution.displayAction
          }
        : null,
      hiddenExpectedOpeningsHidden: Boolean(hiddenExpectedNationalOpenings?.isHidden && !dashboardExpectedOpenings)
    },
    metricDisplayAudit: {
      specialty: specialtyMetricAudit,
      department: departmentMetricAudit
    },
    dataExpChecks: {
      loaded: dataExplanations.length,
      waitingTooltip: waitingMetadata
        ? {
            label: waitingMetadata.readableLabel,
            sourceLabel: waitingMetadata.sourceLabel,
            visualType: waitingVisualMetadata?.visualType ?? waitingMetadata.visualType,
            explanation: waitingMetadata.explanation
          }
        : null,
      hiddenWomenCount: womenCountMetadata
        ? {
            isHidden: womenCountMetadata.isHidden,
            displayAction: womenCountMetadata.displayAction
          }
        : null,
      highlightedResidents: residentsMetadata
        ? {
            isHighlighted: residentsMetadata.isHighlighted,
            displayAction: residentsMetadata.displayAction
          }
        : null,
      highlightedExpectedOpenings: expectedOpeningsMetadata
        ? {
            isHighlighted: expectedOpeningsMetadata.isHighlighted,
            displayAction: expectedOpeningsMetadata.displayAction
          }
        : null
    },
    multipleSubdepartmentSample: multiSubdepartmentSample
      ? {
          institutionName: multiSubdepartmentSample[0],
          departments: multiSubdepartmentSample[1].map((department) => ({
            id: department.id,
            name: department.name
          }))
        }
      : null,
    detailDisplaySample: detail
      ? {
          id: detail.id,
          name: detail.name,
          institutionName: detail.institution.name,
          descriptionFound: Boolean(detail.about),
          headFieldsFound: detail.heads.length,
          contactFieldsFound: Boolean(
            detail.contactName || detail.publicContactEmail || detail.publicContactPhone
          ),
          departmentMetricsFound: detail.metrics.length,
          departmentYearlyMetricsFound: detail.yearlyMetrics.length,
          specialtyMetricsFound: detail.specialty.metrics.length,
          specialtyYearlyMetricsFound: detail.specialty.yearlyMetrics.length
        }
      : null,
    placeholderKeys: summary.metrics
      .filter((metric) => metric.isPlaceholder)
      .map((metric) => metric.key)
  };

  console.log(JSON.stringify(result, null, 2));

  if (!dashboardBurnout || dashboardBurnout.isPlaceholder) {
    throw new Error("Specialty dashboard is missing burnout index.");
  }

  if (!dashboardSalaryGap) {
    throw new Error("Specialty dashboard is missing salary gap card.");
  }

  if (!dashboardWaitingTime || dashboardWaitingTime.isPlaceholder) {
    throw new Error("Specialty dashboard is missing waiting time card.");
  }

  if (!dashboardAcceptanceDistribution || dashboardAcceptanceDistribution.isPlaceholder) {
    throw new Error("Specialty dashboard is missing acceptance distribution chart.");
  }

  if (dashboardSalaryGap.sourceLabel !== "סימולטור שכר של הר׳׳י") {
    throw new Error("Salary gap source does not match Data_Exp.");
  }

  if (dashboardWaitingTime.sourceLabel !== "משרד הבריאות") {
    throw new Error("Waiting time source does not match Data_Exp.");
  }

  if (dataExplanations.length < 40) {
    throw new Error("Data_Exp metadata was not loaded.");
  }

  if (!waitingMetadata || waitingVisualMetadata?.visualType !== "clock" || waitingMetadata.sourceLabel !== "משרד הבריאות") {
    throw new Error("Data_Exp sample tooltip/source/action for waiting time is incorrect.");
  }

  if (!womenCountMetadata?.isHidden || !hiddenExpectedNationalOpenings?.isHidden || dashboardExpectedOpenings) {
    throw new Error("Data_Exp hidden display rules are not applied.");
  }

  if (!residentsMetadata?.isHighlighted || !expectedOpeningsMetadata?.isHighlighted) {
    throw new Error("Data_Exp highlighted display rules are not loaded.");
  }

  if (!multiSubdepartmentSample) {
    throw new Error("No same-hospital multi-subdepartment sample was returned.");
  }

  if (!detail || !detail.about || detail.metrics.length === 0 || detail.yearlyMetrics.length === 0) {
    throw new Error("Detail sample is missing imported description or department metrics.");
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
