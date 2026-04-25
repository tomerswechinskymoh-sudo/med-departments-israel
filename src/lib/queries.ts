import {
  ContentStatus,
  OpportunityStatus,
  OpeningApplicationStatus,
  OpeningType,
  Prisma,
  ReviewSourceType,
  RoleKey,
  SubmissionStatus
} from "@prisma/client";
import {
  APPLICATION_STATUS_LABELS,
  OPENING_TYPE_LABELS
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { average } from "@/lib/utils";
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
  slug: string;
  name: string;
  institution: {
    slug: string;
  };
  specialty: {
    slug: string;
  };
}) {
  return resolveCanonicalDepartmentSlug({
    institutionSlug: input.institution.slug,
    specialtySlug: input.specialty.slug,
    departmentName: input.name
  });
}

function getDepartmentSlugVariants(slug: string) {
  const decodedSlug = decodeURIComponent(slug).trim().replace(/^\/+|\/+$/g, "");
  const normalizedHyphenSlug = decodedSlug.replace(/-+/g, "-");

  return Array.from(new Set([decodedSlug, normalizedHyphenSlug])).filter(Boolean);
}

export async function resolveDepartmentBySlugOrFallback(
  slug: string,
  departmentId?: string | null
) {
  const slugVariants = getDepartmentSlugVariants(slug);

  const departmentCandidates = await prisma.department.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      institution: {
        select: {
          slug: true
        }
      },
      specialty: {
        select: {
          slug: true
        }
      }
    }
  });

  const matchedDepartment = departmentCandidates.find((department) => {
    const canonicalSlug = canonicalDepartmentSlugForRecord(department);

    return slugVariants.some(
      (variant) => variant === department.slug || variant === canonicalSlug
    );
  });

  if (!matchedDepartment) {
    if (!departmentId) {
      return null;
    }

    const departmentById = await prisma.department.findUnique({
      where: {
        id: departmentId
      },
      select: {
        id: true,
        slug: true,
        name: true,
        institution: {
          select: {
            slug: true
          }
        },
        specialty: {
          select: {
            slug: true
          }
        }
      }
    });

    if (!departmentById) {
      return null;
    }

    return {
      ...departmentById,
      slug: canonicalDepartmentSlugForRecord(departmentById)
    };
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
          contentStatus: ContentStatus.PUBLISHED
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
        prisma.institution.count(),
        prisma.department.count(),
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
      name: department.name,
      institutionName: department.institution.name,
      city: department.institution.city,
      coverImageUrl: department.coverImageUrl ?? department.institution.coverImageUrl,
      specialtyName: department.specialty.name,
      shortSummary: department.shortSummary,
      reviewCount: department.reviews.length,
      averageOverall: average(department.reviews.map((review) => review.overallRecommendation)),
      hasResearch: department.researchOpportunities.length > 0,
      hasOpenResidency: department.residencyOpenings.length > 0
    })),
    latestReviews: latestReviews.map((review) => ({
      ...review,
      department: {
        ...review.department,
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
  const [institutions, specialties] = await Promise.all([
    prisma.institution.findMany({
      select: {
        id: true,
        name: true,
        type: true
      },
      orderBy: {
        name: "asc"
      }
    }),
    prisma.specialty.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: "asc"
      }
    })
  ]);

  return { institutions, specialties };
}

export async function getDirectoryData(
  filters: {
    search?: string;
    institutions?: string[];
    specialties?: string[];
    prioritizeOpenings?: boolean;
    prioritizeCommittee?: boolean;
    researchPriority?: number;
    electivePriority?: number;
    lifestylePriority?: number;
    teachingPriority?: number;
    seniorsPriority?: number;
    clinicalPriority?: number;
  },
  userId?: string
) {
  const departments = await prisma.department.findMany({
    where: {
      AND: [
        filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { shortSummary: { contains: filters.search, mode: "insensitive" } },
                { institution: { name: { contains: filters.search, mode: "insensitive" } } },
                { specialty: { name: { contains: filters.search, mode: "insensitive" } } }
              ]
            }
          : {},
        filters.institutions?.length
          ? {
              OR: filters.institutions.map((institutionId) => ({
                institutionId
              }))
            }
          : {},
        filters.specialties?.length
          ? {
              OR: filters.specialties.map((specialtyId) => ({
                specialtyId
              }))
            }
          : {}
      ]
    },
    include: {
      institution: true,
      specialty: true,
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

  const rankedDepartments = departments.map((department) => {
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
      name: department.name,
      institutionName: department.institution.name,
      institutionType: department.institution.type,
      city: department.institution.city,
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
      hasResearch: department.researchOpportunities.length > 0,
      isFavorite: Array.isArray(department.favorites) && department.favorites.length > 0,
      rankingScore
    };
  });

  return rankedDepartments.sort((left, right) => {
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
      specialty: true,
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
      }
    }
  });

  if (!department) {
    return null;
  }

  return {
    ...department,
    slug: canonicalDepartmentSlugForRecord(department),
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
      overallRecommendation: average(
        department.reviews.map((review) => review.overallRecommendation)
      )
    }
  };
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
    name: favorite.department.name,
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
    pendingReviewSubmissions,
    pendingDepartmentChangeRequests,
    pendingOpeningApprovals,
    recentOpeningApplications,
    users,
    representativeUsers,
    departments,
    institutions,
    specialties,
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
      })
    ]),
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
      pendingOpeningApplications: stats[5]
    },
    pendingReviewSubmissions,
    pendingDepartmentChangeRequests,
    pendingOpeningApprovals,
    recentOpeningApplications,
    users,
    representativeUsers,
    departments,
    institutions,
    specialties,
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
