import { getDepartmentPageData, getDirectoryData, getSpecialtyDashboardMetrics } from "@/lib/queries";
import {
  findMetricDisplayMetadata,
  metadataDisplayAction,
  metadataSourceLabel,
  metadataTooltip,
  normalizeCriterion,
  readableLabelFromCriterion,
  type MetricDisplayMetadata
} from "@/lib/metric-display";
import {
  availableImportedMetricKeys,
  metricFieldLabel,
  metricKeyCandidates,
  metricRegistryEntries,
  resolveImportedMetric,
  resolveImportedSalaryMetrics,
  resolveImportedYearlyMetric,
  resolveMetricDisplayMetadata,
  type ImportedMetricLike,
  type ImportedYearlyMetricLike
} from "@/lib/imported-metric-resolver";
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

const requiredMetricCards = [
  { id: "centerSalary", label: "שכר מרכז", field: "שכר_לא_פריפריה" },
  { id: "peripherySalary", label: "שכר פריפריה", field: "שכר_פריפריה" },
  { id: "peripherySalaryGap", label: "פער שכר", field: "פער_שכר_פריפריה" },
  { id: "residentsCount", label: "מספר מתמחים", field: "מספר_מתמחים" },
  { id: "medianWaitingTime", label: "זמן המתנה חציוני לתקן", field: "זמן_המתנה_חציוני_לתקן" },
  { id: "officialResidencyDuration", label: "משך התמחות רשמי", field: "משך_התמחות_רשמי" },
  { id: "actualAverageDuration", label: "משך ממוצע בפועל", field: "משך_ממוצע_בפועל" },
  { id: "seniorPhysiciansCount", label: "מספר בכירים", field: "מספר_בכירים" },
  { id: "duns100PhysiciansCount", label: "DUNS100", field: "DUNS100" },
  { id: "departmentalPublicationsCount", label: "מספר פרסומים מחלקתי", field: "מספר פרסומים מחלקתי" },
  {
    id: "acceptedImmediatelyReports",
    label: "מצאו התמחות מיד",
    field: "מספר המתקבלים שדיווחו שמצאו מיד התמחות"
  },
  {
    id: "acceptedWithinSixMonthsReports",
    label: "מצאו עד חצי שנה",
    field: "מספר המתקבלים שדיווחו שמצאו עד חצי שנה"
  },
  {
    id: "acceptedWithinOneYearReports",
    label: "מצאו עד שנה",
    field: "מספר המתקבלים שדיווחו שמצאו עד שנה"
  },
  {
    id: "acceptedWithinTwoYearsReports",
    label: "מצאו עד שנתיים",
    field: "מספר המתקבלים שדיווחו שמצאו עד שנתיים"
  },
  {
    id: "acceptedAfterTwoYearsReports",
    label: "מצאו אחרי שנתיים",
    field: "מספר המתקבלים שדיווחו שמצאו אחרי שנתיים"
  },
  { id: "womenPercent", label: "אחוז נשים", field: "אחוז_נשים" },
  { id: "menPercent", label: "אחוז גברים", field: "אחוז_גברים" }
];

const requiredYearlyCards = [2020, 2021, 2022, 2023, 2024].map((year) => ({
  id: `newResidents${year}`,
  label: `מספר מתמחים חדשים ${year}`,
  field: `מספר מתמחים חדשים ${year}`,
  year
}));

const expectedSalaryValues = {
  centerSalary: "16,954.00",
  peripherySalary: "19,965.92",
  salaryGap: "3,011.92"
};

function normalizedValueCandidates(value: string) {
  return [value, readableLabelFromCriterion(value)].map(normalizeCriterion);
}

function metricCanMatch(
  metric: ImportedMetricLike | ImportedYearlyMetricLike,
  field: string
) {
  const candidates = metricKeyCandidates(field);
  const normalizedCandidates = [...candidates.exact, ...candidates.aliases].flatMap(normalizedValueCandidates);
  const metricValues = [
    metric.metricKey,
    "label" in metric && metric.label ? metric.label : null,
    readableLabelFromCriterion(metric.metricKey)
  ].filter((value): value is string => Boolean(value));

  return metricValues.some((value) => normalizedCandidates.includes(normalizeCriterion(value)));
}

function dbHasResolvableValue(
  metrics: Array<ImportedMetricLike | ImportedYearlyMetricLike>,
  field: string,
  year?: number
) {
  return metrics.some(
    (metric) =>
      (year === undefined || ("year" in metric && metric.year === year)) &&
      hasValue(metric) &&
      metricCanMatch(metric, field)
  );
}

function resolverCardReport(input: {
  metrics: ImportedMetricLike[];
  yearlyMetrics?: ImportedYearlyMetricLike[];
  metadata: MetricDisplayMetadata[];
  sheet: "MASTER_Spec" | "Master_Dept";
  includeDepartmentOnly?: boolean;
}) {
  const metricReports = requiredMetricCards
    .filter((card) => !input.includeDepartmentOnly || !["duns100PhysiciansCount", "departmentalPublicationsCount"].includes(card.id))
    .map((card) => {
      const resolved = resolveImportedMetric(input.metrics, card.field);
      const metadata = resolveMetricDisplayMetadata(input.metadata, input.sheet, card.field);
      const valueExistsInDb = dbHasResolvableValue(input.metrics, card.field);

      return {
        id: card.id,
        importedKey: card.field,
        renderedLabel: metadata?.readableLabel ?? card.label ?? metricFieldLabel(card.field),
        resolvedValue: resolved?.rawValue ?? resolved?.value ?? null,
        dataExpMatched: Boolean(metadata),
        tooltip: metadata?.explanation ?? null,
        tooltipSource: metadata?.sourceLabel ?? null,
        valueExistsInDb,
        resolvesAsMissing: valueExistsInDb && !resolved
      };
    });

  const yearlyReports = requiredYearlyCards.map((card) => {
    const resolved = resolveImportedYearlyMetric(input.yearlyMetrics ?? [], card.field, { year: card.year });
    const metadata = resolveMetricDisplayMetadata(input.metadata, input.sheet, card.field);
    const valueExistsInDb = dbHasResolvableValue(input.yearlyMetrics ?? [], card.field, card.year);

    return {
      id: card.id,
      importedKey: card.field,
      renderedLabel: metadata?.readableLabel ?? card.label,
      resolvedValue: resolved?.rawValue ?? resolved?.value ?? null,
      dataExpMatched: Boolean(metadata),
      tooltip: metadata?.explanation ?? null,
      tooltipSource: metadata?.sourceLabel ?? null,
      valueExistsInDb,
      resolvesAsMissing: valueExistsInDb && !resolved
    };
  });

  return [...metricReports, ...yearlyReports];
}

function salaryValue(metric: ImportedMetricLike | null | undefined) {
  return metric?.rawValue?.trim() ?? (typeof metric?.value === "number" ? String(metric.value) : null);
}

function salaryVerificationReport(input: {
  label: string;
  metrics: ImportedMetricLike[];
  dashboard?: Awaited<ReturnType<typeof getSpecialtyDashboardMetrics>> | null;
}) {
  const salaryMetrics = resolveImportedSalaryMetrics(input.metrics);
  const dashboardValues = input.dashboard
    ? {
        centerSalary: input.dashboard.metrics.find((metric) => metric.key === "centerSalary")?.value ?? null,
        peripherySalary: input.dashboard.metrics.find((metric) => metric.key === "peripherySalary")?.value ?? null,
        salaryGap: input.dashboard.metrics.find((metric) => metric.key === "salaryGap")?.value ?? null
      }
    : null;

  return {
    label: input.label,
    centerSalary: {
      dbValue: salaryValue(salaryMetrics.centerSalary),
      uiValue: dashboardValues?.centerSalary ?? salaryValue(salaryMetrics.centerSalary),
      expected: expectedSalaryValues.centerSalary
    },
    peripherySalary: {
      dbValue: salaryValue(salaryMetrics.peripherySalary),
      uiValue: dashboardValues?.peripherySalary ?? salaryValue(salaryMetrics.peripherySalary),
      expected: expectedSalaryValues.peripherySalary
    },
    salaryGap: {
      dbValue: salaryValue(salaryMetrics.salaryGap),
      uiValue: dashboardValues?.salaryGap ?? salaryValue(salaryMetrics.salaryGap),
      expected: expectedSalaryValues.salaryGap
    }
  };
}

function salaryVerificationFailures(
  report: ReturnType<typeof salaryVerificationReport>
) {
  return (["centerSalary", "peripherySalary", "salaryGap"] as const)
    .map((key) => {
      const row = report[key];
      if (row.dbValue && !row.uiValue) return `${report.label} ${key} resolves missing`;
      if (row.dbValue !== row.expected) return `${report.label} ${key} DB value mismatch`;
      if (row.uiValue !== row.expected) return `${report.label} ${key} UI value mismatch`;
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function strictMetricRegistryReport(input: {
  scope: "specialty" | "department";
  metrics: ImportedMetricLike[];
  yearlyMetrics: ImportedYearlyMetricLike[];
  metadata: MetricDisplayMetadata[];
  dashboard?: Awaited<ReturnType<typeof getSpecialtyDashboardMetrics>> | null;
}) {
  const uiPrefix = input.scope === "specialty" ? "specialtyDashboard." : "department";

  return metricRegistryEntries()
    .filter((entry) => entry.uiCards.some((card) => card.startsWith(uiPrefix)))
    .map((entry) => {
      const csvKey = entry.importedKeys[0] ?? entry.id;
      const year = entry.years?.[0];
      const metadataSheet = input.scope === "specialty" ? "MASTER_Spec" : "Master_Dept";
      const metadata = resolveMetricDisplayMetadata(input.metadata, metadataSheet, csvKey);
      const resolved =
        typeof year === "number"
          ? resolveImportedYearlyMetric(input.yearlyMetrics, csvKey, { year })
          : resolveImportedMetric(input.metrics, csvKey);
      const valueExistsInDb =
        typeof year === "number"
          ? dbHasResolvableValue(input.yearlyMetrics, csvKey, year)
          : dbHasResolvableValue(input.metrics, csvKey);
      const dashboardValues = input.scope === "specialty"
        ? entry.uiCards
            .filter((card) => card.startsWith("specialtyDashboard."))
            .map((card) => card.replace("specialtyDashboard.", ""))
            .map((cardKey) => input.dashboard?.metrics.find((metric) => metric.key === cardKey) ?? null)
            .filter((metric): metric is NonNullable<typeof metric> => Boolean(metric))
        : [];
      const renderedMissing =
        metadata?.isHidden
          ? false
          : dashboardValues.length > 0
            ? dashboardValues.every((metric) => metric.isPlaceholder)
            : valueExistsInDb && !resolved;

      return {
        id: entry.id,
        csvKeys: entry.importedKeys,
        dbKeys: entry.dbKeys,
        uiCards: entry.uiCards,
        year: year ?? null,
        dataExpMatched: Boolean(metadata),
        hiddenByDataExp: Boolean(metadata?.isHidden),
        valueExistsInDb,
        resolvedValue: resolved?.rawValue ?? resolved?.value ?? null,
        renderedValues: dashboardValues.map((metric) => ({
          key: metric.key,
          value: metric.value,
          isPlaceholder: metric.isPlaceholder
        })),
        rendersAsMissing: valueExistsInDb && renderedMissing
      };
    });
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
      select: { metricKey: true, label: true, value: true, rawValue: true, unit: true, sourceNotes: true, lastUpdated: true }
    }),
    prisma.specialtyYearlyMetric.findMany({
      where: { specialtyId: specialty.id },
      select: { metricKey: true, year: true, value: true, rawValue: true, unit: true, sourceNotes: true, lastUpdated: true }
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
  const resolverSampleDepartment =
    (await prisma.department.findFirst({
      where: {
        importStableKey: { not: null },
        institution: { name: { contains: "אסיא" } },
        specialty: { name: { contains: "רפואת משפחה" } }
      },
      select: {
        id: true,
        name: true,
        institution: { select: { name: true } },
        specialty: { select: { name: true } },
        metrics: {
          select: {
            metricKey: true,
            label: true,
            value: true,
            rawValue: true,
            unit: true,
            sourceNotes: true,
            lastUpdated: true
          }
        },
        yearlyMetrics: {
          select: {
            metricKey: true,
            year: true,
            value: true,
            rawValue: true,
            unit: true,
            sourceNotes: true,
            lastUpdated: true
          }
        }
      }
    })) ??
    (await prisma.department.findFirst({
      where: {
        importStableKey: { not: null },
        OR: [{ name: { contains: "אסיא" } }, { institution: { name: { contains: "אסיא" } } }]
      },
      select: {
        id: true,
        name: true,
        institution: { select: { name: true } },
        specialty: { select: { name: true } },
        metrics: {
          select: {
            metricKey: true,
            label: true,
            value: true,
            rawValue: true,
            unit: true,
            sourceNotes: true,
            lastUpdated: true
          }
        },
        yearlyMetrics: {
          select: {
            metricKey: true,
            year: true,
            value: true,
            rawValue: true,
            unit: true,
            sourceNotes: true,
            lastUpdated: true
          }
        }
      }
    }));
  const salarySpecialty = await prisma.specialty.findFirst({
    where: { name: "רפואת משפחה" },
    select: {
      id: true,
      name: true,
      metrics: {
        select: {
          metricKey: true,
          label: true,
          value: true,
          rawValue: true,
          unit: true,
          sourceNotes: true,
          lastUpdated: true
        }
      }
    }
  });
  const salaryDashboard = salarySpecialty ? await getSpecialtyDashboardMetrics(salarySpecialty.id) : null;

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
        departmentValueExists: Boolean(resolveImportedMetric(detail.metrics, key))
      }))
    : [];
  const dunsCoverage = departmentMetricCoverage.find((row) => row.metricKey === "duns100PhysiciansCount")?._count._all ?? 0;
  const importedPublicationCoverage =
    departmentMetricCoverage.find((row) => row.metricKey === "departmentalPublicationsCount")?._count._all ?? 0;
  const openAlexCoverage = await prisma.departmentResearchMetric.count({
    where: { department: { specialtyId: specialty.id }, source: "OpenAlex", needsMapping: false }
  });
  const specialtyResolverCards = resolverCardReport({
    metrics: specialtyMetricRows,
    yearlyMetrics: specialtyYearlyRows,
    metadata,
    sheet: "MASTER_Spec"
  });
  const departmentResolverCards = resolverSampleDepartment
    ? resolverCardReport({
        metrics: resolverSampleDepartment.metrics,
        yearlyMetrics: resolverSampleDepartment.yearlyMetrics,
        metadata,
        sheet: "Master_Dept"
      })
    : [];
  const resolverFailures = [
    ...specialtyResolverCards
      .filter((card) => card.resolvesAsMissing)
      .map((card) => `specialty resolver missed ${card.importedKey}`),
    ...departmentResolverCards
      .filter((card) => card.resolvesAsMissing)
      .map((card) => `department resolver missed ${card.importedKey}`),
    !resolverSampleDepartment ? "resolver sample department אסיא רפואת המשפחה not found" : null
  ].filter((item): item is string => Boolean(item));
  const salarySpecialtyReport = salarySpecialty
    ? salaryVerificationReport({
        label: "רפואת משפחה",
        metrics: salarySpecialty.metrics,
        dashboard: salaryDashboard
      })
    : null;
  const salaryDepartmentReport = resolverSampleDepartment
    ? salaryVerificationReport({
        label: "אסיא רפואת משפחה",
        metrics: resolverSampleDepartment.metrics
      })
    : null;
  const salaryFailures = [
    !salarySpecialtyReport ? "salary specialty רפואת משפחה not found" : null,
    ...(salarySpecialtyReport ? salaryVerificationFailures(salarySpecialtyReport) : []),
    ...(salaryDepartmentReport ? salaryVerificationFailures(salaryDepartmentReport) : [])
  ].filter((item): item is string => Boolean(item));
  const specialtyStrictRegistryReport = strictMetricRegistryReport({
    scope: "specialty",
    metrics: specialtyMetricRows,
    yearlyMetrics: specialtyYearlyRows,
    metadata,
    dashboard: summary
  });
  const departmentStrictRegistryReport = resolverSampleDepartment
    ? strictMetricRegistryReport({
        scope: "department",
        metrics: resolverSampleDepartment.metrics,
        yearlyMetrics: resolverSampleDepartment.yearlyMetrics,
        metadata
      })
    : [];
  const strictRegistryFailures = [
    ...specialtyStrictRegistryReport
      .filter((row) => row.rendersAsMissing)
      .map((row) => `strict registry specialty UI missing ${row.id}`),
    ...departmentStrictRegistryReport
      .filter((row) => row.rendersAsMissing)
      .map((row) => `strict registry department UI missing ${row.id}`)
  ];

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
      : null,
    ...resolverFailures,
    ...salaryFailures,
    ...strictRegistryFailures
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
    salaryVerification: {
      specialty: salarySpecialtyReport,
      department: salaryDepartmentReport
    },
    strictMetricRegistry: {
      mappedUiCards: Array.from(
        new Set(metricRegistryEntries().flatMap((entry) => entry.uiCards))
      ).sort(),
      specialtyFailures: specialtyStrictRegistryReport.filter((row) => row.rendersAsMissing),
      departmentFailures: departmentStrictRegistryReport.filter((row) => row.rendersAsMissing)
    },
    resolverAudit: {
      specialtySample: {
        name: specialty.name,
        availableMetricKeys: availableImportedMetricKeys(specialtyMetricRows),
        availableYearlyKeys: availableImportedMetricKeys(specialtyYearlyRows),
        cards: specialtyResolverCards
      },
      departmentSample: resolverSampleDepartment
        ? {
            institution: resolverSampleDepartment.institution.name,
            department: resolverSampleDepartment.name,
            specialty: resolverSampleDepartment.specialty.name,
            availableMetricKeys: availableImportedMetricKeys(resolverSampleDepartment.metrics),
            availableYearlyKeys: availableImportedMetricKeys(resolverSampleDepartment.yearlyMetrics),
            cards: departmentResolverCards
          }
        : null
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
