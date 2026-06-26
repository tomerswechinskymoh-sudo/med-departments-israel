import { getDepartmentPageData, getDirectoryData, hasDisplayableResidentCount } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

const ACTIVE_RESIDENTS_METRIC_KEYS = [
  "מספר_מתמחים",
  "residentsCount",
  "activeResidentsCount"
];

async function main() {
  const zeroDepartment = await prisma.department.findFirst({
    where: {
      importStableKey: {
        not: null
      },
      OR: [
        {
          residentsCount: 0
        },
        {
          metrics: {
            some: {
              metricKey: {
                in: ACTIVE_RESIDENTS_METRIC_KEYS
              },
              value: 0
            }
          }
        }
      ]
    },
    include: {
      institution: {
        select: {
          name: true
        }
      },
      specialty: {
        select: {
          id: true,
          name: true
        }
      },
      metrics: {
        where: {
          metricKey: {
            in: ACTIVE_RESIDENTS_METRIC_KEYS
          }
        },
        select: {
          metricKey: true,
          value: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const positiveDepartment = await prisma.department.findFirst({
    where: {
      importStableKey: {
        not: null
      },
      residentsCount: {
        gt: 0
      }
    },
    include: {
      institution: {
        select: {
          name: true
        }
      },
      specialty: {
        select: {
          id: true,
          name: true
        }
      },
      metrics: {
        where: {
          metricKey: {
            in: ACTIVE_RESIDENTS_METRIC_KEYS
          }
        },
        select: {
          metricKey: true,
          value: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const result = {
    zeroResidentDepartment: zeroDepartment
      ? {
          id: zeroDepartment.id,
          slug: zeroDepartment.slug,
          institutionName: zeroDepartment.institution.name,
          specialtyName: zeroDepartment.specialty.name,
          residentsCount: zeroDepartment.residentsCount,
          metricValues: zeroDepartment.metrics
        }
      : null,
    positiveDepartment: positiveDepartment
      ? {
          id: positiveDepartment.id,
          slug: positiveDepartment.slug,
          institutionName: positiveDepartment.institution.name,
          specialtyName: positiveDepartment.specialty.name,
          residentsCount: positiveDepartment.residentsCount,
          metricValues: positiveDepartment.metrics
        }
      : null
  };

  if (zeroDepartment) {
    const directoryRows = await getDirectoryData({
      specialties: [zeroDepartment.specialty.id]
    });
    const leakedDirectoryRow = directoryRows.find(
      (department) =>
        department.id === zeroDepartment.id ||
        department.hrefDepartmentId === zeroDepartment.id ||
        department.favoriteDepartmentId === zeroDepartment.id
    );
    const detail = await getDepartmentPageData(
      zeroDepartment.slug,
      undefined,
      zeroDepartment.id
    );

    Object.assign(result, {
      zeroDirectoryRowsReturned: directoryRows.length,
      zeroLeakedInDirectory: Boolean(leakedDirectoryRow),
      zeroDirectDetailReturned: Boolean(detail),
      zeroHelperDisplayable: hasDisplayableResidentCount(zeroDepartment)
    });

    if (leakedDirectoryRow) {
      throw new Error(`Zero-resident department leaked in directory: ${zeroDepartment.id}`);
    }

    if (detail) {
      throw new Error(`Zero-resident department direct detail returned: ${zeroDepartment.id}`);
    }

    if (hasDisplayableResidentCount(zeroDepartment)) {
      throw new Error(`Zero-resident helper returned displayable: ${zeroDepartment.id}`);
    }
  }

  if (positiveDepartment) {
    const directoryRows = await getDirectoryData({
      specialties: [positiveDepartment.specialty.id]
    });
    const detail = await getDepartmentPageData(
      positiveDepartment.slug,
      undefined,
      positiveDepartment.id
    );

    Object.assign(result, {
      positiveDirectoryRowsReturned: directoryRows.length,
      positiveDirectDetailReturned: Boolean(detail),
      positiveHelperDisplayable: hasDisplayableResidentCount(positiveDepartment)
    });

    if (!detail) {
      throw new Error(`Positive-resident department direct detail missing: ${positiveDepartment.id}`);
    }

    if (!hasDisplayableResidentCount(positiveDepartment)) {
      throw new Error(`Positive-resident helper returned hidden: ${positiveDepartment.id}`);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
