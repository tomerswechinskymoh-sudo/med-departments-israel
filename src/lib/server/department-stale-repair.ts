import { Prisma, type PrismaClient } from "@prisma/client";
import {
  normalizeDepartmentNameSubDepartment
} from "@/lib/department-normalization";
import { metricRegistryEntryFor } from "@/lib/imported-metric-resolver";

type DbClient = PrismaClient | Prisma.TransactionClient;

type DepartmentForRepair = {
  id: string;
  institutionId: string;
  specialtyId: string;
  name: string;
  slug: string;
  importStableKey: string | null;
  websiteUrl: string | null;
  applicationUrl: string | null;
  about: string;
  shortSummary: string;
  practicalInfo: string;
  publicContactEmail: string | null;
  publicContactPhone: string | null;
  contactName: string | null;
  residentsCount: number | null;
  medianResidencyLength: string | null;
  shlavAlephPassRate: number | null;
  shlavBetPassRate: number | null;
  newResidentsThisYear: number | null;
  expectedGraduatesThisYear: number | null;
  genderBalance: string | null;
  dataSourceNotes: string | null;
  dataLastUpdated: Date | null;
  medicalArrayId: string | null;
  institution: { name: string };
  specialty: { name: string };
  _count: { metrics: number; yearlyMetrics: number; reviews: number; reviewSubmissions: number };
};

type RepairPair = {
  canonical: DepartmentForRepair;
  stale: DepartmentForRepair;
  normalizedSubDepartment: string;
};

function groupKey(department: DepartmentForRepair) {
  const normalizedSubDepartment = normalizeDepartmentNameSubDepartment(
    department.name,
    department.specialty.name
  );

  return {
    normalizedSubDepartment,
    key: [department.institutionId, department.specialtyId, normalizedSubDepartment || "__base__"].join("|")
  };
}

function canonicalScore(department: DepartmentForRepair) {
  return department._count.metrics * 10 + department._count.yearlyMetrics + (department.importStableKey ? 1000 : 0);
}

function chooseCanonical(departments: DepartmentForRepair[]) {
  return [...departments]
    .filter((department) => department.importStableKey)
    .sort((left, right) => {
      const scoreDelta = canonicalScore(right) - canonicalScore(left);
      if (scoreDelta !== 0) return scoreDelta;
      return left.name.length - right.name.length;
    })[0] ?? null;
}

async function mergeDepartmentMetrics(db: DbClient, staleId: string, canonicalId: string) {
  const staleMetrics = await db.departmentMetric.findMany({
    where: { departmentId: staleId },
    select: { id: true, metricKey: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const metric of staleMetrics) {
    const registry = metricRegistryEntryFor(metric.metricKey);
    const equivalentKeys = Array.from(new Set([
      metric.metricKey,
      ...(registry?.importedKeys ?? []),
      ...(registry?.dbKeys ?? []),
      ...(registry?.legacyKeys ?? [])
    ]));
    const existing = await db.departmentMetric.findFirst({
      where: {
        departmentId: canonicalId,
        metricKey: { in: equivalentKeys }
      },
      select: { id: true }
    });

    if (existing) {
      await db.departmentMetric.delete({ where: { id: metric.id } });
      dropped += 1;
    } else {
      await db.departmentMetric.update({
        where: { id: metric.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeDepartmentYearlyMetrics(db: DbClient, staleId: string, canonicalId: string) {
  const staleRows = await db.departmentYearlyMetric.findMany({
    where: { departmentId: staleId },
    select: { id: true, metricKey: true, year: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await db.departmentYearlyMetric.findUnique({
      where: {
        departmentId_metricKey_year: {
          departmentId: canonicalId,
          metricKey: row.metricKey,
          year: row.year
        }
      },
      select: { id: true }
    });

    if (existing) {
      await db.departmentYearlyMetric.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await db.departmentYearlyMetric.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeDepartmentResearchMetrics(db: DbClient, staleId: string, canonicalId: string) {
  const staleRows = await db.departmentResearchMetric.findMany({
    where: { departmentId: staleId },
    select: { id: true, year: true, source: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await db.departmentResearchMetric.findUnique({
      where: {
        departmentId_year_source: {
          departmentId: canonicalId,
          year: row.year,
          source: row.source
        }
      },
      select: { id: true }
    });

    if (existing) {
      await db.departmentResearchMetric.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await db.departmentResearchMetric.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeFavorites(db: DbClient, staleId: string, canonicalId: string) {
  const staleRows = await db.favoriteDepartment.findMany({
    where: { departmentId: staleId },
    select: { userId: true, departmentId: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await db.favoriteDepartment.findUnique({
      where: {
        userId_departmentId: {
          userId: row.userId,
          departmentId: canonicalId
        }
      }
    });

    if (existing) {
      await db.favoriteDepartment.delete({
        where: {
          userId_departmentId: {
            userId: row.userId,
            departmentId: staleId
          }
        }
      });
      dropped += 1;
    } else {
      await db.favoriteDepartment.update({
        where: {
          userId_departmentId: {
            userId: row.userId,
            departmentId: staleId
          }
        },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeRepresentativeAssignments(db: DbClient, staleId: string, canonicalId: string) {
  const staleRows = await db.representativeAssignment.findMany({
    where: { departmentId: staleId },
    select: { id: true, userId: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await db.representativeAssignment.findUnique({
      where: {
        userId_departmentId: {
          userId: row.userId,
          departmentId: canonicalId
        }
      }
    });

    if (existing) {
      await db.representativeAssignment.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await db.representativeAssignment.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeExternalMetrics(db: DbClient, staleId: string, canonicalId: string) {
  const staleRows = await db.departmentExternalMetric.findMany({
    where: { departmentId: staleId },
    select: { id: true, metricKey: true, sourceName: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await db.departmentExternalMetric.findFirst({
      where: {
        departmentId: canonicalId,
        metricKey: row.metricKey,
        sourceName: row.sourceName
      },
      select: { id: true }
    });

    if (existing) {
      await db.departmentExternalMetric.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await db.departmentExternalMetric.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeExternalPeople(db: DbClient, staleId: string, canonicalId: string) {
  const staleRows = await db.departmentExternalPerson.findMany({
    where: { departmentId: staleId },
    select: { id: true, sourceName: true, personName: true, rankingYear: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await db.departmentExternalPerson.findFirst({
      where: {
        departmentId: canonicalId,
        sourceName: row.sourceName,
        personName: row.personName,
        rankingYear: row.rankingYear
      },
      select: { id: true }
    });

    if (existing) {
      await db.departmentExternalPerson.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await db.departmentExternalPerson.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

function preservedDepartmentData(canonical: DepartmentForRepair, stale: DepartmentForRepair) {
  const data: Prisma.DepartmentUpdateInput = {};
  const copyString = <Key extends keyof DepartmentForRepair>(key: Key) => {
    const canonicalValue = canonical[key];
    const staleValue = stale[key];
    if ((canonicalValue === null || canonicalValue === "") && typeof staleValue === "string" && staleValue.trim()) {
      (data as Record<string, unknown>)[key as string] = staleValue;
    }
  };
  const copyNumber = <Key extends keyof DepartmentForRepair>(key: Key) => {
    if (canonical[key] === null && typeof stale[key] === "number") {
      (data as Record<string, unknown>)[key as string] = stale[key];
    }
  };

  copyString("websiteUrl");
  copyString("applicationUrl");
  copyString("about");
  copyString("shortSummary");
  copyString("practicalInfo");
  copyString("publicContactEmail");
  copyString("publicContactPhone");
  copyString("contactName");
  copyString("medianResidencyLength");
  copyString("genderBalance");
  copyString("dataSourceNotes");
  copyNumber("residentsCount");
  copyNumber("shlavAlephPassRate");
  copyNumber("shlavBetPassRate");
  copyNumber("newResidentsThisYear");
  copyNumber("expectedGraduatesThisYear");

  if (!canonical.dataLastUpdated && stale.dataLastUpdated) data.dataLastUpdated = stale.dataLastUpdated;
  if (!canonical.medicalArrayId && stale.medicalArrayId) {
    data.medicalArray = { connect: { id: stale.medicalArrayId } };
  }

  return data;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function mergeSimpleRelations(
  db: PrismaClient,
  staleId: string,
  canonicalId: string,
  runStep: (label: string, run: () => Promise<number | { moved: number; dropped: number }>) => Promise<void>
) {
  await runStep("heads", async () => (await db.departmentHead.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("openings", async () => (await db.residencyOpening.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("researchOpportunities", async () => (await db.researchOpportunity.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("officialUpdates", async () => (await db.officialDepartmentUpdate.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("reviewSubmissions", async () => (await db.reviewSubmission.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("reviews", async () => (await db.review.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("publisherRequests", async () => (await db.publisherRequest.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("uploadedFiles", async () => (await db.uploadedFile.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("changeRequests", async () => (await db.departmentChangeRequest.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("scrapeRevisions", async () => (await db.departmentScrapeRevision.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("mistakeReports", async () => (await db.departmentMistakeReport.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("representativeRequests", async () => (await db.departmentRepresentativeRequest.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } })).count);
  await runStep("dataImportRecords", async () => (await db.dataImportRecord.updateMany({ where: { normalizedDepartmentId: staleId }, data: { normalizedDepartmentId: canonicalId } })).count);
  await runStep("dataImportRowLogs", async () => (await db.dataImportRowLog.updateMany({ where: { normalizedDepartmentId: staleId }, data: { normalizedDepartmentId: canonicalId } })).count);
  await runStep("dunsPhysicianRecords", async () => (await db.dunsPhysicianRecord.updateMany({ where: { normalizedDepartmentId: staleId }, data: { normalizedDepartmentId: canonicalId } })).count);
}

export async function findStaleDepartmentRepairPairs(db: DbClient) {
  const departments = await db.department.findMany({
    where: {
      importStableKey: {
        not: null
      }
    },
    select: {
      id: true,
      institutionId: true,
      specialtyId: true,
      name: true,
      slug: true,
      importStableKey: true,
      websiteUrl: true,
      applicationUrl: true,
      about: true,
      shortSummary: true,
      practicalInfo: true,
      publicContactEmail: true,
      publicContactPhone: true,
      contactName: true,
      residentsCount: true,
      medianResidencyLength: true,
      shlavAlephPassRate: true,
      shlavBetPassRate: true,
      newResidentsThisYear: true,
      expectedGraduatesThisYear: true,
      genderBalance: true,
      dataSourceNotes: true,
      dataLastUpdated: true,
      medicalArrayId: true,
      institution: { select: { name: true } },
      specialty: { select: { name: true } },
      _count: {
        select: {
          metrics: true,
          yearlyMetrics: true,
          reviews: true,
          reviewSubmissions: true
        }
      }
    }
  });
  const groups = new Map<string, { normalizedSubDepartment: string; departments: DepartmentForRepair[] }>();

  for (const department of departments) {
    const { key, normalizedSubDepartment } = groupKey(department);
    const group = groups.get(key) ?? { normalizedSubDepartment, departments: [] };
    group.departments.push(department);
    groups.set(key, group);
  }

  const pairs: RepairPair[] = [];
  for (const group of groups.values()) {
    if (group.departments.length < 2) continue;
    const canonical = chooseCanonical(group.departments);
    if (!canonical) continue;

    for (const stale of group.departments) {
      if (stale.id === canonical.id) continue;
      pairs.push({ canonical, stale, normalizedSubDepartment: group.normalizedSubDepartment });
    }
  }

  return pairs;
}

export async function repairStaleDepartmentRows(
  db: PrismaClient,
  options: {
    dryRun?: boolean;
    limit?: number;
    fromPair?: number;
    skipRelations?: boolean;
    onProgress?: (message: string) => void;
  } = {}
) {
  const activeDepartmentCount = await db.department.count({
    where: {
      importStableKey: {
        not: null
      }
    }
  });
  const alreadyRepairedAliasCount = await db.department.count({
    where: {
      importStableKey: null,
      medicalArrayId: null
    }
  });
  const pairs = await findStaleDepartmentRepairPairs(db);
  const selectedPairs = pairs
    .filter((_, index) => options.fromPair === undefined || index + 1 >= options.fromPair)
    .slice(0, options.limit);
  const repaired: Array<{
    staleId: string;
    canonicalId: string;
    hospital: string;
    specialty: string;
    normalizedSubDepartment: string;
    moved: Record<string, number | { moved: number; dropped: number }>;
    failures: Array<{ step: string; error: string }>;
    hidden: boolean;
  }> = [];

  options.onProgress?.(
    `active=${activeDepartmentCount} alreadyRepairedAliases=${alreadyRepairedAliasCount}` +
    ` pairs=${pairs.length} selected=${selectedPairs.length}` +
    `${options.fromPair !== undefined ? ` fromPair=${options.fromPair}` : ""}` +
    `${options.limit !== undefined ? ` limit=${options.limit}` : ""}` +
    `${options.skipRelations ? " skipRelations=true" : ""}`
  );

  for (const [index, pair] of selectedPairs.entries()) {
    const pairNumber = (options.fromPair ?? 1) + index;
    options.onProgress?.(
      `${options.dryRun ? "dry-run" : "repair"} ${pairNumber}/${pairs.length}: ${pair.stale.id} -> ${pair.canonical.id}`
    );

    if (options.dryRun) {
      repaired.push({
        staleId: pair.stale.id,
        canonicalId: pair.canonical.id,
        hospital: pair.canonical.institution.name,
        specialty: pair.canonical.specialty.name,
        normalizedSubDepartment: pair.normalizedSubDepartment,
        moved: {},
        failures: [],
        hidden: false
      });
      continue;
    }

    const moved: Record<string, number | { moved: number; dropped: number }> = {};
    const failures: Array<{ step: string; error: string }> = [];
    const runStep = async (
      label: string,
      run: () => Promise<number | { moved: number; dropped: number }>
    ) => {
      try {
        const result = await run();
        moved[label] = result;
        options.onProgress?.(`pair ${pairNumber}/${pairs.length} ${label}: ok ${JSON.stringify(result)}`);
      } catch (error) {
        const message = errorMessage(error);
        failures.push({ step: label, error: message });
        options.onProgress?.(`pair ${pairNumber}/${pairs.length} ${label}: FAIL ${message}`);
      }
    };

    if (options.skipRelations) {
      moved.relationsSkipped = 1;
      options.onProgress?.(`pair ${pairNumber}/${pairs.length} relations: skipped by flag`);
    } else {
      await runStep("metrics", () => mergeDepartmentMetrics(db, pair.stale.id, pair.canonical.id));
      await runStep("yearlyMetrics", () => mergeDepartmentYearlyMetrics(db, pair.stale.id, pair.canonical.id));
      await runStep("researchMetrics", () => mergeDepartmentResearchMetrics(db, pair.stale.id, pair.canonical.id));
      await runStep("favorites", () => mergeFavorites(db, pair.stale.id, pair.canonical.id));
      await runStep("assignments", () => mergeRepresentativeAssignments(db, pair.stale.id, pair.canonical.id));
      await runStep("externalMetrics", () => mergeExternalMetrics(db, pair.stale.id, pair.canonical.id));
      await runStep("externalPeople", () => mergeExternalPeople(db, pair.stale.id, pair.canonical.id));
      await mergeSimpleRelations(db, pair.stale.id, pair.canonical.id, runStep);
    }

    if (failures.length === 0) {
      await runStep("preserveCanonicalData", async () => {
        const preservedData = preservedDepartmentData(pair.canonical, pair.stale);
        if (Object.keys(preservedData).length === 0) return 0;

        await db.department.update({
          where: { id: pair.canonical.id },
          data: preservedData
        });
        return 1;
      });
    }

    if (failures.length === 0) {
      await runStep("markStaleHidden", async () => {
        await db.department.update({
          where: { id: pair.stale.id },
          data: {
            importStableKey: null,
            medicalArrayId: null
          }
        });
        return 1;
      });
    }

    repaired.push({
      staleId: pair.stale.id,
      canonicalId: pair.canonical.id,
      hospital: pair.canonical.institution.name,
      specialty: pair.canonical.specialty.name,
      normalizedSubDepartment: pair.normalizedSubDepartment,
      moved,
      failures,
      hidden: failures.length === 0
    });
  }

  return {
    scannedPairs: pairs.length,
    selectedPairs: selectedPairs.length,
    repairedPairs: options.dryRun ? 0 : repaired.filter((pair) => pair.hidden).length,
    failedPairs: repaired.filter((pair) => pair.failures.length > 0).length,
    skippedAlreadyRepairedAliases: alreadyRepairedAliasCount,
    activeDepartmentCount,
    dryRun: Boolean(options.dryRun),
    skipRelations: Boolean(options.skipRelations),
    pairs: repaired
  };
}
