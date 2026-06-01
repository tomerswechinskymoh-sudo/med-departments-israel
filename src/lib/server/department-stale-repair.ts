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

async function mergeDepartmentMetrics(tx: Prisma.TransactionClient, staleId: string, canonicalId: string) {
  const staleMetrics = await tx.departmentMetric.findMany({
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
    const existing = await tx.departmentMetric.findFirst({
      where: {
        departmentId: canonicalId,
        metricKey: { in: equivalentKeys }
      },
      select: { id: true }
    });

    if (existing) {
      await tx.departmentMetric.delete({ where: { id: metric.id } });
      dropped += 1;
    } else {
      await tx.departmentMetric.update({
        where: { id: metric.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeDepartmentYearlyMetrics(tx: Prisma.TransactionClient, staleId: string, canonicalId: string) {
  const staleRows = await tx.departmentYearlyMetric.findMany({
    where: { departmentId: staleId },
    select: { id: true, metricKey: true, year: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await tx.departmentYearlyMetric.findUnique({
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
      await tx.departmentYearlyMetric.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await tx.departmentYearlyMetric.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeDepartmentResearchMetrics(tx: Prisma.TransactionClient, staleId: string, canonicalId: string) {
  const staleRows = await tx.departmentResearchMetric.findMany({
    where: { departmentId: staleId },
    select: { id: true, year: true, source: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await tx.departmentResearchMetric.findUnique({
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
      await tx.departmentResearchMetric.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await tx.departmentResearchMetric.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeFavorites(tx: Prisma.TransactionClient, staleId: string, canonicalId: string) {
  const staleRows = await tx.favoriteDepartment.findMany({
    where: { departmentId: staleId },
    select: { userId: true, departmentId: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await tx.favoriteDepartment.findUnique({
      where: {
        userId_departmentId: {
          userId: row.userId,
          departmentId: canonicalId
        }
      }
    });

    if (existing) {
      await tx.favoriteDepartment.delete({
        where: {
          userId_departmentId: {
            userId: row.userId,
            departmentId: staleId
          }
        }
      });
      dropped += 1;
    } else {
      await tx.favoriteDepartment.update({
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

async function mergeRepresentativeAssignments(tx: Prisma.TransactionClient, staleId: string, canonicalId: string) {
  const staleRows = await tx.representativeAssignment.findMany({
    where: { departmentId: staleId },
    select: { id: true, userId: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await tx.representativeAssignment.findUnique({
      where: {
        userId_departmentId: {
          userId: row.userId,
          departmentId: canonicalId
        }
      }
    });

    if (existing) {
      await tx.representativeAssignment.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await tx.representativeAssignment.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeExternalMetrics(tx: Prisma.TransactionClient, staleId: string, canonicalId: string) {
  const staleRows = await tx.departmentExternalMetric.findMany({
    where: { departmentId: staleId },
    select: { id: true, metricKey: true, sourceName: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await tx.departmentExternalMetric.findFirst({
      where: {
        departmentId: canonicalId,
        metricKey: row.metricKey,
        sourceName: row.sourceName
      },
      select: { id: true }
    });

    if (existing) {
      await tx.departmentExternalMetric.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await tx.departmentExternalMetric.update({
        where: { id: row.id },
        data: { departmentId: canonicalId }
      });
      moved += 1;
    }
  }

  return { moved, dropped };
}

async function mergeExternalPeople(tx: Prisma.TransactionClient, staleId: string, canonicalId: string) {
  const staleRows = await tx.departmentExternalPerson.findMany({
    where: { departmentId: staleId },
    select: { id: true, sourceName: true, personName: true, rankingYear: true }
  });
  let moved = 0;
  let dropped = 0;

  for (const row of staleRows) {
    const existing = await tx.departmentExternalPerson.findFirst({
      where: {
        departmentId: canonicalId,
        sourceName: row.sourceName,
        personName: row.personName,
        rankingYear: row.rankingYear
      },
      select: { id: true }
    });

    if (existing) {
      await tx.departmentExternalPerson.delete({ where: { id: row.id } });
      dropped += 1;
    } else {
      await tx.departmentExternalPerson.update({
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

async function mergeSimpleRelations(tx: Prisma.TransactionClient, staleId: string, canonicalId: string) {
  const [
    heads,
    openings,
    researchOpportunities,
    officialUpdates,
    reviewSubmissions,
    reviews,
    publisherRequests,
    uploadedFiles,
    changeRequests,
    scrapeRevisions,
    mistakeReports,
    representativeRequests,
    dataImportRecords,
    dataImportRowLogs,
    dunsPhysicianRecords
  ] = await Promise.all([
    tx.departmentHead.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.residencyOpening.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.researchOpportunity.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.officialDepartmentUpdate.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.reviewSubmission.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.review.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.publisherRequest.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.uploadedFile.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.departmentChangeRequest.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.departmentScrapeRevision.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.departmentMistakeReport.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.departmentRepresentativeRequest.updateMany({ where: { departmentId: staleId }, data: { departmentId: canonicalId } }),
    tx.dataImportRecord.updateMany({ where: { normalizedDepartmentId: staleId }, data: { normalizedDepartmentId: canonicalId } }),
    tx.dataImportRowLog.updateMany({ where: { normalizedDepartmentId: staleId }, data: { normalizedDepartmentId: canonicalId } }),
    tx.dunsPhysicianRecord.updateMany({ where: { normalizedDepartmentId: staleId }, data: { normalizedDepartmentId: canonicalId } })
  ]);

  return {
    heads: heads.count,
    openings: openings.count,
    researchOpportunities: researchOpportunities.count,
    officialUpdates: officialUpdates.count,
    reviewSubmissions: reviewSubmissions.count,
    reviews: reviews.count,
    publisherRequests: publisherRequests.count,
    uploadedFiles: uploadedFiles.count,
    changeRequests: changeRequests.count,
    scrapeRevisions: scrapeRevisions.count,
    mistakeReports: mistakeReports.count,
    representativeRequests: representativeRequests.count,
    dataImportRecords: dataImportRecords.count,
    dataImportRowLogs: dataImportRowLogs.count,
    dunsPhysicianRecords: dunsPhysicianRecords.count
  };
}

export async function findStaleDepartmentRepairPairs(db: DbClient) {
  const departments = await db.department.findMany({
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

export async function repairStaleDepartmentRows(db: PrismaClient, options: { dryRun?: boolean } = {}) {
  const pairs = await findStaleDepartmentRepairPairs(db);
  const repaired: Array<{
    staleId: string;
    canonicalId: string;
    hospital: string;
    specialty: string;
    normalizedSubDepartment: string;
    moved: Record<string, number | { moved: number; dropped: number }>;
  }> = [];

  for (const pair of pairs) {
    if (options.dryRun) {
      repaired.push({
        staleId: pair.stale.id,
        canonicalId: pair.canonical.id,
        hospital: pair.canonical.institution.name,
        specialty: pair.canonical.specialty.name,
        normalizedSubDepartment: pair.normalizedSubDepartment,
        moved: {}
      });
      continue;
    }

    const moved = await db.$transaction(async (tx) => {
      const [
        metrics,
        yearlyMetrics,
        researchMetrics,
        favorites,
        assignments,
        externalMetrics,
        externalPeople
      ] = await Promise.all([
        mergeDepartmentMetrics(tx, pair.stale.id, pair.canonical.id),
        mergeDepartmentYearlyMetrics(tx, pair.stale.id, pair.canonical.id),
        mergeDepartmentResearchMetrics(tx, pair.stale.id, pair.canonical.id),
        mergeFavorites(tx, pair.stale.id, pair.canonical.id),
        mergeRepresentativeAssignments(tx, pair.stale.id, pair.canonical.id),
        mergeExternalMetrics(tx, pair.stale.id, pair.canonical.id),
        mergeExternalPeople(tx, pair.stale.id, pair.canonical.id)
      ]);
      const simple = await mergeSimpleRelations(tx, pair.stale.id, pair.canonical.id);
      const preservedData = preservedDepartmentData(pair.canonical, pair.stale);
      if (Object.keys(preservedData).length > 0) {
        await tx.department.update({
          where: { id: pair.canonical.id },
          data: preservedData
        });
      }
      await tx.department.update({
        where: { id: pair.stale.id },
        data: {
          importStableKey: null,
          medicalArrayId: null
        }
      });

      return {
        metrics,
        yearlyMetrics,
        researchMetrics,
        favorites,
        assignments,
        externalMetrics,
        externalPeople,
        ...simple
      };
    }, { timeout: 60000 });

    repaired.push({
      staleId: pair.stale.id,
      canonicalId: pair.canonical.id,
      hospital: pair.canonical.institution.name,
      specialty: pair.canonical.specialty.name,
      normalizedSubDepartment: pair.normalizedSubDepartment,
      moved
    });
  }

  return {
    scannedPairs: pairs.length,
    repairedPairs: options.dryRun ? 0 : repaired.length,
    dryRun: Boolean(options.dryRun),
    pairs: repaired
  };
}
