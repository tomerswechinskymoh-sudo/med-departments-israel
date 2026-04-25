import {
  ContentStatus,
  InstitutionType,
  OpeningApplicationStatus,
  OpeningType,
  OpportunityStatus,
  PrismaClient,
  ReviewSourceType,
  RoleKey,
  SubmissionStatus
} from "@prisma/client";
import { hashPassword } from "../lib/password";
import {
  buildCatalogDepartmentBlueprints,
  ensureDepartmentPage,
  INSTITUTION_CATALOG,
  SPECIALTY_CATALOG
} from "./department-catalog";

type SeedContext = {
  clearExisting?: boolean;
};

type SeedUser = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  roleKey: RoleKey;
  isApprovedPublisher?: boolean;
};

function reviewRoleDetails(input: {
  medicalSchool: string;
  overallRating: number;
  researchEncouragement: number;
  mainlyTaughtBy: "RESIDENTS" | "SENIORS" | "MIXED";
  clinicalExposure: number;
  fitForWho?: string;
  rotationLength?: string;
  yearOfExperience?: string;
  durationWeeks?: number;
  attitudeFromResidents?: number;
  attitudeFromSeniors?: number;
  workloadBalance?: number;
}) {
  return input;
}

export async function seedDatabase(prisma: PrismaClient, context: SeedContext = {}) {
  if (context.clearExisting !== false) {
    await prisma.reviewReport.deleteMany();
    await prisma.review.deleteMany();
    await prisma.reviewSubmission.deleteMany();
    await prisma.favoriteDepartment.deleteMany();
    await prisma.uploadedFile.deleteMany();
    await prisma.openingApplication.deleteMany();
    await prisma.openingAcceptanceCriteria.deleteMany();
    await prisma.residencyOpening.deleteMany();
    await prisma.departmentChangeRequest.deleteMany();
    await prisma.representativeAssignment.deleteMany();
    await prisma.representativeProfile.deleteMany();
    await prisma.publisherRequest.deleteMany();
    await prisma.officialDepartmentUpdate.deleteMany();
    await prisma.researchOpportunity.deleteMany();
    await prisma.departmentHead.deleteMany();
    await prisma.department.deleteMany();
    await prisma.specialty.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
  }

  await prisma.role.createMany({
    data: [
      {
        key: RoleKey.STUDENT,
        label: "סטודנט / סטאז׳ר",
        description: "קהל היעד הראשי של המוצר: חיפוש, השוואה, מועדפים וחקר מסלולים."
      },
      {
        key: RoleKey.RESIDENT,
        label: "מתמחה",
        description: "יכול/ה לתרום חוויות מהשטח ולעקוב אחרי מחלקות."
      },
      {
        key: RoleKey.REPRESENTATIVE,
        label: "נציג/ת מחלקה",
        description: "חשבון שנפתח על ידי אדמין בלבד ומנוהל לפי שיוך למחלקות."
      },
      {
        key: RoleKey.ADMIN,
        label: "אדמין",
        description: "יצירת נציגים, שיוך מחלקות, אישור תוכן ופיקוח על הרשאות."
      }
    ]
  });

  const usersToCreate: SeedUser[] = [
    {
      email: "admin@example.com",
      password: "Admin123!",
      fullName: "מנהל מערכת",
      phone: "050-1000001",
      roleKey: RoleKey.ADMIN,
      isApprovedPublisher: true
    },
    {
      email: "student@example.com",
      password: "Student123!",
      fullName: "נועה לוי",
      phone: "050-1000002",
      roleKey: RoleKey.STUDENT
    },
    {
      email: "resident@example.com",
      password: "Resident123!",
      fullName: "ד\"ר עמרי שחם",
      phone: "050-1000003",
      roleKey: RoleKey.RESIDENT
    },
    {
      email: "representative@example.com",
      password: "Rep123!",
      fullName: "ד\"ר מאיה כספי",
      phone: "050-1000004",
      roleKey: RoleKey.REPRESENTATIVE,
      isApprovedPublisher: true
    }
  ];

  const createdUsers = await Promise.all(
    usersToCreate.map(async (user) =>
      prisma.user.create({
        data: {
          email: user.email,
          passwordHash: await hashPassword(user.password),
          fullName: user.fullName,
          phone: user.phone,
          roleKey: user.roleKey,
          isApprovedPublisher: user.isApprovedPublisher ?? false
        }
      })
    )
  );

  const userMap = Object.fromEntries(createdUsers.map((user) => [user.email, user]));
  const adminUser = userMap["admin@example.com"];
  const studentUser = userMap["student@example.com"];
  const residentUser = userMap["resident@example.com"];
  const representativeUser = userMap["representative@example.com"];

  await prisma.institution.createMany({
    data: INSTITUTION_CATALOG.map((institution) => ({
      slug: institution.slug,
      name: institution.name,
      type: institution.type,
      city: institution.city,
      summary: institution.summary
    }))
  });

  await prisma.specialty.createMany({
    data: SPECIALTY_CATALOG.map((specialty) => ({
      slug: specialty.slug,
      name: specialty.name,
      description: specialty.description
    }))
  });

  const institutions = await prisma.institution.findMany();
  const specialties = await prisma.specialty.findMany();
  const institutionMap = Object.fromEntries(
    institutions.map((institution) => [institution.slug, institution])
  );
  const specialtyMap = Object.fromEntries(specialties.map((specialty) => [specialty.slug, specialty]));

  for (const blueprint of buildCatalogDepartmentBlueprints()) {
    const institution = institutionMap[blueprint.institutionSlug];
    const specialty = specialtyMap[blueprint.specialtySlug];

    if (!institution || !specialty) {
      throw new Error(`Missing catalog reference for ${blueprint.institutionSlug}:${blueprint.specialtySlug}`);
    }

    await ensureDepartmentPage(prisma, {
      institutionId: institution.id,
      institutionSlug: institution.slug,
      institutionName: institution.name,
      institutionType: institution.type,
      specialtyId: specialty.id,
      specialtySlug: specialty.slug,
      specialtyName: specialty.name,
      departmentName: blueprint.departmentName
    });
  }

  const departments = await prisma.department.findMany({
    include: {
      institution: true,
      specialty: true
    }
  });

  const departmentMap = Object.fromEntries(
    departments.map((department) => [
      `${department.institution.slug}:${department.specialty.slug}:${department.name}`,
      department
    ])
  );

  const shebaInternalMedicine = departmentMap["sheba:internal-medicine:רפואה פנימית"];
  const shebaOncology = departmentMap["sheba:oncology:אונקולוגיה"];
  const sorokaObgyn = departmentMap["soroka:obgyn:יילוד וגינקולוגיה"];
  const wolfsonOrthopedics = departmentMap["wolfson:orthopedic-surgery:כירורגיה אורתופדית"];
  const clalitFamilyMedicine = departmentMap["clalit:family-medicine:רפואת משפחה"];
  const ichilovEmergency = departmentMap["ichilov:emergency-medicine:רפואה דחופה"];

  await prisma.representativeProfile.create({
    data: {
      userId: representativeUser.id,
      title: "רכזת מתמחים וסטודנטים",
      contactDetails: "מענה בימי א'-ה' בשעות 08:00-15:00, עדיף קודם במייל.",
      note: "אחראית על עדכונים רשמיים, ימי חשיפה ותיאום סביב תכנים למחלקות המשויכות."
    }
  });

  await prisma.representativeAssignment.createMany({
    data: [
      {
        userId: representativeUser.id,
        departmentId: shebaInternalMedicine.id,
        createdByUserId: adminUser.id
      },
      {
        userId: representativeUser.id,
        departmentId: clalitFamilyMedicine.id,
        createdByUserId: adminUser.id
      },
      {
        userId: representativeUser.id,
        departmentId: wolfsonOrthopedics.id,
        createdByUserId: adminUser.id
      }
    ]
  });

  await prisma.departmentHead.createMany({
    data: [
      {
        departmentId: shebaInternalMedicine.id,
        name: "יעל רותם",
        title: "פרופ׳",
        role: "מנהלת המחלקה",
        bio: "פנימאית בכירה עם דגש על הוראה קלינית, עבודת צוות ומחקר יישומי.",
        displayOrder: 0
      },
      {
        departmentId: shebaOncology.id,
        name: "נטע ארז",
        title: "פרופ׳",
        role: "מנהלת המחלקה",
        bio: "אונקולוגית בכירה עם דגש על מחקר קליני וליווי לומדים.",
        displayOrder: 0
      },
      {
        departmentId: sorokaObgyn.id,
        name: "אייל שיינר",
        title: "פרופ׳",
        role: "יו״ר החטיבה ומנהל מחלקה",
        bio: "מוביל את החטיבה עם דגש על הוראה, מחקר ורפואת נשים קלינית.",
        displayOrder: 0
      },
      {
        departmentId: wolfsonOrthopedics.id,
        name: "עומר שלו",
        title: "ד\"ר",
        role: "מנהל המחלקה",
        bio: "אורתופד בכיר עם דגש על טראומה, הוראה ליד מיטת המטופל ושילוב לומדים.",
        displayOrder: 0
      },
      {
        departmentId: clalitFamilyMedicine.id,
        name: "קרן מזרחי",
        title: "ד\"ר",
        role: "מנהלת המסלול",
        bio: "אחראית על הדרכה קלינית במסלול רפואת משפחה בקהילה.",
        displayOrder: 0
      }
    ]
  });

  await prisma.department.update({
    where: {
      id: shebaInternalMedicine.id
    },
    data: {
      shortSummary: "מחלקה פנימית עם תשתית הוראה חזקה, צוות נגיש ועמוד בסיסי מלא.",
      about:
        "מחלקת רפואה פנימית בשיבא משלבת קבלות, אשפוז, דיוני בוקר ועבודה קלינית מורכבת. יש מקום טוב ללמידה מסודרת ולשילוב לומדים לאורך היום.",
      practicalInfo:
        "כדאי להגיע עם בסיס טוב בפנימית, אלקטרוליטים וחשיבה מבדלת. בימי עומס מי שמראה יוזמה מקבל יותר מקום להשתלב."
    }
  });

  await prisma.department.update({
    where: {
      id: clalitFamilyMedicine.id
    },
    data: {
      shortSummary: "מסלול קהילתי ברור שמאפשר להבין רצף טיפולי, רפואת משפחה ועבודה במרפאה.",
      about:
        "העמוד הזה מייצג את רפואת המשפחה בכללית כעמוד קהילה מוביל. הוא נועד לתת מקום לשיתופי חוויה, לתוכן רשמי ולהשוואה למסלולים אחרים בקהילה.",
      practicalInfo:
        "במסלול הזה הדגש הוא על רצף טיפולי, follow-up, חשיבה מניעתית והיכרות עם סביבת המרפאה."
    }
  });

  await prisma.researchOpportunity.createMany({
    data: [
      {
        departmentId: shebaOncology.id,
        createdByUserId: representativeUser.id,
        title: "פרויקט מחקר קליני באונקולוגיה",
        summary: "שילוב בנתונים קליניים וחשיפה לדיוני מחקר שוטפים.",
        description:
          "הזדמנות לסטודנטים וסטאז׳רים המעוניינים להיחשף למחקר קליני, כולל ליווי כתיבה ותהליך הצגת תוצאות.",
        contactInfo: "oncology.research@sheba.example",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-10")
      },
      {
        departmentId: clalitFamilyMedicine.id,
        createdByUserId: representativeUser.id,
        title: "שיפור איכות בקהילה",
        summary: "פרויקט סביב רצף טיפולי, מניעה ומדדי איכות במרפאה.",
        description:
          "מתאים למי שמחפש exposure לרפואת משפחה קהילתית ולעבודה סביב איכות ושיפור תהליכים.",
        contactInfo: "family.research@clalit.example",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-11")
      }
    ]
  });

  await prisma.officialDepartmentUpdate.createMany({
    data: [
      {
        departmentId: shebaInternalMedicine.id,
        createdByUserId: representativeUser.id,
        title: "יום חשיפה לפני תחילת הסבב",
        body: "בשבוע הבא יתקיים מפגש היכרות עם סבב הבוקר, הצוות ודרך העבודה במחלקה.",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-12")
      },
      {
        departmentId: clalitFamilyMedicine.id,
        createdByUserId: representativeUser.id,
        title: "מסלול קהילה חדש לסטודנטים",
        body: "המסלול שם דגש על continuity, הדרכה צמודה ודיון סוף יום עם מדריך.",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-08")
      }
    ]
  });

  const publishedOpening = await prisma.residencyOpening.create({
    data: {
      departmentId: clalitFamilyMedicine.id,
      createdByUserId: representativeUser.id,
      title: "משרת התמחות במסלול רפואת משפחה",
      summary: "מסלול קהילה עם ליווי צמוד, רצף טיפולי והיכרות עמוקה עם המרפאה.",
      openingType: OpeningType.COMMUNITY_TRACK,
      isImmediate: true,
      openingsCount: 2,
      topApplicantsToEmail: 5,
      status: OpportunityStatus.OPEN,
      committeeDate: new Date("2026-05-28"),
      applicationDeadline: new Date("2026-05-21"),
      expectedStartDate: new Date("2026-08-15"),
      notes: "מתאים במיוחד למועמדים שמחפשים רצף טיפולי בקהילה.",
      supportingInfo: "אין צורך באלקטיב קודם במסלול, אבל יתרון לעניין מוכח ברפואת קהילה.",
      contentStatus: ContentStatus.PUBLISHED,
      publishedAt: new Date("2026-04-02"),
      acceptanceCriteria: {
        create: {
          researchImportance: 2,
          departmentElectiveImportance: 3,
          departmentInternshipImportance: 4,
          residentSelectionInfluence: 3,
          specialistSelectionInfluence: 4,
          departmentHeadInfluence: 3,
          medicalSchoolInfluence: 2,
          recommendationsImportance: 3,
          personalFitImportance: 5,
          previousDepartmentExperienceImportance: 4,
          notes: "המחלקה מחפשת התאמה אישית, רצף טיפולי ותקשורת טובה.",
          whatWeAreLookingFor:
            "מועמדים עם עניין אמיתי ברפואת משפחה, יכולת עבודה עצמאית ותקשורת טובה עם מטופלים."
        }
      }
    }
  });

  const pendingOpeningApproval = await prisma.residencyOpening.create({
    data: {
      departmentId: wolfsonOrthopedics.id,
      createdByUserId: representativeUser.id,
      title: "תקן עתידי בכירורגיה אורתופדית",
      summary: "תקן שמוגש לאישור עם דגש על חשיפה לטראומה, חדרי ניתוח והדרכה צמודה.",
      openingType: OpeningType.RESIDENCY,
      isImmediate: false,
      openingsCount: 1,
      topApplicantsToEmail: 3,
      status: OpportunityStatus.UPCOMING,
      committeeDate: new Date("2026-07-10"),
      applicationDeadline: new Date("2026-06-30"),
      expectedStartDate: new Date("2026-09-01"),
      notes: "מחכה לאישור אדמין לפני פרסום לציבור.",
      supportingInfo: "מיועד למועמדים שמחפשים שילוב של טראומה, חדרי ניתוח ואחריות קלינית.",
      contentStatus: ContentStatus.PENDING_REVIEW,
      acceptanceCriteria: {
        create: {
          researchImportance: 2,
          departmentElectiveImportance: 4,
          departmentInternshipImportance: 4,
          residentSelectionInfluence: 4,
          specialistSelectionInfluence: 4,
          departmentHeadInfluence: 3,
          medicalSchoolInfluence: 2,
          recommendationsImportance: 3,
          personalFitImportance: 5,
          previousDepartmentExperienceImportance: 4
        }
      }
    }
  });

  const publishedSubmission = await prisma.reviewSubmission.create({
    data: {
      departmentId: shebaInternalMedicine.id,
      reviewerType: ReviewSourceType.STUDENT,
      fullName: "נועה לוי",
      phone: "050-1000002",
      email: "student@example.com",
      isAnonymous: false,
      teachingQuality: 5,
      workAtmosphere: 4,
      seniorsApproachability: 4,
      researchExposure: 3,
      lifestyleBalance: 3,
      overallRecommendation: 5,
      pros: "ההוראה הייתה מסודרת, היה מקום לשאול שאלות והצוות היה נגיש לאורך היום.",
      cons: "בימי עומס צריך ליזום כדי לקבל יותר מקום בהצגות ובקבלות.",
      tips: "להגיע מוכנים לפנימית בסיסית ולהיות אקטיביים מהבוקר.",
      roleDetails: reviewRoleDetails({
        medicalSchool: "אוניברסיטת תל אביב",
        overallRating: 5,
        researchEncouragement: 3,
        mainlyTaughtBy: "MIXED",
        clinicalExposure: 4,
        fitForWho: "מתאים למי שמחפש בסיס פנימי חזק והדרכה מסודרת.",
        rotationLength: "3–4 שבועות",
        yearOfExperience: "2025"
      }),
      consentToContact: true,
      consentToTerms: true,
      consentNoPatientInfo: true,
      status: SubmissionStatus.PUBLISHED,
      reviewedByUserId: adminUser.id,
      reviewedAt: new Date("2026-04-16")
    }
  });

  await prisma.review.create({
    data: {
      departmentId: shebaInternalMedicine.id,
      submissionId: publishedSubmission.id,
      reviewerType: ReviewSourceType.STUDENT,
      displayName: "נועה לוי",
      isAnonymous: false,
      teachingQuality: 5,
      workAtmosphere: 4,
      seniorsApproachability: 4,
      researchExposure: 3,
      lifestyleBalance: 3,
      overallRecommendation: 5,
      pros: publishedSubmission.pros,
      cons: publishedSubmission.cons,
      tips: publishedSubmission.tips,
      publishedAt: new Date("2026-04-16")
    }
  });

  const pendingSubmission = await prisma.reviewSubmission.create({
    data: {
      departmentId: sorokaObgyn.id,
      reviewerType: ReviewSourceType.INTERN,
      fullName: null,
      phone: "050-1000011",
      email: "intern@example.com",
      isAnonymous: true,
      teachingQuality: 4,
      workAtmosphere: 4,
      seniorsApproachability: 4,
      researchExposure: 3,
      lifestyleBalance: 2,
      overallRecommendation: 4,
      pros: "",
      cons: "",
      tips: "",
      roleDetails: reviewRoleDetails({
        medicalSchool: "האוניברסיטה העברית",
        overallRating: 4,
        researchEncouragement: 3,
        mainlyTaughtBy: "MIXED",
        clinicalExposure: 5,
        yearOfExperience: "2026",
        durationWeeks: 4,
        attitudeFromResidents: 4,
        attitudeFromSeniors: 4,
        workloadBalance: 2
      }),
      consentToContact: true,
      consentToTerms: true,
      consentNoPatientInfo: true,
      status: SubmissionStatus.PENDING_REVIEW
    }
  });

  const pendingDepartmentChangeRequest = await prisma.departmentChangeRequest.create({
    data: {
      departmentId: wolfsonOrthopedics.id,
      submittedByUserId: representativeUser.id,
      summary: "עדכון עמוד מחלקה עם ניסוח חדש וראש/ת מחלקה מעודכן/ת",
      payload: {
        departmentId: wolfsonOrthopedics.id,
        shortSummary: "מחלקה אורתופדית פעילה עם חשיפה טובה לטראומה, חדרי ניתוח וסטאז׳.",
        about:
          "מחלקה אורתופדית עם שילוב בין טראומה, חדרי ניתוח, מרפאות ועבודה יום-יומית עם צוות רב-מקצועי.",
        practicalInfo:
          "כדאי להגיע עם היכרות בסיסית עם שברים שכיחים, immobilization ועקרונות pain control.",
        publicContactEmail: "orthopedics@wolfson.example",
        publicContactPhone: "03-5550000",
        heads: [
          {
            name: "עומר שלו",
            title: "ד\"ר",
            role: "מנהל המחלקה",
            bio: "אורתופד בכיר עם דגש על טראומה, הוראה ושילוב לומדים.",
            profileImageUrl: ""
          }
        ],
        officialUpdates: [],
        researchOpportunities: []
      },
      status: SubmissionStatus.PENDING_REVIEW
    }
  });

  const application = await prisma.openingApplication.create({
    data: {
      openingId: publishedOpening.id,
      applicantType: ReviewSourceType.STUDENT,
      fullName: "נועה לוי",
      phone: "050-1000002",
      email: "student@example.com",
      medicalSchool: "אוניברסיטת תל אביב",
      didDepartmentElective: false,
      hasResearch: true,
      researchDetails: "עבודת מחקר קטנה סביב איכות בקהילה.",
      didInternshipThere: false,
      motivationText: "מחפשת מסלול עם רצף טיפולי, ליווי והיכרות עמוקה עם רפואת משפחה.",
      relevantExperience: "סבב קהילה משמעותי והתעניינות בהמשך במסלול משפחה.",
      additionalNotes: "אשמח גם להצטרף ליום חשיפה אם יהיה.",
      status: OpeningApplicationStatus.SUBMITTED
    }
  });

  await prisma.favoriteDepartment.create({
    data: {
      userId: studentUser.id,
      departmentId: ichilovEmergency.id
    }
  });

  await prisma.reviewReport.create({
    data: {
      reviewId: (
        await prisma.review.findUniqueOrThrow({
          where: {
            submissionId: publishedSubmission.id
          }
        })
      ).id,
      reporterUserId: studentUser.id,
      reason: "בדיקת ניסוח",
      details: "רק רציתי לוודא שהניסוח עומד בהנחיות האתר."
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: adminUser.id,
        action: "review_submission.published",
        entityType: "ReviewSubmission",
        entityId: publishedSubmission.id
      },
      {
        actorUserId: null,
        action: "review_submission.created_public",
        entityType: "ReviewSubmission",
        entityId: pendingSubmission.id
      },
      {
        actorUserId: representativeUser.id,
        action: "opening.created",
        entityType: "ResidencyOpening",
        entityId: publishedOpening.id
      },
      {
        actorUserId: representativeUser.id,
        action: "opening.submitted_for_review",
        entityType: "ResidencyOpening",
        entityId: pendingOpeningApproval.id
      },
      {
        actorUserId: representativeUser.id,
        action: "department_change_request.submitted",
        entityType: "DepartmentChangeRequest",
        entityId: pendingDepartmentChangeRequest.id
      },
      {
        actorUserId: null,
        action: "opening_application.submitted",
        entityType: "OpeningApplication",
        entityId: application.id
      },
      {
        actorUserId: adminUser.id,
        action: "admin.representative_created",
        entityType: "User",
        entityId: representativeUser.id
      }
    ]
  });

  return {
    users: {
      admin: adminUser.email,
      student: studentUser.email,
      resident: residentUser.email,
      representative: representativeUser.email
    },
    passwords: {
      admin: "Admin123!",
      student: "Student123!",
      resident: "Resident123!",
      representative: "Rep123!"
    },
    stats: {
      institutions: institutions.length,
      specialties: specialties.length,
      departments: departments.length,
      openings: 2
    },
    representativeAssignments: [
      `${shebaInternalMedicine.institution.name} · ${shebaInternalMedicine.name}`,
      `${clalitFamilyMedicine.institution.name} · ${clalitFamilyMedicine.name}`,
      `${wolfsonOrthopedics.institution.name} · ${wolfsonOrthopedics.name}`
    ]
  };
}
