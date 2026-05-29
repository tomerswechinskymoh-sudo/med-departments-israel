import { getDepartmentPageData, getDirectoryData, getSpecialtyDashboardMetrics } from "@/lib/queries";
import {
  findMetricDisplayMetadata,
  metadataDisplayAction,
  metadataSourceLabel,
  metadataTooltip,
  type MetricDisplayMetadata
} from "@/lib/metric-display";
import { prisma } from "@/lib/prisma";

type AuditStatus = "Implemented" | "Partially implemented" | "Missing";

const specialtyDisplayMap: Record<string, string> = {
  acceptedAfterTwoYearsReports: "acceptanceDistribution",
  acceptedImmediatelyReports: "acceptanceDistribution",
  acceptedWithinOneYearReports: "acceptanceDistribution",
  acceptedWithinSixMonthsReports: "acceptanceDistribution",
  acceptedWithinTwoYearsReports: "acceptanceDistribution",
  actualAverageDuration: "residencyDuration",
  boardStageAPassRate: "boardPassA",
  boardStageBPassRate: "boardPassB",
  burnoutIndex: "burnoutIndex",
  centerSalary: "centerSalary",
  expectedNationalOpenings: "expectedOpenings",
  menCount: "genderDistribution",
  menPercent: "genderDistribution",
  medianWaitingTime: "medianWaitingTime",
  newResidents: "newResidentsTrend",
  officialResidencyDuration: "residencyDuration",
  peripherySalary: "peripherySalary",
  peripherySalaryGap: "salaryGap",
  residentsCount: "activeResidents",
  womenCount: "genderDistribution",
  womenPercent: "genderDistribution"
};

const departmentDisplayMap: Record<string, string> = {
  acceptedAfterTwoYearsReports: "acceptanceDistribution",
  acceptedImmediatelyReports: "acceptanceDistribution",
  acceptedWithinOneYearReports: "acceptanceDistribution",
  acceptedWithinSixMonthsReports: "acceptanceDistribution",
  acceptedWithinTwoYearsReports: "acceptanceDistribution",
  actualAverageDuration: "trainingMetrics",
  boardStageAPassRate: "professionalSidebar",
  boardStageBPassRate: "professionalSidebar",
  burnoutIndex: "professionalSidebar",
  centerSalary: "professionalSidebar",
  departmentalPublicationsCount: "researchSidebar",
  duns100PhysiciansCount: "professionalSidebar",
  expectedOpenings2026: "workforceMetrics",
  menCount: "genderDonut",
  menPercent: "genderDonut",
  medianElectiveDemand: "optionalDemandCard",
  medianWaitingTime: "clockCard",
  newResidents: "yearlyChart",
  officialResidencyDuration: "trainingMetrics",
  peripherySalary: "professionalSidebar",
  peripherySalaryGap: "salaryComparison",
  residentsCount: "workforceMetrics",
  seniorPhysiciansCount: "workforceMetrics",
  womenCount: "genderDonut",
  womenPercent: "genderDonut"
};

function argValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function countByStatus(rows: Array<{ status: AuditStatus }>) {
  return rows.reduce<Record<AuditStatus, number>>(
    (counts, row) => {
      counts[row.status] += 1;
      return counts;
    },
    { Implemented: 0, "Partially implemented": 0, Missing: 0 }
  );
}

function hasValue(row?: { value: number | null; rawValue?: string | null } | null) {
  return Boolean(row && (typeof row.value === "number" || row.rawValue));
}

function auditDataExpRow(input: {
  metadata: MetricDisplayMetadata;
  displayedAs?: string;
  valueExists: boolean;
}) {
  const tooltipFromDataExp = Boolean(input.metadata.explanation || input.metadata.isHidden);
  const sourceFromDataExp = Boolean(input.metadata.sourceLabel || input.metadata.isHidden);
  const actionApplied = input.metadata.isHidden || Boolean(input.displayedAs);
  const status: AuditStatus = input.metadata.isHidden
    ? "Implemented"
    : input.displayedAs && tooltipFromDataExp && sourceFromDataExp && actionApplied
      ? "Implemented"
      : input.valueExists || input.displayedAs || tooltipFromDataExp || sourceFromDataExp || !input.metadata.metricKey
        ? "Partially implemented"
        : "Missing";

  return {
    sheet: input.metadata.sheet,
    criterion: input.metadata.criterion,
    key: input.metadata.metricKey,
    status,
    valueExists: input.valueExists,
    displayedAs: input.displayedAs ?? null,
    tooltipFromDataExp,
    sourceFromDataExp,
    actionApplied,
    source: metadataSourceLabel(input.metadata, "NO_SOURCE"),
    tooltip: metadataTooltip(input.metadata, "NO_TOOLTIP"),
    displayAction: metadataDisplayAction(input.metadata)
  };
}

async function main() {
  const specialtyName = argValue("--specialty") ?? "רפואה פנימית";
  const specialty = await prisma.specialty.findFirst({
    where: { name: specialtyName },
    select: { id: true, name: true }
  });

  if (!specialty) throw new Error(`Specialty not found: ${specialtyName}`);

  const [
    departments,
    summary,
    departmentMetricCount,
    departmentYearlyMetricCount,
    specialtyMetricCount,
    specialtyYearlyMetricCount,
    dataExplanations,
    importedSpecialtyDepartments,
    specialtyMetricRows,
    specialtyYearlyRows,
    departmentMetricCoverage,
    departmentYearlyCoverage
  ] = await Promise.all([
    getDirectoryData({ specialties: [specialty.id] }),
    getSpecialtyDashboardMetrics(specialty.id),
    prisma.departmentMetric.count({ where: { department: { specialtyId: specialty.id } } }),
    prisma.departmentYearlyMetric.count({ where: { department: { specialtyId: specialty.id } } }),
    prisma.specialtyMetric.count({ where: { specialtyId: specialty.id } }),
    prisma.specialtyYearlyMetric.count({ where: { specialtyId: specialty.id } }),
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
      where: { specialtyId: specialty.id, importStableKey: { not: null } },
      select: {
        id: true,
        slug: true,
        name: true,
        about: true,
        contactName: true,
        publicContactEmail: true,
        publicContactPhone: true,
        institution: { select: { name: true } },
        heads: { select: { id: true } },
        metrics: { select: { id: true } },
        yearlyMetrics: { select: { id: true } }
      },
      orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
    }),
    prisma.specialtyMetric.findMany({
      where: { specialtyId: specialty.id },
      select: { metricKey: true, value: true, rawValue: true, sourceNotes: true }
    }),
    prisma.specialtyYearlyMetric.findMany({
      where: { specialtyId: specialty.id },
      select: { metricKey: true, year: true, value: true, rawValue: true, sourceNotes: true }
    }),
    prisma.departmentMetric.groupBy({
      by: ["metricKey"],
      where: { department: { specialtyId: specialty.id } },
      _count: { _all: true }
    }),
    prisma.departmentYearlyMetric.groupBy({
      by: ["metricKey"],
      where: { department: { specialtyId: specialty.id } },
      _count: { _all: true }
    })
  ]);

  const metadata: MetricDisplayMetadata[] = dataExplanations.map((row) => ({
    ...row,
    sheet: row.sheet as "MASTER_Spec" | "Master_Dept",
    visualType: row.visualType as MetricDisplayMetadata["visualType"]
  }));
  const dashboardKeys = new Set(summary.metrics.map((metric) => metric.key));
  const specialtyMetricKeysWithValue = new Set(
    specialtyMetricRows.filter(hasValue).map((metric) => metric.metricKey)
  );
  if (specialtyYearlyRows.some(hasValue)) specialtyMetricKeysWithValue.add("newResidents");
  const departmentMetricKeysWithValue = new Set(
    departmentMetricCoverage.filter((row) => row._count._all > 0).map((row) => row.metricKey)
  );
  if (departmentYearlyCoverage.some((row) => row._count._all > 0)) {
    departmentMetricKeysWithValue.add("newResidents");
  }
  if (
    await prisma.departmentYearlyMetric.count({
      where: { department: { specialtyId: specialty.id }, metricKey: "newResidents", year: 2026 }
    })
  ) {
    departmentMetricKeysWithValue.add("expectedOpenings2026");
  }

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

  const auditRows = metadata.map((item) => {
    const displayedAs =
      item.sheet === "MASTER_Spec"
        ? item.metricKey
          ? specialtyDisplayMap[item.metricKey]
          : undefined
        : item.metricKey
          ? departmentDisplayMap[item.metricKey]
          : undefined;
    const valueExists =
      item.sheet === "MASTER_Spec"
        ? Boolean(item.metricKey && specialtyMetricKeysWithValue.has(item.metricKey))
        : Boolean(item.metricKey && departmentMetricKeysWithValue.has(item.metricKey));

    return auditDataExpRow({
      metadata: item,
      displayedAs,
      valueExists
    });
  });

  const dashboardCenterSalary = summary.metrics.find((metric) => metric.key === "centerSalary");
  const dashboardPeripherySalary = summary.metrics.find((metric) => metric.key === "peripherySalary");
  const dashboardSalaryGap = summary.metrics.find((metric) => metric.key === "salaryGap");
  const dashboardWaitingTime = summary.metrics.find((metric) => metric.key === "medianWaitingTime");
  const dashboardAcceptanceDistribution = summary.metrics.find((metric) => metric.key === "acceptanceDistribution");
  const dashboardBurnout = summary.metrics.find((metric) => metric.key === "burnoutIndex");
  const dashboardExpectedOpenings = summary.metrics.find((metric) => metric.key === "expectedOpenings");
  const waitingMetadata = findMetricDisplayMetadata(metadata, "Master_Dept", "medianWaitingTime");
  const waitingVisualMetadata =
    waitingMetadata?.visualType || waitingMetadata?.displayAction
      ? waitingMetadata
      : findMetricDisplayMetadata(metadata, "MASTER_Spec", "medianWaitingTime");
  const womenCountMetadata = findMetricDisplayMetadata(metadata, "Master_Dept", "womenCount");
  const residentsMetadata = findMetricDisplayMetadata(metadata, "Master_Dept", "residentsCount");
  const expectedOpeningsMetadata = findMetricDisplayMetadata(metadata, "Master_Dept", "expectedOpenings2026");
  const hiddenExpectedNationalOpenings = findMetricDisplayMetadata(metadata, "MASTER_Spec", "expectedNationalOpenings");
  const requiredDepartmentKeys = [
    "residentsCount",
    "officialResidencyDuration",
    "actualAverageDuration",
    "medianWaitingTime",
    "acceptedImmediatelyReports",
    "acceptedWithinSixMonthsReports",
    "acceptedWithinOneYearReports",
    "acceptedWithinTwoYearsReports",
    "acceptedAfterTwoYearsReports",
    "womenPercent"
  ];
  const detailDepartmentChecks = detail
    ? requiredDepartmentKeys.map((key) => ({
        key,
        departmentValueExists: Boolean(detail.metrics.find((metric) => metric.metricKey === key && hasValue(metric)))
      }))
    : [];
  const dunsCoverage = departmentMetricCoverage.find((row) => row.metricKey === "duns100PhysiciansCount")?._count._all ?? 0;
  const importedPublicationCoverage =
    departmentMetricCoverage.find((row) => row.metricKey === "departmentalPublicationsCount")?._count._all ?? 0;
  const openAlexCoverage = await prisma.departmentResearchMetric.count({
    where: { department: { specialtyId: specialty.id }, source: "OpenAlex", needsMapping: false }
  });

  const failedChecks = [
    !dashboardCenterSalary || dashboardCenterSalary.isPlaceholder ? "missing center salary card" : null,
    !dashboardPeripherySalary || dashboardPeripherySalary.isPlaceholder ? "missing periphery salary card" : null,
    !dashboardSalaryGap || dashboardSalaryGap.isPlaceholder ? "missing salary gap card" : null,
    !dashboardWaitingTime || dashboardWaitingTime.isPlaceholder ? "missing waiting time card" : null,
    !dashboardAcceptanceDistribution || dashboardAcceptanceDistribution.isPlaceholder
      ? "missing acceptance distribution chart"
      : null,
    !dashboardBurnout || dashboardBurnout.isPlaceholder ? "missing burnout card" : null,
    dashboardSalaryGap?.sourceLabel !== "סימולטור שכר של הר׳׳י" ? "salary source mismatch" : null,
    dashboardWaitingTime?.sourceLabel !== "משרד הבריאות" ? "waiting source mismatch" : null,
    !waitingMetadata || waitingVisualMetadata?.visualType !== "clock" ? "waiting action mismatch" : null,
    !womenCountMetadata?.isHidden || !hiddenExpectedNationalOpenings?.isHidden || dashboardExpectedOpenings
      ? "hidden display rule mismatch"
      : null,
    !residentsMetadata?.isHighlighted || !expectedOpeningsMetadata?.isHighlighted
      ? "highlight rule mismatch"
      : null,
    detailDepartmentChecks.some((check) => !check.departmentValueExists)
      ? "sample department missing required department-level values"
      : null,
    !detail || !detail.about || detail.metrics.length === 0 || detail.yearlyMetrics.length === 0
      ? "detail sample missing imported data"
      : null
  ].filter((item): item is string => Boolean(item));

  const report = {
    specialty: specialty.name,
    counts: {
      departmentsReturned: departments.length,
      departmentMetricCount,
      departmentYearlyMetricCount,
      specialtyMetricCount,
      specialtyYearlyMetricCount,
      dataExplanationCount: dataExplanations.length,
      duns100ValueRows: dunsCoverage,
      importedPublicationValueRows: importedPublicationCoverage,
      openAlexRows: openAlexCoverage
    },
    dashboardChecks: {
      centerSalary: Boolean(dashboardCenterSalary && !dashboardCenterSalary.isPlaceholder),
      peripherySalary: Boolean(dashboardPeripherySalary && !dashboardPeripherySalary.isPlaceholder),
      salaryGap: Boolean(dashboardSalaryGap && !dashboardSalaryGap.isPlaceholder),
      waitingTime: Boolean(dashboardWaitingTime && !dashboardWaitingTime.isPlaceholder),
      acceptanceDistribution: Boolean(dashboardAcceptanceDistribution && !dashboardAcceptanceDistribution.isPlaceholder),
      burnoutComparedToNationalAverage: Boolean(dashboardBurnout && dashboardBurnout.tooltip?.includes("4.5"))
    },
    departmentValuePriorityChecks: detailDepartmentChecks,
    dunsAndPublications: {
      dunsShownWhenPresent: dunsCoverage > 0 || "no current imported DUNS100 values",
      publicationsShownWhenPresent:
        importedPublicationCoverage > 0 || openAlexCoverage > 0 || "no current imported/OpenAlex publication values",
      nullFallbackText: "הנתון עדיין לא סופק",
      futureCrawlerFields: ["duns100PhysiciansCount", "departmentalPublicationsCount", "OpenAlex researchMetrics"]
    },
    audit: {
      ...countByStatus(auditRows),
      partiallyImplemented: auditRows
        .filter((row) => row.status === "Partially implemented")
        .map((row) => `${row.sheet}:${row.criterion}`),
      missing: auditRows
        .filter((row) => row.status === "Missing")
        .map((row) => `${row.sheet}:${row.criterion}`)
    },
    failedChecks
  };

  console.log(JSON.stringify(report, null, 2));

  if (failedChecks.length > 0) {
    throw new Error(`Metric display verification failed: ${failedChecks.join(", ")}`);
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
