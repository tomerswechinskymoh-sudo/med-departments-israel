import { getDepartmentPageData, getDirectoryData } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

async function main() {
  const importedDepartments = await prisma.department.count({
    where: {
      importStableKey: {
        not: null
      }
    }
  });

  const importedBySpecialty = await prisma.department.groupBy({
    by: ["specialtyId"],
    where: {
      importStableKey: {
        not: null
      }
    },
    _count: {
      _all: true
    }
  });
  const topSpecialtyGroup = importedBySpecialty.sort(
    (left, right) => right._count._all - left._count._all
  )[0];

  if (!topSpecialtyGroup) {
    console.log(
      JSON.stringify(
        {
          importedDepartments,
          publicDirectoryRows: 0,
          importedRowsInPublicDirectory: 0,
          note: "No imported departments found."
        },
        null,
        2
      )
    );
    return;
  }

  const [selectedSpecialty, importedIdsForSpecialty, sampleImportedDepartment] =
    await Promise.all([
      prisma.specialty.findUnique({
        where: {
          id: topSpecialtyGroup.specialtyId
        },
        select: {
          id: true,
          name: true
        }
      }),
      prisma.department.findMany({
        where: {
          specialtyId: topSpecialtyGroup.specialtyId,
          importStableKey: {
            not: null
          }
        },
        select: {
          id: true
        }
      }),
      prisma.department.findFirst({
        where: {
          importStableKey: {
            not: null
          },
          about: {
            not: ""
          },
          AND: [
            {
              OR: [
                {
                  heads: {
                    some: {}
                  }
                },
                {
                  contactName: {
                    not: null
                  }
                },
                {
                  publicContactEmail: {
                    not: null
                  }
                },
                {
                  publicContactPhone: {
                    not: null
                  }
                }
              ]
            },
            {
              OR: [
                {
                  metrics: {
                    some: {}
                  }
                },
                {
                  yearlyMetrics: {
                    some: {}
                  }
                },
                {
                  researchMetrics: {
                    some: {}
                  }
                }
              ]
            }
          ]
        },
        orderBy: {
          updatedAt: "desc"
        },
        select: {
          id: true,
          slug: true,
          name: true
        }
      })
    ]);

  const directoryRows = await getDirectoryData({
    specialties: [topSpecialtyGroup.specialtyId]
  });
  const importedIds = new Set(importedIdsForSpecialty.map((department) => department.id));
  const importedRowsInPublicDirectory = directoryRows.filter((department) =>
    importedIds.has(department.id)
  );
  const detail = sampleImportedDepartment
    ? await getDepartmentPageData(
        sampleImportedDepartment.slug,
        undefined,
        sampleImportedDepartment.id
      )
    : null;

  const result = {
    importedDepartments,
    selectedSpecialty,
    importedDepartmentsInSelectedSpecialty: topSpecialtyGroup._count._all,
    publicDirectoryRows: directoryRows.length,
    importedRowsInPublicDirectory: importedRowsInPublicDirectory.length,
    firstPublicImportedRow: importedRowsInPublicDirectory[0]
      ? {
          id: importedRowsInPublicDirectory[0].id,
          name: importedRowsInPublicDirectory[0].name,
          institutionName: importedRowsInPublicDirectory[0].institutionName,
          specialtyName: importedRowsInPublicDirectory[0].specialtyName,
          residentsCount: importedRowsInPublicDirectory[0].residentsCount,
          seniorPhysiciansCount: importedRowsInPublicDirectory[0].seniorPhysiciansCount,
          estimatedPublicationsCount:
            importedRowsInPublicDirectory[0].estimatedPublicationsCount
        }
      : null,
    detailSample: detail
      ? {
          id: detail.id,
          name: detail.name,
          institutionName: detail.institution.name,
          specialtyName: detail.specialty.name,
          departmentMetrics: detail.metrics.length,
          departmentYearlyMetrics: detail.yearlyMetrics.length,
          specialtyMetrics: detail.specialty.metrics.length,
          specialtyYearlyMetrics: detail.specialty.yearlyMetrics.length,
          heads: detail.heads.length,
          hasDescription: Boolean(detail.about),
          hasContact: Boolean(
            detail.contactName || detail.publicContactEmail || detail.publicContactPhone
          ),
          researchMetrics: detail.researchMetrics.length,
          hasSource: Boolean(detail.dataSourceNotes || detail.dataLastUpdated)
        }
      : null
  };

  console.log(JSON.stringify(result, null, 2));

  if (importedDepartments > 0 && importedRowsInPublicDirectory.length === 0) {
    throw new Error("Public directory query did not return imported departments.");
  }

  if (sampleImportedDepartment && !detail) {
    throw new Error("Public detail query did not return the imported sample department.");
  }

  if (detail && (!detail.about || (detail.heads.length === 0 && !detail.contactName && !detail.publicContactEmail && !detail.publicContactPhone))) {
    throw new Error("Imported detail sample is missing description or head/contact fields.");
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
