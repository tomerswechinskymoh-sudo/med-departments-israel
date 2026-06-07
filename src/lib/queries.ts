import {
  ContentStatus,
  OpportunityStatus,
  OpeningApplicationStatus,
  OpeningType,
  Prisma,
  ReviewSourceType,
  RoleKey,
  SubmissionStatus,
  UploadedFileCategory,
  VerificationStatus
} from "@prisma/client";
import {
  APPLICATION_STATUS_LABELS,
  OPENING_TYPE_LABELS
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { departmentNewResidentsRowsFromYearlyMetrics } from "@/lib/department-yearly-residents";
import {
  calculateSpecialtyMetrics,
  defaultSpecialtyDashboardMetrics,
  normalizeMetricKeys
} from "@/lib/specialty-metrics";
import type { MetricDisplayMetadata } from "@/lib/metric-display";
import { normalizeDepartmentNameSubDepartment } from "@/lib/department-normalization";
import { resolveImportedMetric } from "@/lib/imported-metric-resolver";
import { getOpenAlexMappingStatus } from "@/lib/server/openalex-research";
import { average, formatDepartmentDisplayName } from "@/lib/utils";
import { resolveCanonicalDepartmentSlug } from "@/server/department-catalog";

const publishedReviewSelect = {
  id: true,
  reviewerType: true,
  displayName: true,
  isAnonymous: true,
  teachingQuality: true,
  workAtmosphere: true,
  seniorsApproachability: true,
  researchExposure: true,
  lifestyleBalance: true,
  overallRecommendation: true,
  pros: true,
  cons: true,
  tips: true,
  publishedAt: true,
  submission: {
    select: {
      roleDetails: true
    }
  }
} satisfies Prisma.ReviewSelect;

const openingCriteriaSelect = {
  researchImportance: true,
  departmentElectiveImportance: true,
  departmentInternshipImportance: true,
  residentSelectionInfluence: true,
  specialistSelectionInfluence: true,
  departmentHeadInfluence: true,
  medicalSchoolInfluence: true,
  recommendationsImportance: true,
  personalFitImportance: true,
  previousDepartmentExperienceImportance: true,
  notes: true,
  whatWeAreLookingFor: true
} satisfies Prisma.OpeningAcceptanceCriteriaSelect;

const publicImportedDepartmentWhere = {
  importStableKey: {
    not: null
  }
} satisfies Prisma.DepartmentWhereInput;

const dataExplanationSelect = {
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
} satisfies Prisma.DataExplanationSelect;

function toMetricDisplayMetadata(
  row: Prisma.DataExplanationGetPayload<{ select: typeof dataExplanationSelect }>
): MetricDisplayMetadata {
  return {
    sheet: row.sheet as MetricDisplayMetadata["sheet"],
    criterion: row.criterion,
    normalizedCriterion: row.normalizedCriterion,
    metricKey: row.metricKey,
    readableLabel: row.readableLabel,
    explanation: row.explanation,
    sourceLabel: row.sourceLabel,
    sourceLinkPolicy: row.sourceLinkPolicy,
    sourceUrl: row.sourceUrl,
    displayAction: row.displayAction,
    displayMode: row.displayMode,
    visualType: row.visualType as MetricDisplayMetadata["visualType"],
    isHidden: row.isHidden,
    isHighlighted: row.isHighlighted,
    isNationalMetric: row.isNationalMetric
  };
}

async function getManagedDepartments(userId: string) {
  const assignments = await prisma.representativeAssignment.findMany({
    where: {
      userId
    },
    select: {
      departmentId: true,
      department: {
        select: {
          institutionId: true
        }
      }
    }
  });

  if (assignments.length === 0) {
    return [];
  }

  return prisma.department.findMany({
    where: {
      id: {
        in: assignments.map((assignment) => assignment.departmentId)
      }
    },
    select: {
      id: true,
      institutionId: true
    }
  });
}

function numberFromRoleDetails(
  roleDetails: Prisma.JsonValue | null | undefined,
  key: string
) {
  if (!roleDetails || typeof roleDetails !== "object" || Array.isArray(roleDetails)) {
    return 0;
  }

  const jsonObject = roleDetails as Record<string, unknown>;
  const value = jsonObject[key];
  return typeof value === "number" ? value : 0;
}

function averageClinicalExposure(
  reviews: Array<{
    submission?: {
      roleDetails: Prisma.JsonValue | null;
    } | null;
  }>
) {
  const numbers = reviews
    .map((review) => numberFromRoleDetails(review.submission?.roleDetails, "clinicalExposure"))
    .filter((value) => value > 0);

  return average(numbers);
}

function canonicalDepartmentSlugForRecord(input: {
  id?: string | null;
  slug: string;
  name: string;
  institution: {
    slug: string;
  };
  specialty: {
    slug: string;
  };
}) {
  const canonicalSlug = resolveCanonicalDepartmentSlug({
    institutionSlug: input.institution.slug,
    specialtySlug: input.specialty.slug,
    departmentName: input.name
  });

  return canonicalSlug || input.slug || (input.id ? `department-${input.id}` : "department");
}

export const ISRAEL_REGIONS = ["מרכז", "צפון", "דרום", "ירושלים", "חיפה"] as const;

function inferRegionFromCity(city?: string | null) {
  if (!city) {
    return "מרכז";
  }

  if (["חיפה"].some((item) => city.includes(item))) {
    return "חיפה";
  }

  if (["ירושלים"].some((item) => city.includes(item))) {
    return "ירושלים";
  }

  if (["באר שבע", "אשקלון", "אילת", "אשדוד"].some((item) => city.includes(item))) {
    return "דרום";
  }

  if (["נתניה", "כפר סבא", "חדרה", "רעננה", "הרצליה"].some((item) => city.includes(item))) {
    return "שרון";
  }

  if (["רחובות", "באר יעקב", "ראשון לציון", "נס ציונה", "רמלה", "לוד", "גדרה"].some((item) => city.includes(item))) {
    return "שפלה";
  }

  if (["נהריה", "צפת", "טבריה", "עפולה", "נצרת"].some((item) => city.includes(item))) {
    return "צפון";
  }

  return "מרכז";
}

function inferRegionFromInstitutionName(name?: string | null) {
  if (!name) {
    return null;
  }

  if (["אסותא אשדוד", "אשדוד", "סורוקה", "ברזילי", "יוספטל", "באר שבע", "אשקלון", "אילת", "עדי נגב"].some((item) => name.includes(item))) {
    return "דרום";
  }

  if (["רמב", "כרמל", "בני ציון", "פלימן", "מעלה הכרמל"].some((item) => name.includes(item))) {
    return "חיפה";
  }

  if (["הדסה", "שערי צדק", "ירושלים", "הרצוג", "כפר שאול", "איתנים"].some((item) => name.includes(item))) {
    return "ירושלים";
  }

  if (["זיו", "גליל", "פוריה", "נצרת", "העמק", "עפולה", "מזור"].some((item) => name.includes(item))) {
    return "צפון";
  }

  return null;
}

export function resolveInstitutionRegion(institution: { name?: string | null; city?: string | null; region?: string | null }) {
  return institution.region ?? inferRegionFromInstitutionName(institution.name) ?? inferRegionFromCity(institution.city);
}

function normalizeHebrewCatalogName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[״"׳']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const DIRECTORY_ARRAY_SPECIALTY_NAMES = new Set(
  [
    "רפואה פנימית",
    "רפואת ילדים",
    "יילוד וגינקולוגיה",
    "כירורגיה כללית"
  ].map(normalizeHebrewCatalogName)
);

export function isRequiredMedicalArraySpecialty(specialtyName: string) {
  const normalizedName = normalizeHebrewCatalogName(specialtyName);

  return (
    DIRECTORY_ARRAY_SPECIALTY_NAMES.has(normalizedName) ||
    normalizedName.includes("פנימית") ||
    normalizedName.includes("ילדים") ||
    normalizedName.includes("יילוד") ||
    normalizedName.includes("גינקולוגיה") ||
    normalizedName.includes("נשים") ||
    normalizedName.includes("כירורגיה כללית")
  );
}

export function requiredMedicalArraySpecialtyDisplayName(specialtyName: string) {
  const normalizedName = normalizeHebrewCatalogName(specialtyName);

  if (normalizedName.includes("פנימית")) {
    return "רפואה פנימית";
  }

  if (normalizedName.includes("ילדים")) {
    return "רפואת ילדים";
  }

  if (
    normalizedName.includes("יילוד") ||
    normalizedName.includes("גינקולוגיה") ||
    normalizedName.includes("נשים")
  ) {
    return "יילוד וגינקולוגיה";
  }

  if (normalizedName.includes("כירורגיה כללית")) {
    return "כירורגיה כללית";
  }

  return specialtyName;
}

function averagePresentNumber(values: Array<number | null | undefined>) {
  const presentValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  if (presentValues.length === 0) {
    return null;
  }

  return presentValues.reduce((sum, value) => sum + value, 0) / presentValues.length;
}

function sumPresentNumber(values: Array<number | null | undefined>) {
  const presentValues = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  return presentValues.length > 0
    ? presentValues.reduce((sum, value) => sum + value, 0)
    : null;
}

function duplicateAwareArrayMetricAverage(
  values: Array<number | null | undefined>,
  denominator: number
) {
  const normalizedValues = values.map((value) =>
    typeof value === "number" && Number.isFinite(value) ? value : null
  );
  const presentValues = normalizedValues.filter((value): value is number => value !== null);
  const total = sumPresentNumber(normalizedValues);

  if (total === null || denominator === 0) {
    return null;
  }

  const duplicatedAcrossAllRows =
    denominator > 1 &&
    presentValues.length === denominator &&
    presentValues.every((value) => Math.abs(value - presentValues[0]) < 0.000001);
  const correctedValue = duplicatedAcrossAllRows ? presentValues[0] : total;

  return Number((correctedValue / denominator).toFixed(1));
}

function getDepartmentSlugVariants(slug: string) {
  const decodedSlug = decodeURIComponent(slug).trim().replace(/^\/+|\/+$/g, "");
  const normalizedHyphenSlug = decodedSlug.replace(/-+/g, "-");

  return Array.from(new Set([decodedSlug, normalizedHyphenSlug])).filter(Boolean);
}

function importedMetricValue(
  metrics: Array<{ metricKey: string; value: number | null; rawValue?: string | null }>,
  ...metricKeys: string[]
) {
  const [fieldOrKey, ...aliases] = metricKeys;
  if (!fieldOrKey) return null;

  const metric = resolveImportedMetric(metrics, fieldOrKey, { aliases });
  return metric?.value ?? null;
}

function externalMetricValue(
  metrics: Array<{ metricKey: string; value: number | null; sourceName?: string | null; approved?: boolean }>,
  sourceName: string,
  ...metricKeys: string[]
) {
  const metric = metrics.find(
    (item) =>
      metricKeys.includes(item.metricKey) &&
      item.sourceName === sourceName &&
      item.approved !== false &&
      typeof item.value === "number" &&
      Number.isFinite(item.value)
  );

  return metric?.value ?? null;
}

function latestYearlyMetricValue(
  metrics: Array<{ metricKey: string; year: number; value: number | null }>,
  metricKey: string,
  options: { beforeYear?: number; year?: number } = {}
) {
  return metrics
    .filter((metric) => metric.metricKey === metricKey && typeof metric.value === "number")
    .filter((metric) => (options.year ? metric.year === options.year : true))
    .filter((metric) => (options.beforeYear ? metric.year < options.beforeYear : true))
    .sort((left, right) => right.year - left.year)[0]?.value ?? null;
}

export async function resolveDepartmentBySlugOrFallback(
  slug: string,
  departmentId?: string | null
) {
  const slugVariants = getDepartmentSlugVariants(slug);
  const departmentSelect = {
    id: true,
    slug: true,
    name: true,
    importStableKey: true,
    institutionId: true,
    specialtyId: true,
    institution: {
      select: {
        slug: true
      }
    },
    specialty: {
      select: {
        name: true,
        slug: true
      }
    }
  } satisfies Prisma.DepartmentSelect;

  async function canonicalForHiddenDepartment(input: {
    id: string;
    institutionId: string;
    specialtyId: string;
    name: string;
    specialty: { name: string; slug: string };
  }) {
    const normalizedSubDepartment = normalizeDepartmentNameSubDepartment(input.name, input.specialty.name);
    const candidates = await prisma.department.findMany({
      where: {
        institutionId: input.institutionId,
        specialtyId: input.specialtyId,
        ...publicImportedDepartmentWhere
      },
      select: {
        ...departmentSelect,
        _count: {
          select: {
            metrics: true,
            yearlyMetrics: true
          }
        }
      }
    });
    const canonical = candidates
      .filter((candidate) =>
        normalizeDepartmentNameSubDepartment(candidate.name, candidate.specialty.name) === normalizedSubDepartment
      )
      .sort((left, right) =>
        (right._count.metrics * 10 + right._count.yearlyMetrics) -
        (left._count.metrics * 10 + left._count.yearlyMetrics)
      )[0];

    if (!canonical || canonical.id === input.id) return null;

    return {
      ...canonical,
      slug: canonicalDepartmentSlugForRecord(canonical)
    };
  }

  if (departmentId) {
    const departmentById = await prisma.department.findFirst({
      where: {
        id: departmentId,
        ...publicImportedDepartmentWhere
      },
      select: departmentSelect
    });

    if (departmentById) {
      return {
        ...departmentById,
        slug: canonicalDepartmentSlugForRecord(departmentById)
      };
    }

    const hiddenDepartmentById = await prisma.department.findUnique({
      where: {
        id: departmentId
      },
      select: departmentSelect
    });

    return hiddenDepartmentById ? canonicalForHiddenDepartment(hiddenDepartmentById) : null;
  }

  const departmentCandidates = await prisma.department.findMany({
    where: publicImportedDepartmentWhere,
    select: departmentSelect
  });

  const matchedDepartment = departmentCandidates.find((department) => {
    const canonicalSlug = canonicalDepartmentSlugForRecord(department);

    return slugVariants.some(
      (variant) => variant === department.slug || variant === canonicalSlug
    );
  });

  if (!matchedDepartment) {
    const hiddenDepartmentBySlug = await prisma.department.findFirst({
      where: {
        importStableKey: null,
        OR: slugVariants.map((variant) => ({ slug: variant }))
      },
      select: departmentSelect
    });

    return hiddenDepartmentBySlug ? canonicalForHiddenDepartment(hiddenDepartmentBySlug) : null;
  }

  return {
    ...matchedDepartment,
    slug: canonicalDepartmentSlugForRecord(matchedDepartment)
  };
}

export async function getHomePageData() {
  const [featuredDepartments, latestReviews, featuredOpenings, latestResearchOpportunities, stats] =
    await Promise.all([
      prisma.department.findMany({
        where: publicImportedDepartmentWhere,
        include: {
          institution: true,
          specialty: true,
          reviews: {
            select: {
              overallRecommendation: true
            }
          },
          researchOpportunities: {
            where: {
              contentStatus: ContentStatus.PUBLISHED
            },
            select: {
              id: true
            }
          },
          residencyOpenings: {
            where: {
              contentStatus: ContentStatus.PUBLISHED,
              status: {
                in: [OpportunityStatus.OPEN, OpportunityStatus.UPCOMING]
              }
            },
            include: {
              acceptanceCriteria: {
                select: openingCriteriaSelect
              }
            }
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 4
      }),
      prisma.review.findMany({
        where: {
          department: {
            is: publicImportedDepartmentWhere
          }
        },
        select: {
          ...publishedReviewSelect,
          department: {
            select: {
              id: true,
              name: true,
              slug: true,
              institution: {
                select: {
                  name: true,
                  slug: true
                }
              },
              specialty: {
                select: {
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        orderBy: {
          publishedAt: "desc"
        },
        take: 4
      }),
      prisma.residencyOpening.findMany({
        where: {
          contentStatus: ContentStatus.PUBLISHED,
          status: {
            in: [OpportunityStatus.OPEN, OpportunityStatus.UPCOMING]
          },
          department: {
            is: publicImportedDepartmentWhere
          }
        },
        include: {
          department: {
            include: {
              institution: true,
              specialty: true
            }
          },
          acceptanceCriteria: {
            select: openingCriteriaSelect
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: [{ isImmediate: "desc" }, { committeeDate: "asc" }, { publishedAt: "desc" }],
        take: 5
      }),
      prisma.researchOpportunity.findMany({
        where: {
          contentStatus: ContentStatus.PUBLISHED,
          department: {
            is: publicImportedDepartmentWhere
          }
        },
        include: {
          department: {
            include: {
              institution: true
            }
          }
        },
        orderBy: {
          publishedAt: "desc"
        },
        take: 4
      }),
      prisma.$transaction([
        prisma.institution.count({
          where: {
            departments: {
              some: publicImportedDepartmentWhere
            }
          }
        }),
        prisma.department.count({
          where: publicImportedDepartmentWhere
        }),
        prisma.review.count(),
        prisma.residencyOpening.count({
          where: {
            contentStatus: ContentStatus.PUBLISHED,
            status: {
              in: [OpportunityStatus.OPEN, OpportunityStatus.UPCOMING]
            }
          }
        })
      ])
    ]);

  return {
    featuredDepartments: featuredDepartments.map((department) => ({
      id: department.id,
      slug: canonicalDepartmentSlugForRecord(department),
      name: formatDepartmentDisplayName(department.name, department.specialty.name),
      institutionName: department.institution.name,
      city: department.institution.city,
      region: resolveInstitutionRegion(department.institution),
      coverImageUrl: department.coverImageUrl ?? department.institution.coverImageUrl,
      specialtyName: department.specialty.name,
      shortSummary: department.shortSummary,
      reviewCount: department.reviews.length,
      averageOverall: average(department.reviews.map((review) => review.overallRecommendation)),
      hasResearch: department.researchOpportunities.length > 0,
      hasOpenResidency: department.residencyOpenings.length > 0,
      residentsCount: department.residentsCount,
      medianResidencyLength: department.medianResidencyLength,
      genderBalance: department.genderBalance,
      educationLocationBreakdown: department.educationLocationBreakdown,
      shlavAlephPassRate: department.shlavAlephPassRate,
      shlavBetPassRate: department.shlavBetPassRate,
      candidatePreferences: department.candidatePreferences
    })),
    latestReviews: latestReviews.map((review) => ({
      ...review,
      department: {
        ...review.department,
        name: formatDepartmentDisplayName(review.department.name, review.department.specialty.name),
        slug: canonicalDepartmentSlugForRecord({
          slug: review.department.slug,
          name: review.department.name,
          institution: {
            slug: review.department.institution.slug
          },
          specialty: {
            slug: review.department.specialty.slug
          }
        })
      }
    })),
    featuredOpenings,
    latestResearchOpportunities,
    stats: {
      institutions: stats[0],
      departments: stats[1],
      publishedReviews: stats[2],
      officialOpenings: stats[3]
    }
  };
}

export async function getDirectoryFilters() {
  const [institutions, specialties, departments] = await Promise.all([
    prisma.institution.findMany({
      where: {
        departments: {
          some: publicImportedDepartmentWhere
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        city: true,
        region: true,
        coverImageUrl: true
      },
      orderBy: {
        name: "asc"
      }
    }),
    prisma.specialty.findMany({
      where: {
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
            departments: {
              some: publicImportedDepartmentWhere
            }
          },
          {
            departments: {
              some: {
                ...publicImportedDepartmentWhere,
                metrics: {
                  some: {}
                }
              }
            }
          },
          {
            departments: {
              some: {
                ...publicImportedDepartmentWhere,
                yearlyMetrics: {
                  some: {}
                }
              }
            }
          }
        ]
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: "asc"
      }
    }),
    prisma.department.findMany({
      where: publicImportedDepartmentWhere,
      select: {
        id: true,
        name: true,
        institution: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverImageUrl: true
          }
        },
        specialty: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
    })
  ]);

  return {
    institutions: institutions.map((institution) => ({
      ...institution,
      region: resolveInstitutionRegion(institution)
    })),
    specialties: Array.from(
      specialties
        .reduce<Map<string, (typeof specialties)[number]>>((unique, specialty) => {
          const normalizedName = normalizeHebrewCatalogName(specialty.name);
          if (!unique.has(normalizedName)) {
            unique.set(normalizedName, specialty);
          }

          return unique;
        }, new Map())
        .values()
    ),
    departments: departments.map((department) => ({
      ...department,
      name: formatDepartmentDisplayName(department.name, department.specialty.name)
    })),
    regions: ISRAEL_REGIONS
  };
}

export async function getDirectoryData(
  filters: {
    search?: string;
    institutions?: string[];
    specialties?: string[];
    regions?: string[];
    institutionTypes?: Array<"HOSPITAL" | "HMO">;
    hasOpenPositions?: boolean;
    hasResearch?: boolean;
    hasReviews?: boolean;
    sort?: "recommended" | "rating" | "reviews" | "openings" | "research";
    prioritizeOpenings?: boolean;
    prioritizeCommittee?: boolean;
    researchPriority?: number;
    electivePriority?: number;
    lifestylePriority?: number;
    teachingPriority?: number;
    seniorsPriority?: number;
    clinicalPriority?: number;
    searchAcrossSpecialties?: boolean;
  },
  userId?: string
) {
  const selectedSpecialtyId = filters.specialties?.[0];

  if (!selectedSpecialtyId && !filters.searchAcrossSpecialties) {
    return [];
  }

  const departments = await prisma.department.findMany({
    where: {
      AND: [
        publicImportedDepartmentWhere,
        filters.institutions?.length
          ? {
              OR: filters.institutions.map((institutionId) => ({
                institutionId
              }))
            }
          : {},
        selectedSpecialtyId && !filters.searchAcrossSpecialties
          ? {
              specialtyId: selectedSpecialtyId
            }
          : {},
        filters.institutionTypes?.length
          ? {
              institution: {
                type: {
                  in: filters.institutionTypes
                }
              }
            }
          : {},
        filters.hasOpenPositions
          ? {
              residencyOpenings: {
                some: {
                  contentStatus: ContentStatus.PUBLISHED,
                  status: {
                    in: [OpportunityStatus.OPEN, OpportunityStatus.UPCOMING]
                  }
                }
              }
            }
          : {},
        filters.hasResearch
          ? {
              researchOpportunities: {
                some: {
                  contentStatus: ContentStatus.PUBLISHED
                }
              }
            }
          : {},
        filters.hasReviews
          ? {
              reviews: {
                some: {}
              }
            }
          : {}
      ]
    },
    include: {
      institution: true,
      specialty: true,
      medicalArray: {
        select: {
          id: true,
          slug: true,
          name: true
        }
      },
      reviews: {
        select: publishedReviewSelect
      },
      residencyOpenings: {
        where: {
          contentStatus: ContentStatus.PUBLISHED,
          status: {
            in: [OpportunityStatus.OPEN, OpportunityStatus.UPCOMING]
          }
        },
        select: {
          committeeDate: true,
          acceptanceCriteria: {
            select: {
              researchImportance: true,
              departmentElectiveImportance: true,
              departmentInternshipImportance: true
            }
          }
        }
      },
      researchOpportunities: {
        where: {
          contentStatus: ContentStatus.PUBLISHED
        }
      },
      externalMetrics: {
        where: {
          approved: true
        },
        select: {
          metricKey: true,
          value: true,
          sourceName: true,
          approved: true
        }
      },
      metrics: {
        select: {
          metricKey: true,
          value: true,
          rawValue: true,
          unit: true,
          label: true,
          lastUpdated: true
        }
      },
      yearlyMetrics: {
        select: {
          metricKey: true,
          year: true,
          value: true,
          rawValue: true,
          unit: true
        },
        orderBy: {
          year: "desc"
        }
      },
      researchMetrics: {
        where: {
          source: "OpenAlex",
          needsMapping: false
        },
        select: {
          year: true,
          publicationsCount: true,
          confidenceScore: true,
          isAmbiguous: true
        },
        orderBy: {
          year: "desc"
        },
        take: 1
      },
      favorites: userId
        ? {
            where: {
              userId
            },
            select: {
              userId: true
            }
          }
        : false
    },
    orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
  });

  const searchedDepartments = filters.search
    ? departments.filter((department) => {
        const displayName = formatDepartmentDisplayName(department.name, department.specialty.name);
        const haystack = [
          department.name,
          displayName,
          department.shortSummary,
          department.institution.name,
          department.specialty.name
        ]
          .join(" ")
          .toLocaleLowerCase("he");

        return haystack.includes(filters.search!.toLocaleLowerCase("he"));
      })
    : departments;

  const filteredDepartments = filters.regions?.length
    ? searchedDepartments.filter((department) =>
        filters.regions?.includes(resolveInstitutionRegion(department.institution))
      )
    : searchedDepartments;

  const now = new Date();
  const hasAdvancedRanking = Boolean(
    filters.prioritizeOpenings ||
      filters.prioritizeCommittee ||
      filters.researchPriority ||
      filters.electivePriority ||
      filters.lifestylePriority ||
      filters.teachingPriority ||
      filters.seniorsPriority ||
      filters.clinicalPriority
  );

  const rankedDepartments = filteredDepartments.map((department) => {
    const teachingQuality = average(department.reviews.map((review) => review.teachingQuality));
    const lifestyleBalance = average(department.reviews.map((review) => review.lifestyleBalance));
    const researchExposure = average(department.reviews.map((review) => review.researchExposure));
    const seniorsApproachability = average(
      department.reviews.map((review) => review.seniorsApproachability)
    );
    const averageOverall = average(
      department.reviews.map((review) => review.overallRecommendation)
    );
    const clinicalExposure = averageClinicalExposure(department.reviews);
    const electiveImportance = Math.max(
      ...department.residencyOpenings.map((opening) =>
        Math.max(
          opening.acceptanceCriteria?.departmentElectiveImportance ?? 0,
          opening.acceptanceCriteria?.departmentInternshipImportance ?? 0
        )
      ),
      0
    );
    const hasUpcomingCommittee = department.residencyOpenings.some(
      (opening) => opening.committeeDate && new Date(opening.committeeDate) >= now
    );
    const residentsCount =
      department.residentsCount ??
      importedMetricValue(department.metrics, "residentsCount", "activeResidentsCount");
    const shlavAlephPassRate =
      department.shlavAlephPassRate ??
      importedMetricValue(department.metrics, "boardStageAPassRate", "inherited_boardStageAPassRate");
    const shlavBetPassRate =
      department.shlavBetPassRate ??
      importedMetricValue(department.metrics, "boardStageBPassRate", "inherited_boardStageBPassRate");
    const newResidentsLatest =
      department.newResidentsThisYear ??
      latestYearlyMetricValue(department.yearlyMetrics, "newResidents", { beforeYear: 2026 });
    const departmentNewResidentsYearly = departmentNewResidentsRowsFromYearlyMetrics(
      department.yearlyMetrics
    );
    const expectedOpeningsCount =
      importedMetricValue(department.metrics, "expectedOpenings2026") ??
      latestYearlyMetricValue(department.yearlyMetrics, "newResidents", { year: 2026 });
    const duns100PhysiciansCount =
      importedMetricValue(department.metrics, "duns100PhysiciansCount") ??
      externalMetricValue(department.externalMetrics, "DUNS100", "duns100PhysiciansCount");
    const seniorPhysiciansCount = importedMetricValue(department.metrics, "seniorPhysiciansCount");
    const latestResearchMetric = department.researchMetrics[0] ?? null;
    const hasImportedResearch =
      department.metrics.some((metric) => metric.metricKey === "departmentalPublicationsCount" && metric.value) ||
      Boolean(latestResearchMetric?.publicationsCount);

    const rankingScore =
      (filters.prioritizeOpenings && department.residencyOpenings.length > 0 ? 7 : 0) +
      (filters.prioritizeCommittee && hasUpcomingCommittee ? 6 : 0) +
      (filters.researchPriority ?? 0) * researchExposure +
      (filters.electivePriority ?? 0) * electiveImportance +
      (filters.lifestylePriority ?? 0) * lifestyleBalance +
      (filters.teachingPriority ?? 0) * teachingQuality +
      (filters.seniorsPriority ?? 0) * seniorsApproachability +
      (filters.clinicalPriority ?? 0) * clinicalExposure;

    return {
      id: department.id,
      slug: canonicalDepartmentSlugForRecord(department),
      institutionId: department.institution.id,
      specialtyId: department.specialty.id,
      medicalArrayId: department.medicalArray?.id ?? null,
      medicalArraySlug: department.medicalArray?.slug ?? null,
      name: formatDepartmentDisplayName(department.name, department.specialty.name),
      institutionName: department.institution.name,
      institutionSlug: department.institution.slug,
      institutionCoverImageUrl: department.institution.coverImageUrl,
      institutionType: department.institution.type,
      city: department.institution.city,
      region: resolveInstitutionRegion(department.institution),
      specialtyName: department.specialty.name,
      coverImageUrl: department.coverImageUrl ?? department.institution.coverImageUrl,
      shortSummary: department.shortSummary,
      reviewCount: department.reviews.length,
      averageOverall,
      teachingQuality,
      lifestyleBalance,
      researchExposure,
      seniorsApproachability,
      clinicalExposure,
      hasOpenResidency: department.residencyOpenings.length > 0,
      hasUpcomingCommittee,
      hasResearch: department.researchOpportunities.length > 0 || hasImportedResearch,
      residentsCount,
      newResidentsLatest,
      departmentNewResidentsYearly,
      seniorPhysiciansCount,
      duns100PhysiciansCount,
      expectedOpeningsCount,
      estimatedPublicationsCount: latestResearchMetric?.publicationsCount ?? null,
      estimatedPublicationsYear: latestResearchMetric?.year ?? null,
      shlavAlephPassRate,
      shlavBetPassRate,
      candidatePreferences: department.candidatePreferences,
      sourceNotes: department.dataSourceNotes,
      dataLastUpdated: department.dataLastUpdated,
      isFavorite: Array.isArray(department.favorites) && department.favorites.length > 0,
      rankingScore
    };
  });

  const groupedByHospitalSpecialty = new Map<string, typeof rankedDepartments>();
  for (const department of rankedDepartments) {
    if (!isRequiredMedicalArraySpecialty(department.specialtyName)) {
      continue;
    }

    const groupKey = `${department.institutionId}:${department.specialtyId}`;
    groupedByHospitalSpecialty.set(groupKey, [
      ...(groupedByHospitalSpecialty.get(groupKey) ?? []),
      department
    ]);
  }

  const emittedArrayGroups = new Set<string>();
  type DirectoryCard = (typeof rankedDepartments)[number] & {
    isArrayCard?: boolean;
    arrayDepartmentCount?: number;
    hrefDepartmentId?: string | null;
    favoriteDepartmentId?: string | null;
  };
  const visibleDirectoryCards: DirectoryCard[] = rankedDepartments.flatMap((department): DirectoryCard[] => {
    const groupKey = `${department.institutionId}:${department.specialtyId}`;
    const group = groupedByHospitalSpecialty.get(groupKey);

    if (!group) {
      return [department];
    }

    if (emittedArrayGroups.has(groupKey)) {
      return [];
    }

    emittedArrayGroups.add(groupKey);

    const first = group[0];
    const totalReviewCount = group.reduce((sum, item) => sum + item.reviewCount, 0);
    const weightedOverall =
      totalReviewCount > 0
        ? group.reduce((sum, item) => sum + item.averageOverall * item.reviewCount, 0) / totalReviewCount
        : average(group.map((item) => item.averageOverall));
    const yearKeys = Array.from(
      new Set(
        group.flatMap((item) =>
          item.departmentNewResidentsYearly?.map((row) => row.year) ?? []
        )
      )
    ).sort((left, right) => right - left);
    const averagedYearlyRows = yearKeys
      .map((year) => {
        const value = duplicateAwareArrayMetricAverage(
          group.map((item) => item.departmentNewResidentsYearly?.find((row) => row.year === year)?.value),
          group.length
        );

        return value === null
          ? null
          : {
              year,
              value,
              rawValue: value.toLocaleString("he-IL")
            };
      })
      .filter((row): row is { year: number; value: number; rawValue: string } => Boolean(row));
    const averageResidents = duplicateAwareArrayMetricAverage(
      group.map((item) => item.residentsCount),
      group.length
    );
    const averageSeniorPhysicians = duplicateAwareArrayMetricAverage(
      group.map((item) => item.seniorPhysiciansCount),
      group.length
    );
    const averageExpectedOpenings = duplicateAwareArrayMetricAverage(
      group.map((item) => item.expectedOpeningsCount),
      group.length
    );
    const departmentCountText = group.length === 1 ? "מחלקה אחת" : `${group.length} מחלקות`;
    const arraySpecialtyName = requiredMedicalArraySpecialtyDisplayName(first.specialtyName);

    return [
      {
        ...first,
        id: first.medicalArrayId ? `array-${first.medicalArrayId}` : `array-${groupKey}`,
        slug: first.medicalArraySlug ?? first.slug,
        hrefDepartmentId: first.id,
        favoriteDepartmentId: null,
        name: `מערך ${arraySpecialtyName}`,
        specialtyName: arraySpecialtyName,
        shortSummary: `מערך ${arraySpecialtyName} הכולל ${departmentCountText} בבית החולים ${first.institutionName}.`,
        reviewCount: totalReviewCount,
        averageOverall: weightedOverall,
        teachingQuality: average(group.map((item) => item.teachingQuality)),
        lifestyleBalance: average(group.map((item) => item.lifestyleBalance)),
        researchExposure: average(group.map((item) => item.researchExposure)),
        seniorsApproachability: average(group.map((item) => item.seniorsApproachability)),
        clinicalExposure: average(group.map((item) => item.clinicalExposure)),
        hasOpenResidency: group.some((item) => item.hasOpenResidency),
        hasUpcomingCommittee: group.some((item) => item.hasUpcomingCommittee),
        hasResearch: group.some((item) => item.hasResearch),
        residentsCount: averageResidents,
        departmentNewResidentsYearly: averagedYearlyRows,
        seniorPhysiciansCount: averageSeniorPhysicians,
        duns100PhysiciansCount: sumPresentNumber(group.map((item) => item.duns100PhysiciansCount)),
        expectedOpeningsCount: averageExpectedOpenings,
        estimatedPublicationsCount: sumPresentNumber(group.map((item) => item.estimatedPublicationsCount)),
        isFavorite: false,
        rankingScore: Math.max(...group.map((item) => item.rankingScore)),
        isArrayCard: true,
        arrayDepartmentCount: group.length
      }
    ];
  });

  return visibleDirectoryCards.sort((left, right) => {
    if (filters.sort === "rating" && right.averageOverall !== left.averageOverall) {
      return right.averageOverall - left.averageOverall;
    }

    if (filters.sort === "reviews" && right.reviewCount !== left.reviewCount) {
      return right.reviewCount - left.reviewCount;
    }

    if (filters.sort === "openings" && Number(right.hasOpenResidency) !== Number(left.hasOpenResidency)) {
      return Number(right.hasOpenResidency) - Number(left.hasOpenResidency);
    }

    if (filters.sort === "research" && Number(right.hasResearch) !== Number(left.hasResearch)) {
      return Number(right.hasResearch) - Number(left.hasResearch);
    }

    if (hasAdvancedRanking && right.rankingScore !== left.rankingScore) {
      return right.rankingScore - left.rankingScore;
    }

    if (right.averageOverall !== left.averageOverall) {
      return right.averageOverall - left.averageOverall;
    }

    const institutionCompare = left.institutionName.localeCompare(right.institutionName, "he");
    if (institutionCompare !== 0) {
      return institutionCompare;
    }

    return left.name.localeCompare(right.name, "he");
  });
}

export async function getSpecialtyDashboardMetrics(specialtyId?: string | null) {
  if (!specialtyId) {
    return {
      metrics: [],
      hasConfig: false
    };
  }

  const [config, specialty, departments, dataExplanations] = await Promise.all([
    prisma.specialtyDashboardConfig.findUnique({
      where: {
        specialtyId
      }
    }),
    prisma.specialty.findUnique({
      where: {
        id: specialtyId
      },
      include: {
        metrics: {
          select: {
            metricKey: true,
            label: true,
            value: true,
            rawValue: true,
            unit: true,
            sourceNotes: true,
            lastUpdated: true
          },
          orderBy: {
            metricKey: "asc"
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
          },
          orderBy: [{ year: "asc" }, { metricKey: "asc" }]
        }
      }
    }),
    prisma.department.findMany({
      where: {
        specialtyId,
        ...publicImportedDepartmentWhere
      },
      include: {
        reviews: {
          select: publishedReviewSelect
        },
        researchOpportunities: {
          where: {
            contentStatus: ContentStatus.PUBLISHED
          },
          select: {
            id: true
          }
        },
        externalMetrics: {
          where: {
            approved: true
          },
          select: {
            metricKey: true,
            value: true,
            sourceName: true,
            approved: true,
            updatedAt: true
          }
        },
        metrics: {
          select: {
            metricKey: true,
            value: true,
            rawValue: true,
            label: true,
            unit: true
          }
        },
        yearlyMetrics: {
          select: {
            metricKey: true,
            year: true,
            value: true,
            rawValue: true,
            unit: true
          }
        }
      }
    }),
    prisma.dataExplanation.findMany({
      select: dataExplanationSelect
    })
  ]);

  const enabledMetrics = normalizeMetricKeys(
    config?.enabledMetricsJson,
    defaultSpecialtyDashboardMetrics
  );
  const displayOrder = normalizeMetricKeys(
    config?.displayOrderJson,
    enabledMetrics
  );
  const metricInput = departments.map((department) => {
    const importedExternalMetrics = department.metrics
      .filter((metric) => typeof metric.value === "number" && Number.isFinite(metric.value))
      .map((metric) => ({
        metricKey: metric.metricKey === "residentsCount" ? "activeResidentsCount" : metric.metricKey,
        value: metric.value ?? 0,
        sourceName: "MASTER_CSV",
        approved: true
      }));

    return {
      residentsCount:
        department.residentsCount ??
        importedMetricValue(department.metrics, "residentsCount", "activeResidentsCount"),
      medianResidencyLength: department.medianResidencyLength,
      shlavAlephPassRate:
        department.shlavAlephPassRate ??
        importedMetricValue(department.metrics, "boardStageAPassRate", "inherited_boardStageAPassRate"),
      shlavBetPassRate:
        department.shlavBetPassRate ??
        importedMetricValue(department.metrics, "boardStageBPassRate", "inherited_boardStageBPassRate"),
      genderBalance: department.genderBalance,
      educationLocationBreakdown: department.educationLocationBreakdown,
      reviewCount: department.reviews.length,
      averageOverall: average(department.reviews.map((review) => review.overallRecommendation)),
      lifestyleBalance: average(department.reviews.map((review) => review.lifestyleBalance)),
      researchExposure: average(department.reviews.map((review) => review.researchExposure)),
      hasResearch:
        department.researchOpportunities.length > 0 ||
        importedMetricValue(department.metrics, "departmentalPublicationsCount") !== null,
      externalMetrics: [...department.externalMetrics, ...importedExternalMetrics],
      yearlyMetrics: department.yearlyMetrics
    };
  });

  return {
    metrics: calculateSpecialtyMetrics(metricInput, enabledMetrics, displayOrder, {
      specialtyMetrics: specialty?.metrics ?? [],
      specialtyYearlyMetrics: specialty?.yearlyMetrics ?? [],
      dataExplanations: dataExplanations.map(toMetricDisplayMetadata)
    }),
    hasConfig: Boolean(config)
  };
}

export async function getDataExplanations() {
  const rows = await prisma.dataExplanation.findMany({
    select: dataExplanationSelect,
    orderBy: [{ sheet: "asc" }, { criterion: "asc" }]
  });

  return rows.map(toMetricDisplayMetadata);
}

export async function getDepartmentPageData(
  slug: string,
  viewerId?: string,
  departmentId?: string | null
) {
  const matchedDepartment = await resolveDepartmentBySlugOrFallback(slug, departmentId);

  if (!matchedDepartment) {
    return null;
  }

  const department = await prisma.department.findUnique({
    where: {
      id: matchedDepartment.id
    },
    include: {
      institution: true,
      specialty: {
        include: {
          metrics: {
            orderBy: {
              metricKey: "asc"
            }
          },
          yearlyMetrics: {
            orderBy: [{ year: "desc" }, { metricKey: "asc" }]
          }
        }
      },
      heads: {
        orderBy: {
          displayOrder: "asc"
        }
      },
      officialUpdates: {
        where: {
          contentStatus: ContentStatus.PUBLISHED
        },
        orderBy: {
          publishedAt: "desc"
        }
      },
      researchOpportunities: {
        where: {
          contentStatus: ContentStatus.PUBLISHED
        },
        orderBy: {
          publishedAt: "desc"
        }
      },
      residencyOpenings: {
        where: {
          contentStatus: ContentStatus.PUBLISHED
        },
        include: {
          acceptanceCriteria: {
            select: openingCriteriaSelect
          }
        },
        orderBy: [{ isImmediate: "desc" }, { committeeDate: "asc" }, { publishedAt: "desc" }]
      },
      reviews: {
        select: publishedReviewSelect,
        orderBy: {
          publishedAt: "desc"
        }
      },
      favorites: viewerId
        ? {
            where: {
              userId: viewerId
            },
            select: {
              userId: true
            }
          }
        : false,
      representativeAssignments: {
        include: {
          user: {
            include: {
              representativeProfile: true
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      medicalArray: {
        include: {
          departments: {
            include: {
              specialty: true,
              metrics: {
                orderBy: {
                  metricKey: "asc"
                }
              },
              yearlyMetrics: {
                orderBy: [{ year: "desc" }, { metricKey: "asc" }]
              },
              heads: {
                orderBy: {
                  displayOrder: "asc"
                }
              }
            },
            orderBy: {
              name: "asc"
            }
          },
          externalMetrics: {
            where: {
              approved: true
            },
            select: {
              metricKey: true,
              value: true,
              sourceName: true,
              approved: true,
              updatedAt: true
            }
          },
          externalPeople: {
            where: {
              approved: true
            },
            orderBy: [{ rankingYear: "desc" }, { personName: "asc" }],
            select: {
              id: true,
              sourceName: true,
              personName: true,
              roleTitle: true,
              description: true,
              sourceUrl: true,
              rankingYear: true,
              approved: true
            }
          }
        }
      },
      externalMetrics: {
        where: {
          approved: true
        },
        select: {
          metricKey: true,
          value: true,
          sourceName: true,
          approved: true,
          updatedAt: true
        }
      },
      externalPeople: {
        where: {
          approved: true
        },
        orderBy: [{ rankingYear: "desc" }, { personName: "asc" }],
        select: {
          id: true,
          sourceName: true,
          personName: true,
          roleTitle: true,
          description: true,
          sourceUrl: true,
          rankingYear: true,
          approved: true
        }
      },
      metrics: {
        orderBy: {
          metricKey: "asc"
        }
      },
      yearlyMetrics: {
        orderBy: [{ year: "desc" }, { metricKey: "asc" }]
      },
      researchMetrics: {
        where: {
          source: "OpenAlex"
        },
        orderBy: {
          year: "desc"
        },
        take: 5
      }
    }
  });

  if (!department) {
    return null;
  }

  const isRequiredArrayProfile = isRequiredMedicalArraySpecialty(department.specialty.name);
  const [forcedArrayDepartments, fallbackMedicalArray] = await Promise.all([
    isRequiredArrayProfile
      ? prisma.department.findMany({
          where: {
            institutionId: department.institutionId,
            specialtyId: department.specialtyId,
            ...publicImportedDepartmentWhere
          },
          include: {
            specialty: true,
            metrics: {
              orderBy: {
                metricKey: "asc"
              }
            },
            yearlyMetrics: {
              orderBy: [{ year: "desc" }, { metricKey: "asc" }]
            },
            heads: {
              orderBy: {
                displayOrder: "asc"
              }
            }
          },
          orderBy: {
            name: "asc"
          }
        })
      : Promise.resolve(null),
    isRequiredArrayProfile && !department.medicalArray
      ? prisma.medicalArray.findUnique({
          where: {
            hospitalId_specialtyId: {
              hospitalId: department.institutionId,
              specialtyId: department.specialtyId
            }
          },
          include: {
            externalMetrics: {
              where: {
                approved: true
              },
              select: {
                metricKey: true,
                value: true,
                sourceName: true,
                approved: true,
                updatedAt: true
              }
            },
            externalPeople: {
              where: {
                approved: true
              },
              orderBy: [{ rankingYear: "desc" }, { personName: "asc" }],
              select: {
                id: true,
                sourceName: true,
                personName: true,
                roleTitle: true,
                description: true,
                sourceUrl: true,
                rankingYear: true,
                approved: true
              }
            }
          }
        })
      : Promise.resolve(null)
  ]);
  const profileMedicalArray = isRequiredArrayProfile
    ? {
        id: department.medicalArray?.id ?? fallbackMedicalArray?.id ?? `virtual-${department.institutionId}-${department.specialtyId}`,
        hospitalId: department.institutionId,
        specialtyId: department.specialtyId,
        name: department.medicalArray?.name ?? fallbackMedicalArray?.name ?? `מערך ${department.specialty.name} · ${department.institution.name}`,
        slug: department.medicalArray?.slug ?? fallbackMedicalArray?.slug ?? `array-${department.institution.slug}-${department.specialty.slug}`,
        description:
          department.medicalArray?.description ??
          fallbackMedicalArray?.description ??
          `מערך ${department.specialty.name} בבית החולים ${department.institution.name}`,
        recruitedResidentsByYear: department.medicalArray?.recruitedResidentsByYear ?? fallbackMedicalArray?.recruitedResidentsByYear ?? null,
        totalPublicationsCount: department.medicalArray?.totalPublicationsCount ?? fallbackMedicalArray?.totalPublicationsCount ?? null,
        residentPublicationsCount: department.medicalArray?.residentPublicationsCount ?? fallbackMedicalArray?.residentPublicationsCount ?? null,
        publicationYears: department.medicalArray?.publicationYears ?? fallbackMedicalArray?.publicationYears ?? null,
        publicationSourceUrl: department.medicalArray?.publicationSourceUrl ?? fallbackMedicalArray?.publicationSourceUrl ?? null,
        specialistsCount: department.medicalArray?.specialistsCount ?? fallbackMedicalArray?.specialistsCount ?? null,
        createdAt: department.medicalArray?.createdAt ?? fallbackMedicalArray?.createdAt ?? department.createdAt,
        updatedAt: department.medicalArray?.updatedAt ?? fallbackMedicalArray?.updatedAt ?? department.updatedAt,
        departments:
          forcedArrayDepartments && forcedArrayDepartments.length > 0
            ? forcedArrayDepartments
            : department.medicalArray?.departments ?? [],
        externalMetrics: department.medicalArray?.externalMetrics ?? fallbackMedicalArray?.externalMetrics ?? [],
        externalPeople: department.medicalArray?.externalPeople ?? fallbackMedicalArray?.externalPeople ?? []
      }
    : department.medicalArray;

  const siblingDepartmentCount = await prisma.department.count({
    where: {
      institutionId: department.institutionId,
      specialtyId: department.specialtyId,
      ...publicImportedDepartmentWhere
    }
  });

  return {
    ...department,
    specialty: {
      ...department.specialty,
      groupAsArray: isRequiredArrayProfile || department.specialty.groupAsArray
    },
    medicalArray: profileMedicalArray,
    name: formatDepartmentDisplayName(department.name, department.specialty.name),
    slug: canonicalDepartmentSlugForRecord(department),
    siblingDepartmentCount,
    isFavorite: Array.isArray(department.favorites) && department.favorites.length > 0,
    summary: {
      reviewCount: department.reviews.length,
      teachingQuality: average(department.reviews.map((review) => review.teachingQuality)),
      workAtmosphere: average(department.reviews.map((review) => review.workAtmosphere)),
      seniorsApproachability: average(
        department.reviews.map((review) => review.seniorsApproachability)
      ),
      researchExposure: average(department.reviews.map((review) => review.researchExposure)),
      lifestyleBalance: average(department.reviews.map((review) => review.lifestyleBalance)),
      clinicalExposure: averageClinicalExposure(department.reviews),
      overallRecommendation: average(
        department.reviews.map((review) => review.overallRecommendation)
      )
    }
  };
}

export async function getActiveSalaryAssumption() {
  return prisma.salaryAssumption.findFirst({
    where: {
      active: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function getOpeningPageData(openingId: string) {
  const opening = await prisma.residencyOpening.findFirst({
    where: {
      id: openingId,
      contentStatus: ContentStatus.PUBLISHED
    },
    include: {
      department: {
        include: {
          institution: true,
          specialty: true,
          heads: {
            orderBy: {
              displayOrder: "asc"
            }
          }
        }
      },
      acceptanceCriteria: {
        select: openingCriteriaSelect
      },
      _count: {
        select: {
          applications: true
        }
      }
    }
  });

  if (!opening) {
    return null;
  }

  return {
    ...opening,
    department: {
      ...opening.department,
      slug: canonicalDepartmentSlugForRecord(opening.department)
    }
  };
}

export async function getOpeningApplicationPageData(openingId: string) {
  const opening = await prisma.residencyOpening.findFirst({
    where: {
      id: openingId,
      contentStatus: ContentStatus.PUBLISHED,
      status: {
        in: [OpportunityStatus.OPEN, OpportunityStatus.UPCOMING]
      },
      OR: [{ applicationDeadline: null }, { applicationDeadline: { gte: new Date() } }]
    },
    include: {
      department: {
        include: {
          institution: true,
          specialty: true
        }
      },
      acceptanceCriteria: {
        select: openingCriteriaSelect
      }
    }
  });

  if (!opening) {
    return null;
  }

  return {
    ...opening,
    department: {
      ...opening.department,
      slug: canonicalDepartmentSlugForRecord(opening.department)
    }
  };
}

export async function getDepartmentOptions() {
  const departments = await prisma.department.findMany({
    where: publicImportedDepartmentWhere,
    select: {
      id: true,
      slug: true,
      name: true,
      institution: {
        select: {
          id: true,
          name: true,
          type: true,
          slug: true
        }
      },
      specialty: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
  });

  return departments.map((department) => ({
    ...department,
    slug: canonicalDepartmentSlugForRecord(department)
  }));
}

export async function getInstitutionOptions() {
  return prisma.institution.findMany({
    where: {
      departments: {
        some: publicImportedDepartmentWhere
      }
    },
    select: {
      id: true,
      name: true,
      type: true
    },
    orderBy: {
      name: "asc"
    }
  });
}

export async function getUserDashboardData(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      favorites: {
        include: {
          department: {
            include: {
              institution: true,
              specialty: true
            }
          }
        }
      },
      representativeAssignments: {
        include: {
          department: {
            include: {
              institution: true,
              specialty: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      representativeProfile: true
    }
  });

  if (!user) {
    return null;
  }

  return {
    ...user,
    favorites: user.favorites.map((favorite) => ({
      ...favorite,
      department: {
        ...favorite.department,
        slug: canonicalDepartmentSlugForRecord(favorite.department)
      }
    })),
    representativeAssignments: user.representativeAssignments.map((assignment) => ({
      ...assignment,
      department: {
        ...assignment.department,
        slug: canonicalDepartmentSlugForRecord(assignment.department)
      }
    }))
  };
}

export async function getFavoritesData(userId: string) {
  const favorites = await prisma.favoriteDepartment.findMany({
    where: {
      userId
    },
    include: {
      department: {
        include: {
          institution: true,
          specialty: true,
          reviews: {
            select: {
              overallRecommendation: true
            }
          },
          residencyOpenings: {
            where: {
              contentStatus: ContentStatus.PUBLISHED,
              status: {
                in: [OpportunityStatus.OPEN, OpportunityStatus.UPCOMING]
              }
            }
          },
          researchOpportunities: {
            where: {
              contentStatus: ContentStatus.PUBLISHED
            }
          }
        }
      }
    }
  });

  return favorites.map((favorite) => ({
    id: favorite.department.id,
    slug: canonicalDepartmentSlugForRecord(favorite.department),
    name: formatDepartmentDisplayName(favorite.department.name, favorite.department.specialty.name),
    institutionName: favorite.department.institution.name,
    city: favorite.department.institution.city,
    specialtyName: favorite.department.specialty.name,
    coverImageUrl:
      favorite.department.coverImageUrl ?? favorite.department.institution.coverImageUrl,
    shortSummary: favorite.department.shortSummary,
    reviewCount: favorite.department.reviews.length,
    averageOverall: average(
      favorite.department.reviews.map((review) => review.overallRecommendation)
    ),
    hasOpenResidency: favorite.department.residencyOpenings.length > 0,
    hasResearch: favorite.department.researchOpportunities.length > 0,
    isFavorite: true
  }));
}

export async function getRepresentativeDashboardData(
  userId: string
) {
  const departments = await getManagedDepartments(userId);
  const managedDepartmentIds = departments.map((department) => department.id);

  if (managedDepartmentIds.length === 0) {
    return [];
  }

  const departmentsWithContent = await prisma.department.findMany({
    where: {
      id: {
        in: managedDepartmentIds
      }
    },
    include: {
      institution: true,
      specialty: true,
      heads: {
        orderBy: {
          displayOrder: "asc"
        }
      },
      representativeAssignments: {
        include: {
          user: {
            include: {
              representativeProfile: true
            }
          }
        }
      },
      departmentChangeRequests: {
        where: {
          submittedByUserId: userId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 3
      },
      officialUpdates: {
        orderBy: {
          createdAt: "desc"
        }
      },
      researchOpportunities: {
        orderBy: {
          createdAt: "desc"
        }
      },
      residencyOpenings: {
        where: {
          supersedesOpeningId: null
        },
        include: {
          acceptanceCriteria: {
            select: openingCriteriaSelect
          },
          pendingRevisions: {
            where: {
              contentStatus: ContentStatus.PENDING_REVIEW
            },
            select: {
              id: true,
              createdAt: true,
              reviewedAt: true
            },
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          },
          createdBy: {
            select: {
              id: true,
              fullName: true
            }
          },
          applications: {
            select: {
              id: true,
              matchScore: true,
              isTopMatch: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: [{ contentStatus: "asc" }, { status: "asc" }, { committeeDate: "asc" }, { createdAt: "desc" }]
      }
    },
    orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
  });

  return departmentsWithContent.map((department) => ({
    ...department,
    slug: canonicalDepartmentSlugForRecord(department)
  }));
}

export async function getRepresentativeOpeningFormData(
  userId: string,
  openingId?: string
) {
  const managedDepartments = await getManagedDepartments(userId);
  const managedDepartmentIds = managedDepartments.map((department) => department.id);

  const departmentOptions = await prisma.department.findMany({
    where:
      managedDepartmentIds.length > 0
        ? {
            id: {
              in: managedDepartmentIds
            }
          }
        : {
            id: "__none__"
          },
    select: {
      id: true,
      name: true,
      institution: {
        select: {
          name: true
        }
      },
      specialty: {
        select: {
          name: true
        }
      }
    },
    orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
  });

  if (!openingId) {
    return {
      departmentOptions,
      opening: null
    };
  }

  const opening = await prisma.residencyOpening.findUnique({
    where: {
      id: openingId
    },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      },
      department: {
        include: {
          institution: true,
          specialty: true
        }
      },
      acceptanceCriteria: true,
      supersedesOpening: {
        select: {
          id: true,
          title: true,
          departmentId: true
        }
      },
      attachments: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!opening || !managedDepartmentIds.includes(opening.departmentId)) {
    return {
      departmentOptions,
      opening: null
    };
  }

  return {
    departmentOptions,
    opening
  };
}

export async function getOpeningManagementData(
  userId: string,
  openingId: string
) {
  const managedDepartments = await getManagedDepartments(userId);
  const managedDepartmentIds = new Set(managedDepartments.map((department) => department.id));

  const opening = await prisma.residencyOpening.findUnique({
    where: {
      id: openingId
    },
    include: {
      department: {
        include: {
          institution: true,
          specialty: true
        }
      },
      acceptanceCriteria: true,
      supersedesOpening: {
        select: {
          id: true,
          title: true,
          departmentId: true,
          status: true
        }
      },
      attachments: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!opening || !managedDepartmentIds.has(opening.departmentId)) {
    return null;
  }

  const applicationSourceOpeningId = opening.supersedesOpeningId ?? opening.id;
  const applications = await prisma.openingApplication.findMany({
    where: {
      openingId: applicationSourceOpeningId
    },
    include: {
      files: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  applications.sort((left, right) => {
    if (left.isTopMatch !== right.isTopMatch) {
      return left.isTopMatch ? -1 : 1;
    }

    const leftScore = left.matchScore ?? -1;
    const rightScore = right.matchScore ?? -1;

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });

  return {
    ...opening,
    applications
  };
}

export async function getAdminDashboardData() {
  const [
    stats,
    pendingUserVerifications,
    pendingReviewSubmissions,
    pendingDepartmentChangeRequests,
    pendingOpeningApprovals,
    recentOpeningApplications,
    users,
    representativeUsers,
    departments,
    institutions,
    specialties,
    pendingMistakeReports,
    pendingRepresentativeRequests,
    pendingScrapeRevisions,
    specialtyDashboardConfigs,
    dunsImportBatches,
    dataImportJobs,
    masterImportRowLogs,
    researchMetrics,
    openAlexMappingStatus,
    openAlexRunLogs,
    duns100RunLogs,
    crawlerCoverage,
    auditLogs
  ] = await Promise.all([
    prisma.$transaction([
      prisma.user.count(),
      prisma.department.count(),
      prisma.reviewSubmission.count({
        where: {
          status: SubmissionStatus.PENDING_REVIEW
        }
      }),
      prisma.residencyOpening.count({
        where: {
          contentStatus: ContentStatus.PENDING_REVIEW
        }
      }),
      prisma.departmentChangeRequest.count({
        where: {
          status: SubmissionStatus.PENDING_REVIEW
        }
      }),
      prisma.openingApplication.count({
        where: {
          status: {
            in: [OpeningApplicationStatus.SUBMITTED, OpeningApplicationStatus.UNDER_REVIEW]
          }
        }
      }),
      prisma.departmentMistakeReport.count({
        where: {
          status: "OPEN"
        }
      }),
      prisma.departmentRepresentativeRequest.count({
        where: {
          status: "PENDING"
        }
      }),
      prisma.departmentScrapeRevision.count({
        where: {
          status: "PENDING_REVIEW"
        }
      }),
      prisma.user.count({
        where: {
          verificationStatus: VerificationStatus.PENDING_ADMIN_REVIEW
        }
      })
    ]),
    prisma.user.findMany({
      where: {
        verificationStatus: VerificationStatus.PENDING_ADMIN_REVIEW
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        roleStatus: true,
        emailVerified: true,
        verificationStatus: true,
        verificationSubmittedAt: true,
        uploadedFiles: {
          where: {
            category: UploadedFileCategory.USER_VERIFICATION_PROOF
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        }
      },
      orderBy: {
        verificationSubmittedAt: "asc"
      }
    }),
    prisma.reviewSubmission.findMany({
      where: {
        status: SubmissionStatus.PENDING_REVIEW
      },
      include: {
        department: {
          include: {
            institution: true
          }
        },
        verificationFiles: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    prisma.departmentChangeRequest.findMany({
      where: {
        status: SubmissionStatus.PENDING_REVIEW
      },
      include: {
        department: {
          include: {
            institution: true
          }
        },
        submittedBy: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    prisma.residencyOpening.findMany({
      where: {
        contentStatus: ContentStatus.PENDING_REVIEW
      },
      include: {
        department: {
          include: {
            institution: true,
            specialty: true
          }
        },
        createdBy: true,
        acceptanceCriteria: true,
        attachments: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    }),
    prisma.openingApplication.findMany({
      include: {
        files: {
          orderBy: {
            createdAt: "desc"
          }
        },
        opening: {
          include: {
            department: {
              include: {
                institution: true
              }
            }
          }
        }
      },
      orderBy: [{ isTopMatch: "desc" }, { matchScore: "desc" }, { createdAt: "desc" }],
      take: 10
    }),
    prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        roleKey: true,
        isApprovedPublisher: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12
    }),
    prisma.user.findMany({
      where: {
        roleKey: RoleKey.REPRESENTATIVE
      },
      include: {
        representativeProfile: true,
        representativeAssignments: {
          include: {
            department: {
              include: {
                institution: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12
    }),
    prisma.department.findMany({
      include: {
        institution: true,
        specialty: true,
        heads: {
          orderBy: {
            displayOrder: "asc"
          }
        },
        officialUpdates: {
          orderBy: {
            createdAt: "desc"
          }
        },
        researchOpportunities: {
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
    }),
    prisma.institution.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.specialty.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.departmentMistakeReport.findMany({
      where: {
        status: "OPEN"
      },
      include: {
        department: {
          include: {
            institution: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.departmentRepresentativeRequest.findMany({
      where: {
        status: "PENDING"
      },
      include: {
        department: {
          include: {
            institution: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    prisma.departmentScrapeRevision.findMany({
      where: {
        status: "PENDING_REVIEW"
      },
      include: {
        department: {
          include: {
            institution: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    prisma.specialtyDashboardConfig.findMany(),
    prisma.dataImportBatch.findMany({
      include: {
        records: {
          take: 12,
          orderBy: {
            physicianName: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    prisma.dataImportJob.findMany({
      include: {
        batch: {
          include: {
            records: {
              take: 4,
              orderBy: {
                physicianName: "asc"
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 8
    }),
    prisma.dataImportRowLog.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 24
    }),
    prisma.departmentResearchMetric.findMany({
      where: {
        department: {
          importStableKey: {
            not: null
          }
        }
      },
      include: {
        department: {
          include: {
            institution: true,
            specialty: true
          }
        }
      },
      orderBy: {
        lastUpdated: "desc"
      },
      take: 16
    }),
    getOpenAlexMappingStatus(prisma, 16),
    prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: "openalex."
        }
      },
      include: {
        actor: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: "duns100."
        }
      },
      include: {
        actor: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12
    }),
    (async () => {
      const importedWhere = {
        importStableKey: {
          not: null
        }
      } as const;
      const [totalImportedDepartments, dunsCovered, openAlexCovered] = await Promise.all([
        prisma.department.count({
          where: importedWhere
        }),
        prisma.departmentExternalMetric.count({
          where: {
            metricKey: "duns100PhysiciansCount",
            sourceName: "DUNS100",
            approved: true,
            department: {
              is: importedWhere
            }
          }
        }),
        prisma.departmentResearchMetric.findMany({
          where: {
            source: "OpenAlex",
            needsMapping: false,
            publicationsCount: {
              not: null
            },
            department: importedWhere
          },
          distinct: ["departmentId"],
          select: {
            departmentId: true
          }
        })
      ]);

      return {
        totalImportedDepartments,
        duns100Covered: dunsCovered,
        openAlexCovered: openAlexCovered.length
      };
    })(),
    prisma.auditLog.findMany({
      include: {
        actor: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 14
    })
  ]);

  return {
    stats: {
      users: stats[0],
      departments: stats[1],
      pendingReviewSubmissions: stats[2],
      pendingOpeningApprovals: stats[3],
      pendingDepartmentChangeRequests: stats[4],
      pendingOpeningApplications: stats[5],
      pendingMistakeReports: stats[6],
      pendingRepresentativeRequests: stats[7],
      pendingScrapeRevisions: stats[8],
      pendingUserVerifications: stats[9]
    },
    pendingUserVerifications,
    pendingReviewSubmissions,
    pendingDepartmentChangeRequests,
    pendingOpeningApprovals,
    recentOpeningApplications,
    users,
    representativeUsers,
    departments,
    institutions,
    specialties,
    pendingMistakeReports,
    pendingRepresentativeRequests,
    pendingScrapeRevisions,
    specialtyDashboardConfigs,
    dunsImportBatches,
    dataImportJobs,
    masterImportRowLogs,
    researchMetrics,
    openAlexMappingStatus,
    openAlexRunLogs,
    duns100RunLogs,
    crawlerCoverage,
    auditLogs
  };
}

export async function getReviewFormContext(departmentSlug?: string) {
  const departments = await getDepartmentOptions();

  return {
    departments,
    selectedDepartment: departmentSlug
      ? departments.find((department) => department.slug === departmentSlug) ?? null
      : null
  };
}

export async function getDepartmentEditorPageData(departmentId: string) {
  return prisma.department.findUnique({
    where: {
      id: departmentId
    },
    include: {
      institution: true,
      specialty: true,
      heads: {
        orderBy: {
          displayOrder: "asc"
        }
      },
      officialUpdates: {
        orderBy: {
          createdAt: "desc"
        }
      },
      researchOpportunities: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });
}

export async function getPublisherRequestFormContext() {
  const [departments, institutions] = await Promise.all([
    getDepartmentOptions(),
    getInstitutionOptions()
  ]);

  return { departments, institutions };
}

export async function canUserPublishDepartment(userId: string, departmentId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    return false;
  }

  if (user.roleKey !== RoleKey.REPRESENTATIVE) {
    return false;
  }

  const assignment = await prisma.representativeAssignment.findFirst({
    where: {
      userId,
      departmentId
    }
  });

  return Boolean(assignment);
}

export function userRoleLabel(roleKey: RoleKey) {
  switch (roleKey) {
    case RoleKey.ADMIN:
      return "אדמין";
    case RoleKey.REPRESENTATIVE:
      return "נציג/ת מחלקה";
    case RoleKey.RESIDENT:
      return "מתמחה";
    case RoleKey.STUDENT:
    default:
      return "סטודנט/ית / סטאז'ר/ית";
  }
}

export function reviewerTypeLabel(reviewerType: ReviewSourceType) {
  switch (reviewerType) {
    case ReviewSourceType.RESIDENT:
      return "מתמחה";
    case ReviewSourceType.STUDENT:
      return "סטודנט/ית";
    case ReviewSourceType.INTERN:
    default:
      return "סטאז'ר/ית";
  }
}

export function openingTypeLabel(openingType: OpeningType) {
  return OPENING_TYPE_LABELS[openingType];
}

export function openingApplicationStatusLabel(status: OpeningApplicationStatus) {
  return APPLICATION_STATUS_LABELS[status];
}
