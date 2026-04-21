import {
  ContentStatus,
  InstitutionType,
  OpeningApplicationStatus,
  OpeningType,
  OpportunityStatus,
  PrismaClient,
  PublisherRequestStatus,
  ReviewSourceType,
  RoleKey,
  SubmissionStatus,
  UploadedFileCategory
} from "@prisma/client";
import { hashPassword } from "../lib/password";

type SeedContext = {
  clearExisting?: boolean;
};

function sampleSvg(label: string, color: string) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <rect width="320" height="320" rx="40" fill="${color}"/>
      <circle cx="160" cy="110" r="54" fill="rgba(255,255,255,0.18)"/>
      <rect x="70" y="190" width="180" height="70" rx="28" fill="rgba(255,255,255,0.16)"/>
      <text x="160" y="300" text-anchor="middle" font-family="Arial" font-size="28" fill="#ffffff">${label}</text>
    </svg>`
  );
}

function sampleTextFile(title: string, body: string) {
  return Buffer.from(`${title}\n\n${body}`, "utf8");
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
        label: "סטודנט/ית או סטאז'ר/ית",
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
        description: "משתמש/ת מאושר/ת עם הרשאת פרסום רשמי מטעם מחלקה או מוסד."
      },
      {
        key: RoleKey.ADMIN,
        label: "אדמין",
        description: "ניהול מלא של מוסדות, מחלקות, פתיחות, הגשות והרשאות."
      }
    ]
  });

  const [adminPasswordHash, studentPasswordHash, residentPasswordHash, representativePasswordHash] =
    await Promise.all([
      hashPassword("Admin123!"),
      hashPassword("Student123!"),
      hashPassword("Resident123!"),
      hashPassword("Rep123!")
    ]);

  const [adminUser, studentUser, residentUser, representativeUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@example.com",
        passwordHash: adminPasswordHash,
        fullName: "מנהל מערכת",
        phone: "050-1000001",
        roleKey: RoleKey.ADMIN,
        isApprovedPublisher: true
      }
    }),
    prisma.user.create({
      data: {
        email: "student@example.com",
        passwordHash: studentPasswordHash,
        fullName: "נועה לוי",
        phone: "050-1000002",
        roleKey: RoleKey.STUDENT
      }
    }),
    prisma.user.create({
      data: {
        email: "resident@example.com",
        passwordHash: residentPasswordHash,
        fullName: "ד\"ר עמרי שחם",
        phone: "050-1000003",
        roleKey: RoleKey.RESIDENT
      }
    }),
    prisma.user.create({
      data: {
        email: "representative@example.com",
        passwordHash: representativePasswordHash,
        fullName: "ד\"ר מאיה כספי",
        phone: "050-1000004",
        roleKey: RoleKey.REPRESENTATIVE,
        isApprovedPublisher: true
      }
    })
  ]);

  const institutionSeed = [
    ["sheba", "שיבא תל השומר", InstitutionType.HOSPITAL, "רמת גן", "מרכז רפואי אקדמי גדול עם הוראה, מחקר ורפואה שלישונית."],
    ["ichilov", "איכילוב", InstitutionType.HOSPITAL, "תל אביב-יפו", "מרכז עירוני עם חשיפה רחבה למקרי קצה, מרפאות ומחקר קליני."],
    ["rambam", "רמב\"ם", InstitutionType.HOSPITAL, "חיפה", "מרכז רפואי מוביל בצפון עם פעילות אקדמית ומחקרית מתקדמת."],
    ["hadassah-ein-kerem", "הדסה עין כרם", InstitutionType.HOSPITAL, "ירושלים", "בית חולים אוניברסיטאי עם סביבה רב-תחומית והכשרה קלינית רחבה."],
    ["hadassah-mount-scopus", "הדסה הר הצופים", InstitutionType.HOSPITAL, "ירושלים", "מרכז רפואי ירושלמי עם שילוב בין רפואה קהילתית, הוראה וסבבים קליניים ממוקדים."],
    ["soroka", "סורוקה", InstitutionType.HOSPITAL, "באר שבע", "מרכז רפואי אזורי גדול עם אחריות קלינית רחבה ואוכלוסייה מגוונת."],
    ["rabin-beilinson", "רבין - בילינסון", InstitutionType.HOSPITAL, "פתח תקווה", "מרכז שלישוני מרכזי עם מחלקות חזקות ופעילות אקדמית ענפה."],
    ["hasharon", "השרון", InstitutionType.HOSPITAL, "פתח תקווה", "בית חולים עם מחלקות פנימיות וכירורגיות וחשיפה טובה לעבודה אזורית במרכז."],
    ["shaare-zedek", "שערי צדק", InstitutionType.HOSPITAL, "ירושלים", "בית חולים עם שילוב בין הוראה, עומס עבודה משמעותי ותרבות צוות מגובשת."],
    ["assuta-ashdod", "אסותא אשדוד", InstitutionType.HOSPITAL, "אשדוד", "מרכז רפואי חדש יחסית עם חיבור בין רפואה דחופה, אשפוז ומקצועות תומכים."],
    ["laniado", "לניאדו", InstitutionType.HOSPITAL, "נתניה", "בית חולים אזורי עם פעילות פנימית, נשים, ילדים ומיון, בסביבה שמאפשרת היכרות קרובה עם הצוות."],
    ["wolfson", "וולפסון", InstitutionType.HOSPITAL, "חולון", "בית חולים אזורי עם חוויית לימוד מגוונת וקרבה לקהילה."],
    ["barzilai", "ברזילי", InstitutionType.HOSPITAL, "אשקלון", "מרכז דרומי עם חשיפה למקרי חירום ולעבודה אזורית מגוונת."],
    ["shamir", "שמיר אסף הרופא", InstitutionType.HOSPITAL, "באר יעקב", "בית חולים גדול במרכז עם מחלקות פנימיות וכירורגיות מגוונות."],
    ["meir", "מאיר", InstitutionType.HOSPITAL, "כפר סבא", "מרכז רפואי עם שילוב מעניין בין מחלקות קהילה, אשפוז וחינוך רפואי."],
    ["carmel", "כרמל", InstitutionType.HOSPITAL, "חיפה", "בית חולים עירוני-אקדמי עם דגש על לימוד מובנה ותרבות צוות."],
    ["kaplan", "קפלן", InstitutionType.HOSPITAL, "רחובות", "מרכז רפואי אזורי עם חשיפה טובה לפנימית, נשים ורפואה דחופה."],
    ["hillel-yaffe", "הלל יפה", InstitutionType.HOSPITAL, "חדרה", "מרכז אזורי עם קצב עבודה טוב ולמידה hands-on."],
    ["emek", "העמק", InstitutionType.HOSPITAL, "עפולה", "בית חולים צפוני עם שילוב מעניין בין רפואה אזורית למקצועות מתפתחים."],
    ["galilee", "המרכז הרפואי לגליל", InstitutionType.HOSPITAL, "נהריה", "מרכז רפואי בצפון עם אחריות אזורית רחבה."],
    ["ziv", "זיו", InstitutionType.HOSPITAL, "צפת", "מרכז רפואי גלילי עם אחריות אזורית ושילוב בין לימוד hands-on לעבודה בקהילה ובאשפוז."],
    ["poria", "פוריה", InstitutionType.HOSPITAL, "טבריה", "מרכז רפואי בצפון-מזרח עם פעילות אזורית רחבה וסבבים מגוונים."],
    ["bnai-zion", "בני ציון", InstitutionType.HOSPITAL, "חיפה", "בית חולים עירוני עם מחלקות קטנות יחסית ותחושת צוות חזקה."],
    ["maayanei-hayeshua", "מעייני הישועה", InstitutionType.HOSPITAL, "בני ברק", "מרכז רפואי עם פעילות אזורית, אווירה קהילתית וחשיפה לעבודה מול אוכלוסיות מגוונות."],
    ["schneider", "שניידר", InstitutionType.HOSPITAL, "פתח תקווה", "מרכז על-אזורי לילדים עם תכנים קליניים ייחודיים."],
    ["yoseftal", "יוספטל", InstitutionType.HOSPITAL, "אילת", "בית חולים אזורי בדרום עם אחריות רחבה וסביבה קומפקטית שמאפשרת היכרות עמוקה עם העבודה היומית."],
    ["clalit", "כללית", InstitutionType.HMO, "ארצי", "מערך קהילה גדול עם מסלולי משפחה, מחקר קהילתי ורפואת קהילה מגוונת."],
    ["maccabi", "מכבי", InstitutionType.HMO, "ארצי", "מערך קהילה רחב עם דגש על רפואת קהילה, חדשנות ותהליכי איכות."],
    ["meuhedet", "מאוחדת", InstitutionType.HMO, "ארצי", "מסגרות קהילה עם הזדמנויות לחשיפה למרפאות רב-תחומיות."],
    ["leumit", "לאומית", InstitutionType.HMO, "ארצי", "מערך קהילה עם היכרות טובה עם מרפאות קהילה ושירותי המשך."]
  ] as const;

  await prisma.institution.createMany({
    data: institutionSeed.map(([slug, name, type, city, summary]) => ({
      slug,
      name,
      type,
      city,
      summary
    }))
  });

  const institutions = await prisma.institution.findMany();
  const institutionMap = Object.fromEntries(institutions.map((institution) => [institution.slug, institution]));

  const specialtySeed = [
    ["internal-medicine", "רפואה פנימית", "חשיבה קלינית, אשפוז, קבלות ומעקב יומיומי."],
    ["cardiology", "קרדיולוגיה", "לב, טיפול נמרץ לב, מרפאות ופרוצדורות."],
    ["general-surgery", "כירורגיה כללית", "מחלקות כירורגיות, חדרי ניתוח ועבודה סביב אשפוז."],
    ["neurology", "נוירולוגיה", "שבץ, EEG, ייעוצים ואשפוז נוירולוגי."],
    ["pediatrics", "רפואת ילדים", "ילדים, תקשורת עם משפחות ואשפוז כללי."],
    ["psychiatry", "פסיכיאטריה", "אשפוז, מרפאות, בריאות הנפש ורב-מקצועיות."],
    ["anesthesiology", "הרדמה", "חדרי ניתוח, כאב, טיפול נמרץ ותהליכי בטיחות."],
    ["obgyn", "נשים ויולדות", "חדרי לידה, גינקולוגיה, מרפאות ואשפוז."],
    ["family-medicine", "רפואת משפחה", "רפואת קהילה, המשכיות טיפול וחשיפה מערכתית."],
    ["emergency-medicine", "רפואה דחופה", "מיון, triage, קצב עבודה מהיר ועבודה רב-תחומית."],
    ["orthopedics", "אורתופדיה", "אשפוז, טראומה, מרפאות וניתוחים."],
    ["ophthalmology", "עיניים", "מרפאות, פרוצדורות וחשיפה מהירה למקרים רבים."],
    ["dermatology", "עור ומין", "מרפאות, אבחון חזותי, טיפולים פרוצדורליים ומעקב."],
    ["ent", "אף אוזן גרון", "מרפאות, ניתוחים, מיון אא\"ג ופרוצדורות."],
    ["radiology", "דימות", "פענוח, אולטרסאונד, CT, MRI ורדיולוגיה התערבותית."],
    ["pathology", "פתולוגיה", "אבחון רקמות, מעבדות והבנה מערכתית של מחלה."],
    ["oncology", "אונקולוגיה", "אשפוז, day care, טיפולים אונקולוגיים ומעקב."],
    ["hematology", "המטולוגיה", "ממאירויות דם, קרישה, עירויים ומעקב מורכב."],
    ["endocrinology", "אנדוקרינולוגיה", "סוכרת, הורמונים, מטבוליזם ומרפאות."],
    ["gastroenterology", "גסטרואנטרולוגיה", "אנדוסקופיות, מחלות מעי, כבד ומרפאות."],
    ["nephrology", "נפרולוגיה", "כליות, דיאליזה, איזון נוזלים והפרעות אלקטרוליטים."],
    ["pulmonology", "רפואת ריאות", "מחלקות, מרפאות, COPD, אסתמה וברונכוסקופיה."],
    ["infectious-diseases", "מחלות זיהומיות", "זיהומים מורכבים, אנטיביוטיקה וייעוצים."],
    ["urology", "אורולוגיה", "מרפאות, ניתוחים, אשפוז ופרוצדורות."],
    ["geriatrics", "גריאטריה", "רפואה למבוגרים, שיקום, מורכבות תפקודית ורב-מקצועיות."],
    ["rehabilitation", "שיקום", "שיקום נוירולוגי, אורתופדי ועבודה רב-תחומית."],
    ["plastic-surgery", "כירורגיה פלסטית", "פרוצדורות, שחזורים וטיפול בפצעים."],
    ["neurosurgery", "נוירוכירורגיה", "חדרי ניתוח, טיפול נמרץ ופרוצדורות מורכבות."],
    ["pediatric-surgery", "כירורגיית ילדים", "ניתוחי ילדים, אשפוז וייעוץ רב-תחומי."],
    ["rheumatology", "ראומטולוגיה", "מחלות אוטואימוניות, מרפאות ואשפוזים מורכבים."],
    ["intensive-care", "טיפול נמרץ", "השגחה הדוקה, חולים מורכבים, הנשמה ותיאום רב-תחומי."],
    ["allergy-immunology", "אלרגיה ואימונולוגיה קלינית", "מרפאות, בירור תגובות חיסון וחשיבה מערכתית."],
    ["clinical-pharmacology", "פרמקולוגיה קלינית", "תרופות, אינטראקציות, ייעוצים ותהליכי בטיחות תרופתית."],
    ["medical-genetics", "גנטיקה רפואית", "ייעוץ גנטי, אבחון מולקולרי ועבודה רב-תחומית."],
    ["occupational-medicine", "רפואה תעסוקתית", "בריאות עובדים, כשירות לעבודה וחשיבה מערכתית."],
    ["preventive-medicine", "רפואה מונעת / בריאות הציבור", "אפידמיולוגיה, מניעה, מערכות בריאות והתערבויות אוכלוסייה."],
    ["nuclear-medicine", "רפואה גרעינית", "הדמיה פונקציונלית, PET-CT ורפואה מותאמת לאבחון וטיפול."],
    ["pain-medicine", "רפואת כאב", "מרפאות כאב, פרוצדורות, תרופות וגישה רב-תחומית."]
  ] as const;

  await prisma.specialty.createMany({
    data: specialtySeed.map(([slug, name, description]) => ({
      slug,
      name,
      description
    }))
  });

  const specialties = await prisma.specialty.findMany();
  const specialtyMap = Object.fromEntries(specialties.map((specialty) => [specialty.slug, specialty]));

  const departments = await Promise.all([
    prisma.department.create({
      data: {
        institutionId: institutionMap.sheba.id,
        specialtyId: specialtyMap.cardiology.id,
        slug: "sheba-cardiology",
        name: "קרדיולוגיה",
        shortSummary: "מחלקה עם הוראה קלינית חזקה, פעילות אקדמית וחשיפה טובה למחקר.",
        about: "מחלקת הקרדיולוגיה בשיבא משלבת אשפוז, יחידות משנה, מרפאות ודיוני מקרה קבועים. סטודנטים וסטאז'רים נחשפים לקצב עבודה גבוה, למצגות בוקר ולתהליך קבלת החלטות סביב מטופלים מורכבים.",
        practicalInfo: "מתאים למי שמחפש/ת שילוב בין קליניקה פנימית, פרוצדורות ודיונים אקדמיים. כדאי להגיע מוכנים/ות לאק\"ג, אי ספיקת לב ו־ACS."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.ichilov.id,
        specialtyId: specialtyMap.neurology.id,
        slug: "ichilov-neurology",
        name: "נוירולוגיה",
        shortSummary: "חשיפה לשבץ, EEG, מרפאות ומחקר תרגומי בסביבה נעימה ללמידה.",
        about: "באיכילוב הנוירולוגיה משלבת אשפוז, ייעוצים ומחקר. הסטודנטים נחשפים לנוירולוגיה דחופה ולדיונים סביב הדמיה, שבץ ונוירולוגיה כללית.",
        practicalInfo: "טוב למי שאוהב/ת דיפרנציאל, נוירואנטומיה ועבודה שמשלבת בדיקה פיזיקלית מדויקת עם פרשנות הדמייתית."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.rambam.id,
        specialtyId: specialtyMap.anesthesiology.id,
        slug: "rambam-anesthesiology",
        name: "הרדמה",
        shortSummary: "מחלקה פרוצדורלית עם חשיפה מצוינת לחדרי ניתוח, pain service ובטיחות מטופל.",
        about: "ההרדמה ברמב\"ם מציעה היכרות עם חדרי ניתוח, טיפול בכאב ועקרונות בטיחות. המסגרת מתאימה לסטאז'רים וסטודנטים שרוצים להבין דינמיקה סביב ניתוחים ותרופות.",
        practicalInfo: "הגעה מוקדמת עוזרת. מומלץ לרענן תרופות בסיסיות, airway management ועקרונות ניטור."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap["hadassah-ein-kerem"].id,
        specialtyId: specialtyMap["internal-medicine"].id,
        slug: "hadassah-internal-medicine",
        name: "פנימית ב'",
        shortSummary: "מחלקה פנימית קלאסית עם חשיבה קלינית טובה ומקום לצמיחה של סטודנטים.",
        about: "המחלקה מתאימה למי שרוצה תשתית פנימית חזקה: קבלות, follow-up, הצגות מקרה ומשוב על עבודת היום-יום. יש סביבה אקדמית יחסית מסודרת.",
        practicalInfo: "מומלץ להגיע עם בסיס טוב בפנימית, גזים, אלקטרוליטים ואבחנה מבדלת."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.soroka.id,
        specialtyId: specialtyMap.pediatrics.id,
        slug: "soroka-pediatrics",
        name: "רפואת ילדים",
        shortSummary: "מחלקה נעימה עם הרבה מקום ללמידה, תקשורת עם משפחות ומקרי ילדים מגוונים.",
        about: "המחלקה משלבת אשפוז יום, מקרים אקוטיים וילדים כרוניים. לסטודנטים יש מקום להצטרף לדיונים ולתרגל הצגות במעטפת תומכת.",
        practicalInfo: "חשוב להגיע רגישים/ות לתקשורת עם הורים וללמוד מראש עקרונות של fluid balance וילדים עם חום."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap["rabin-beilinson"].id,
        specialtyId: specialtyMap["emergency-medicine"].id,
        slug: "rabin-emergency",
        name: "רפואה דחופה",
        shortSummary: "מסגרת דינמית לסטודנטים שאוהבים קצב, triage והחלטות מהירות.",
        about: "במיון של רבין יש קצב גבוה, עבודה מול מגוון התמחויות והרבה הזדמנויות ללמידה סביב הערכת מטופל ראשונית. הסטאז'רים נהנים מחשיפה רחבה למקרים.",
        practicalInfo: "מומלץ להגיע עם גישה פרקטית, יכולת להציג בקצרה והרגל טוב לבניית תוכנית מיון."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap["shaare-zedek"].id,
        specialtyId: specialtyMap.obgyn.id,
        slug: "shaare-zedek-obgyn",
        name: "נשים ויולדות",
        shortSummary: "מחלקה מגוונת עם חדרי לידה, מיון נשים וחשיפה טובה לפרקטיקה יומיומית.",
        about: "המחלקה משלבת לידות, מיון נשים, אשפוז גינקולוגי והכשרה סביב תהליכים מיילדותיים. מתאימה למי שמחפש/ת גם עבודה פרוצדורלית וגם תקשורת רגישה.",
        practicalInfo: "כדאי להגיע עם בסיס בתהליכי לידה, pre-eclampsia ודימומים מוקדמים/מאוחרים."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.clalit.id,
        specialtyId: specialtyMap["family-medicine"].id,
        slug: "clalit-family-medicine",
        name: "רפואת משפחה בקהילה",
        shortSummary: "מסלול קהילתי טוב למי שרוצה להכיר continuity, מניעה ורפואה מערכתית.",
        about: "רפואת המשפחה בכללית מדגישה המשכיות טיפול, קהילה ועבודה רב-תחומית. הסטודנטים נחשפים גם לניהול זמן מרפאתי וגם לרפואה מניעתית.",
        practicalInfo: "מתאים למי שמחפש/ת חוויית קהילה פרקטית וחשיפה למטופל לאורך זמן, לא רק סביב אשפוז."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.maccabi.id,
        specialtyId: specialtyMap.obgyn.id,
        slug: "maccabi-womens-health",
        name: "בריאות האישה בקהילה",
        shortSummary: "מסלול קהילתי עם מרפאות נשים, מעקבים וחשיפה לרצף טיפול בקהילה.",
        about: "המחלקה מתאימה לסטודנטים שרוצים להבין רפואת נשים בקהילה, כולל מעקבי היריון, גינקולוגיה כללית וחיבור לשירותי המשך.",
        practicalInfo: "מומלץ למי שמעניין/ת אותו/ה רצף טיפולי, תכנון המשך בירור ותקשורת אמבולטורית."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.meuhedet.id,
        specialtyId: specialtyMap.psychiatry.id,
        slug: "meuhedet-community-psychiatry",
        name: "פסיכיאטריה בקהילה",
        shortSummary: "חיבור טוב בין פסיכיאטריה אמבולטורית, עבודת צוות והיכרות עם רצף טיפולי.",
        about: "הפעילות כוללת מרפאות, ישיבות צוות, עבודה עם פסיכולוגיה ועו\"ס, והבנה של טיפול לאורך זמן מחוץ לאשפוז.",
        practicalInfo: "בחירה טובה לסטודנטים שמעוניינים/ות בממשק בין קליניקה, שיחה ארוכה ומסגרות טיפול בקהילה."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.wolfson.id,
        specialtyId: specialtyMap.orthopedics.id,
        slug: "wolfson-orthopedics",
        name: "אורתופדיה",
        shortSummary: "מחלקה עם טראומה, חדרי ניתוח וחשיפה מעשית לסטודנטים וסטאז'רים.",
        about: "האורתופדיה בוולפסון משלבת טראומה, חדרי ניתוח, מרפאות ועבודה יומיומית עם צוות רב-מקצועי.",
        practicalInfo: "כדאי להגיע עם היכרות בסיסית עם שברים שכיחים, immobilization ועקרונות pain control."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.shamir.id,
        specialtyId: specialtyMap.oncology.id,
        slug: "shamir-oncology",
        name: "אונקולוגיה",
        shortSummary: "שילוב בין day care, אשפוז, שיחות מורכבות וחשיפה למחקר קליני.",
        about: "האונקולוגיה בשמיר משלבת מרפאות, טיפול סיסטמי, יום טיפולים ושיתופי פעולה אקדמיים.",
        practicalInfo: "מתאים למי שמחפש/ת עבודה קלינית עם הרבה תקשורת, continuity וטיפול ארוך טווח."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap.schneider.id,
        specialtyId: specialtyMap["pediatric-surgery"].id,
        slug: "schneider-pediatric-surgery",
        name: "כירורגיית ילדים",
        shortSummary: "מסלול ייחודי עם חשיפה לעולם הכירורגי בילדים ולעבודה רב-תחומית.",
        about: "במחלקה יש שילוב בין חדרי ניתוח, ייעוצים, אשפוז ותקשורת צמודה עם משפחות ויחידות ילדים נוספות.",
        practicalInfo: "מומלץ להגיע עם סקרנות לפרוצדורות, תקשורת רגישה ויכולת להסתגל לקצב חדר ניתוח."
      }
    }),
    prisma.department.create({
      data: {
        institutionId: institutionMap["assuta-ashdod"].id,
        specialtyId: specialtyMap["general-surgery"].id,
        slug: "assuta-ashdod-general-surgery",
        name: "כירורגיה כללית",
        shortSummary: "מחלקה ניתוחית עם שילוב בין אשפוז, חדרי ניתוח וצוות יחסית נגיש.",
        about: "המחלקה נותנת טעימה טובה של עבודה ניתוחית יומיומית בסביבה יחסית קומפקטית.",
        practicalInfo: "טוב למי שרוצה להיכנס לשגרת בוקר ניתוחית, להכיר מהלך אשפוז ולעמוד מקרוב ליד חדרי ניתוח."
      }
    })
  ]);

  const departmentMap = Object.fromEntries(departments.map((department) => [department.slug, department]));

  await prisma.departmentHead.createMany({
    data: [
      { departmentId: departmentMap["sheba-cardiology"].id, name: "פרופ' יעל רותם", title: "מנהלת המחלקה", bio: "קרדיולוגית בכירה עם דגש על הוראה ומחקר קליני.", displayOrder: 0 },
      { departmentId: departmentMap["ichilov-neurology"].id, name: "ד\"ר נעמה סגל", title: "מנהלת המחלקה", bio: "נוירולוגית בכירה עם עניין בשבץ ונוירולוגיה אקוטית.", displayOrder: 0 },
      { departmentId: departmentMap["rambam-anesthesiology"].id, name: "פרופ' אמיר הדר", title: "מנהל המחלקה", bio: "מוביל תהליכי הוראה, סימולציה ובטיחות בהרדמה.", displayOrder: 0 },
      { departmentId: departmentMap["hadassah-internal-medicine"].id, name: "פרופ' איתן לביא", title: "מנהל המחלקה", bio: "שם דגש על חשיבה קלינית מסודרת ומשוב יומיומי.", displayOrder: 0 },
      { departmentId: departmentMap["soroka-pediatrics"].id, name: "ד\"ר אילן כץ", title: "מנהל המחלקה", bio: "מקדם סביבת למידה תומכת והדרגתית.", displayOrder: 0 },
      { departmentId: departmentMap["rabin-emergency"].id, name: "ד\"ר ליאור ברק", title: "מנהל המיון", bio: "רופא בכיר ברפואה דחופה עם דגש על teaching on the go.", displayOrder: 0 },
      { departmentId: departmentMap["shaare-zedek-obgyn"].id, name: "ד\"ר שני ברקאי", title: "מנהלת המחלקה", bio: "מובילה שילוב בין הוראה קלינית לעבודה עמוסה בחדרי לידה.", displayOrder: 0 },
      { departmentId: departmentMap["clalit-family-medicine"].id, name: "ד\"ר קרן מזרחי", title: "מנהלת המסלול", bio: "אחראית על הדרכה קלינית במסלול רפואת משפחה קהילתית.", displayOrder: 0 },
      { departmentId: departmentMap["maccabi-womens-health"].id, name: "ד\"ר עדי וינברג", title: "מנהלת התחום", bio: "מובילה הכשרה אמבולטורית ורצף טיפולי לנשים.", displayOrder: 0 },
      { departmentId: departmentMap["meuhedet-community-psychiatry"].id, name: "ד\"ר מיכל גפן", title: "מנהלת השירות", bio: "מקדמת גישה רב-מקצועית ולמידה משותפת בקהילה.", displayOrder: 0 },
      { departmentId: departmentMap["wolfson-orthopedics"].id, name: "ד\"ר עומר שלו", title: "מנהל המחלקה", bio: "אורתופד בכיר עם עניין בהוראה ליד מיטת המטופל.", displayOrder: 0 },
      { departmentId: departmentMap["shamir-oncology"].id, name: "פרופ' נטע ארז", title: "מנהלת היחידה", bio: "אונקולוגית בכירה עם דגש על מחקר קליני ושיחות מורכבות.", displayOrder: 0 },
      { departmentId: departmentMap["schneider-pediatric-surgery"].id, name: "ד\"ר רון כספי", title: "מנהל המחלקה", bio: "כירורג ילדים עם ניסיון רב בהדרכה ושילוב לומדים.", displayOrder: 0 },
      { departmentId: departmentMap["assuta-ashdod-general-surgery"].id, name: "ד\"ר גיל הדר", title: "מנהל המחלקה", bio: "מלווה סטאז'רים וסטודנטים בשגרה כירורגית אינטנסיבית.", displayOrder: 0 }
    ]
  });

  await prisma.researchOpportunity.createMany({
    data: [
      {
        departmentId: departmentMap["sheba-cardiology"].id,
        createdByUserId: representativeUser.id,
        title: "פרויקט מחקר קרדיו-וסקולרי לסטודנטים",
        summary: "שילוב בניתוח נתונים ומעקב קליני לאורך הסמסטר.",
        description: "הזדמנות מצוינת לסטודנטים המעוניינים להיחשף למחקר קליני, כולל mentorship ותוצר כתוב.",
        contactInfo: "cardio.research@sheba.example",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-03-25")
      },
      {
        departmentId: departmentMap["ichilov-neurology"].id,
        createdByUserId: representativeUser.id,
        title: "מחקר שבץ ו-EEG",
        summary: "עבודה עם צוות שבץ, איסוף נתונים והשתתפות בדיוני journal club.",
        description: "מיועד לסטודנטים וסטאז'רים עם זמינות לפרויקט מתמשך ועניין בנוירולוגיה אקוטית.",
        contactInfo: "neuro.lab@ichilov.example",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-02")
      },
      {
        departmentId: departmentMap["clalit-family-medicine"].id,
        createdByUserId: representativeUser.id,
        title: "איכות ושיפור תהליכים בקהילה",
        summary: "עבודה סביב נתוני איכות, רצף טיפולי וחוויית מטופל.",
        description: "מתאים למי שמחפש/ת exposure למחקר קהילתי ולפרויקטים שמייצרים impact מערכתי.",
        contactInfo: "family.research@clalit.example",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-10")
      },
      {
        departmentId: departmentMap["shamir-oncology"].id,
        createdByUserId: representativeUser.id,
        title: "מחקר תצפיתי באונקולוגיה",
        summary: "ליווי מאגר מטופלים וניתוח בסיסי של תוצאות טיפול.",
        description: "פרויקט מתאים לסטודנטים וסטאז'רים עם עניין בעבודה ארוכת טווח ובשאלות מחקר קליניות.",
        contactInfo: "oncology.research@shamir.example",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-11")
      }
    ]
  });

  await prisma.officialDepartmentUpdate.createMany({
    data: [
      {
        departmentId: departmentMap["sheba-cardiology"].id,
        createdByUserId: representativeUser.id,
        title: "יום חשיפה לסטודנטים לפני רוטציה",
        body: "ביום חמישי הקרוב יתקיים מפגש היכרות עם סבב הבוקר, צוות המתמחים והאפשרויות למחקר.",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-12")
      },
      {
        departmentId: departmentMap["rambam-anesthesiology"].id,
        createdByUserId: representativeUser.id,
        title: "פתיחת סבב סימולציה חדש",
        body: "המחלקה הוסיפה מפגשי סימולציה חודשיים סביב airway ובטיחות מטופל.",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-04")
      },
      {
        departmentId: departmentMap["clalit-family-medicine"].id,
        createdByUserId: representativeUser.id,
        title: "מסלול חדש לסטודנטים ברפואת קהילה",
        body: "המסלול שם דגש על continuity עם מטופלים, מרפאות בוקר ודיוני סוף יום עם מדריך.",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-08")
      },
      {
        departmentId: departmentMap["wolfson-orthopedics"].id,
        createdByUserId: representativeUser.id,
        title: "שבוע טראומה מרוכז",
        body: "בשבוע הבא יתקיימו הדרכות מרוכזות סביב קבלה ראשונית, קיבועים והצגות קצרות.",
        contentStatus: ContentStatus.PUBLISHED,
        publishedAt: new Date("2026-04-15")
      }
    ]
  });

  const openingOne = await prisma.residencyOpening.create({
    data: {
      departmentId: departmentMap["sheba-cardiology"].id,
      createdByUserId: representativeUser.id,
      title: "תקן התמחות בקרדיולוגיה - קיץ 2026",
      summary: "המחלקה צפויה לגייס שני מתמחים למחזור הקרוב עם דגש על מועמדים בעלי עניין אקדמי.",
      openingType: OpeningType.RESIDENCY,
      isImmediate: true,
      openingsCount: 2,
      status: OpportunityStatus.OPEN,
      committeeDate: new Date("2026-05-18"),
      applicationDeadline: new Date("2026-05-10"),
      expectedStartDate: new Date("2026-08-01"),
      notes: "יום חשיפה יתקיים במהלך מאי. ניתן לפנות בשאלות דרך הנציג/ה הרשמי/ת.",
      supportingInfo: "המשרה מתאימה במיוחד למועמדים שמחפשים שילוב בין עשייה קלינית, לימוד מובנה ומחקר לבבי.",
      contentStatus: ContentStatus.PUBLISHED,
      publishedAt: new Date("2026-04-02"),
      acceptanceCriteria: {
        create: {
          researchImportance: 5,
          departmentElectiveImportance: 4,
          residentSelectionInfluence: 4,
          specialistSelectionInfluence: 3,
          departmentHeadInfluence: 4,
          medicalSchoolInfluence: 2,
          personalFitImportance: 5,
          previousDepartmentExperienceImportance: 4,
          notes: "המחלקה מחפשת מועמדים עם סקרנות אמיתית, מקצועיות ויכולת להשתלב בצוות עמוס."
        }
      }
    }
  });

  const openingTwo = await prisma.residencyOpening.create({
    data: {
      departmentId: departmentMap["ichilov-neurology"].id,
      createdByUserId: representativeUser.id,
      title: "פתיחה עתידית בנוירולוגיה",
      summary: "תקן צפוי להיפתח בסוף השנה, עם דגש על התאמה קלינית ועניין בנוירולוגיה דחופה.",
      openingType: OpeningType.RESIDENCY,
      isImmediate: false,
      openingsCount: 1,
      status: OpportunityStatus.UPCOMING,
      committeeDate: new Date("2026-09-03"),
      applicationDeadline: new Date("2026-08-20"),
      expectedStartDate: new Date("2026-11-01"),
      notes: "אפשר לשלוח התעניינות מוקדמת ולקבל עדכון כשהמועד יתקרב.",
      supportingInfo: "תינתן עדיפות למועמדים שעשו אלקטיב או סטאז' במחלקה, אך זה לא תנאי חובה.",
      contentStatus: ContentStatus.PUBLISHED,
      publishedAt: new Date("2026-04-05"),
      acceptanceCriteria: {
        create: {
          researchImportance: 4,
          departmentElectiveImportance: 5,
          residentSelectionInfluence: 4,
          specialistSelectionInfluence: 4,
          departmentHeadInfluence: 3,
          medicalSchoolInfluence: 2,
          personalFitImportance: 5,
          previousDepartmentExperienceImportance: 5
        }
      }
    }
  });

  const openingThree = await prisma.residencyOpening.create({
    data: {
      departmentId: departmentMap["clalit-family-medicine"].id,
      createdByUserId: representativeUser.id,
      title: "משרת קהילה במסלול רפואת משפחה",
      summary: "מסלול קהילתי עם הדרכה רציפה, רצף טיפולי וחשיפה למרפאות מגוונות.",
      openingType: OpeningType.COMMUNITY_TRACK,
      isImmediate: true,
      openingsCount: 2,
      status: OpportunityStatus.OPEN,
      committeeDate: new Date("2026-05-28"),
      applicationDeadline: new Date("2026-05-21"),
      expectedStartDate: new Date("2026-08-15"),
      notes: "מתאים במיוחד למועמדים המחפשים רצף טיפולי בקהילה ועבודה עם מניעה ותחלואה כרונית.",
      supportingInfo: "אפשר להגיש מועמדות גם אם לא בוצע אלקטיב במחלקה, בתנאי שיש עניין מוכח ברפואת קהילה.",
      contentStatus: ContentStatus.PUBLISHED,
      publishedAt: new Date("2026-03-20"),
      acceptanceCriteria: {
        create: {
          researchImportance: 2,
          departmentElectiveImportance: 3,
          residentSelectionInfluence: 3,
          specialistSelectionInfluence: 4,
          departmentHeadInfluence: 3,
          medicalSchoolInfluence: 2,
          personalFitImportance: 5,
          previousDepartmentExperienceImportance: 4
        }
      }
    }
  });

  const openingFour = await prisma.residencyOpening.create({
    data: {
      departmentId: departmentMap["wolfson-orthopedics"].id,
      createdByUserId: representativeUser.id,
      title: "תקן עתידי באורתופדיה",
      summary: "פתיחה צפויה למחזור הבא עם שילוב בין טראומה, מרפאות וחדרי ניתוח.",
      openingType: OpeningType.RESIDENCY,
      isImmediate: false,
      openingsCount: 1,
      status: OpportunityStatus.UPCOMING,
      committeeDate: new Date("2026-07-07"),
      applicationDeadline: new Date("2026-06-28"),
      expectedStartDate: new Date("2026-09-01"),
      notes: "מומלץ להוסיף פירוט על ניסיון קודם במחלקה או באלקטיבים דומים.",
      supportingInfo: "יש יתרון למועמדים שמגלים רצינות, עבודה בצוות ונוכחות טובה במהלך סבבים קודמים.",
      contentStatus: ContentStatus.PUBLISHED,
      publishedAt: new Date("2026-04-14"),
      acceptanceCriteria: {
        create: {
          researchImportance: 2,
          departmentElectiveImportance: 4,
          residentSelectionInfluence: 5,
          specialistSelectionInfluence: 4,
          departmentHeadInfluence: 4,
          medicalSchoolInfluence: 1,
          personalFitImportance: 5,
          previousDepartmentExperienceImportance: 4
        }
      }
    }
  });

  await prisma.uploadedFile.createMany({
    data: [
      {
        departmentId: openingOne.departmentId,
        openingId: openingOne.id,
        uploadedByUserId: representativeUser.id,
        category: UploadedFileCategory.OPENING_ATTACHMENT,
        isPublic: false,
        originalName: "committee-notes-cardiology.txt",
        mimeType: "text/plain",
        sizeBytes: sampleTextFile("הנחיות ועדה", "הקובץ מיועד לעיון פנימי של המחלקה בלבד.").length,
        bytes: sampleTextFile("הנחיות ועדה", "הקובץ מיועד לעיון פנימי של המחלקה בלבד.")
      },
      {
        departmentId: openingThree.departmentId,
        openingId: openingThree.id,
        uploadedByUserId: representativeUser.id,
        category: UploadedFileCategory.OPENING_ATTACHMENT,
        isPublic: false,
        originalName: "community-track-background.txt",
        mimeType: "text/plain",
        sizeBytes: sampleTextFile("רקע מסלול", "המסמך כולל פרטים פנימיים לרכזי המסלול.").length,
        bytes: sampleTextFile("רקע מסלול", "המסמך כולל פרטים פנימיים לרכזי המסלול.")
      }
    ]
  });

  const [publishedSubmissionOne, publishedSubmissionTwo, publishedSubmissionThree, publishedSubmissionFour, pendingSubmissionOne, pendingSubmissionTwo] =
    await Promise.all([
      prisma.reviewSubmission.create({
        data: {
          departmentId: departmentMap["sheba-cardiology"].id,
          reviewerType: ReviewSourceType.RESIDENT,
          fullName: "ד\"ר א'",
          phone: "050-5551111",
          email: "resident-reviewer@example.com",
          isAnonymous: false,
          teachingQuality: 5,
          workAtmosphere: 4,
          seniorsApproachability: 5,
          researchExposure: 4,
          lifestyleBalance: 3,
          overallRecommendation: 5,
          pros: "יש הוראה שיטתית, יחס זמין לשאלות ותחושה שמכבדים למידה של סטודנטים וסטאז'רים.",
          cons: "העומס היומי מורגש, במיוחד בימים של קבלות ובתקופות עמוסות.",
          tips: "להגיע מוכנים לסבב בוקר ולבקש ownership על מטופל או שניים.",
          consentToContact: true,
          consentToTerms: true,
          consentNoPatientInfo: true,
          status: SubmissionStatus.PUBLISHED,
          reviewedByUserId: adminUser.id,
          reviewedAt: new Date("2026-03-21")
        }
      }),
      prisma.reviewSubmission.create({
        data: {
          departmentId: departmentMap["ichilov-neurology"].id,
          reviewerType: ReviewSourceType.INTERN,
          fullName: "ד\"ר ב'",
          phone: "050-5552222",
          email: "intern-reviewer@example.com",
          isAnonymous: true,
          teachingQuality: 4,
          workAtmosphere: 5,
          seniorsApproachability: 4,
          researchExposure: 4,
          lifestyleBalance: 4,
          overallRecommendation: 4,
          pros: "אווירה נעימה, חשיפה טובה לנוירולוגיה דחופה ומקום אמיתי לשאלות.",
          cons: "בימים עמוסים קשה לקבל פידבק אישי מכל בכיר.",
          tips: "כדאי לעקוב אחרי חולה שבץ כמה ימים רצופים כדי ללמוד את הרצף.",
          consentToContact: true,
          consentToTerms: true,
          consentNoPatientInfo: true,
          status: SubmissionStatus.PUBLISHED,
          reviewedByUserId: adminUser.id,
          reviewedAt: new Date("2026-03-24")
        }
      }),
      prisma.reviewSubmission.create({
        data: {
          departmentId: departmentMap["clalit-family-medicine"].id,
          reviewerType: ReviewSourceType.INTERN,
          fullName: "רותי כהן",
          phone: "050-5553333",
          email: "community-reviewer@example.com",
          isAnonymous: false,
          teachingQuality: 4,
          workAtmosphere: 4,
          seniorsApproachability: 5,
          researchExposure: 3,
          lifestyleBalance: 5,
          overallRecommendation: 4,
          pros: "רצף טיפולי אמיתי, הרבה עצמאות הדרגתית והיכרות עם קהילה.",
          cons: "פחות אקשן אקוטי למי שמחפש/ת אווירת בית חולים.",
          tips: "להיכנס לתיק מראש ולהבין ביקורים חוזרים כדי להפיק מהיום יותר.",
          consentToContact: true,
          consentToTerms: true,
          consentNoPatientInfo: true,
          status: SubmissionStatus.PUBLISHED,
          reviewedByUserId: adminUser.id,
          reviewedAt: new Date("2026-03-28")
        }
      }),
      prisma.reviewSubmission.create({
        data: {
          departmentId: departmentMap["wolfson-orthopedics"].id,
          reviewerType: ReviewSourceType.STUDENT,
          fullName: "יעל דנינו",
          phone: "050-5554444",
          email: "student-experience@example.com",
          isAnonymous: false,
          teachingQuality: 4,
          workAtmosphere: 4,
          seniorsApproachability: 4,
          researchExposure: 2,
          lifestyleBalance: 3,
          overallRecommendation: 4,
          pros: "הייתה פתיחות לתת לסטודנטים לראות טראומה, לשאול שאלות ולהבין מה קורה סביב הניתוחים.",
          cons: "בקצב עמוס קשה לפעמים לקבל הסבר ארוך בזמן אמת.",
          tips: "להגיע מוקדם, להכיר מקרים בסיסיים ולהיות אקטיביים כדי לקבל יותר חשיפה.",
          consentToContact: true,
          consentToTerms: true,
          consentNoPatientInfo: true,
          status: SubmissionStatus.PUBLISHED,
          reviewedByUserId: adminUser.id,
          reviewedAt: new Date("2026-04-01")
        }
      }),
      prisma.reviewSubmission.create({
        data: {
          departmentId: departmentMap["rambam-anesthesiology"].id,
          reviewerType: ReviewSourceType.INTERN,
          phone: "050-5555555",
          email: "pending-review@example.com",
          isAnonymous: true,
          teachingQuality: 4,
          workAtmosphere: 4,
          seniorsApproachability: 4,
          researchExposure: 3,
          lifestyleBalance: 4,
          overallRecommendation: 4,
          pros: "הצוות משתדל לשלב סטודנטים כשיש זמן ונותן הסברים קצרים ליד המיטה או בחדר.",
          cons: "כשהיום עמוס קשה להבין את כל ההקשרים בלי לקרוא מראש.",
          tips: "להגיע עם רקע בתרופות הרדמה בסיסיות כדי להבין טוב יותר מה קורה.",
          consentToContact: true,
          consentToTerms: true,
          consentNoPatientInfo: true,
          status: SubmissionStatus.PENDING_REVIEW
        }
      }),
      prisma.reviewSubmission.create({
        data: {
          departmentId: departmentMap["assuta-ashdod-general-surgery"].id,
          reviewerType: ReviewSourceType.STUDENT,
          fullName: "סטודנט/ית א'",
          phone: "050-5556666",
          isAnonymous: true,
          teachingQuality: 3,
          workAtmosphere: 4,
          seniorsApproachability: 3,
          researchExposure: 2,
          lifestyleBalance: 3,
          overallRecommendation: 4,
          pros: "היה קל יחסית להרגיש חלק מהיום במחלקה והצוות היה נגיש לשאלות קצרות.",
          cons: "לא תמיד היה זמן להסברים עמוקים סביב החלטות ניתוחיות.",
          tips: "שווה להגיע עם הכנה בסיסית על common acute abdomen כדי להפיק יותר מהיום.",
          consentToContact: true,
          consentToTerms: true,
          consentNoPatientInfo: true,
          status: SubmissionStatus.PENDING_REVIEW
        }
      })
    ]);

  await prisma.review.createMany({
    data: [
      {
        departmentId: departmentMap["sheba-cardiology"].id,
        submissionId: publishedSubmissionOne.id,
        reviewerType: publishedSubmissionOne.reviewerType,
        displayName: publishedSubmissionOne.fullName,
        isAnonymous: publishedSubmissionOne.isAnonymous,
        teachingQuality: publishedSubmissionOne.teachingQuality,
        workAtmosphere: publishedSubmissionOne.workAtmosphere,
        seniorsApproachability: publishedSubmissionOne.seniorsApproachability,
        researchExposure: publishedSubmissionOne.researchExposure,
        lifestyleBalance: publishedSubmissionOne.lifestyleBalance,
        overallRecommendation: publishedSubmissionOne.overallRecommendation,
        pros: publishedSubmissionOne.pros,
        cons: publishedSubmissionOne.cons,
        tips: publishedSubmissionOne.tips,
        publishedAt: new Date("2026-03-21")
      },
      {
        departmentId: departmentMap["ichilov-neurology"].id,
        submissionId: publishedSubmissionTwo.id,
        reviewerType: publishedSubmissionTwo.reviewerType,
        displayName: null,
        isAnonymous: publishedSubmissionTwo.isAnonymous,
        teachingQuality: publishedSubmissionTwo.teachingQuality,
        workAtmosphere: publishedSubmissionTwo.workAtmosphere,
        seniorsApproachability: publishedSubmissionTwo.seniorsApproachability,
        researchExposure: publishedSubmissionTwo.researchExposure,
        lifestyleBalance: publishedSubmissionTwo.lifestyleBalance,
        overallRecommendation: publishedSubmissionTwo.overallRecommendation,
        pros: publishedSubmissionTwo.pros,
        cons: publishedSubmissionTwo.cons,
        tips: publishedSubmissionTwo.tips,
        publishedAt: new Date("2026-03-24")
      },
      {
        departmentId: departmentMap["clalit-family-medicine"].id,
        submissionId: publishedSubmissionThree.id,
        reviewerType: publishedSubmissionThree.reviewerType,
        displayName: publishedSubmissionThree.fullName,
        isAnonymous: publishedSubmissionThree.isAnonymous,
        teachingQuality: publishedSubmissionThree.teachingQuality,
        workAtmosphere: publishedSubmissionThree.workAtmosphere,
        seniorsApproachability: publishedSubmissionThree.seniorsApproachability,
        researchExposure: publishedSubmissionThree.researchExposure,
        lifestyleBalance: publishedSubmissionThree.lifestyleBalance,
        overallRecommendation: publishedSubmissionThree.overallRecommendation,
        pros: publishedSubmissionThree.pros,
        cons: publishedSubmissionThree.cons,
        tips: publishedSubmissionThree.tips,
        publishedAt: new Date("2026-03-28")
      },
      {
        departmentId: departmentMap["wolfson-orthopedics"].id,
        submissionId: publishedSubmissionFour.id,
        reviewerType: publishedSubmissionFour.reviewerType,
        displayName: publishedSubmissionFour.fullName,
        isAnonymous: publishedSubmissionFour.isAnonymous,
        teachingQuality: publishedSubmissionFour.teachingQuality,
        workAtmosphere: publishedSubmissionFour.workAtmosphere,
        seniorsApproachability: publishedSubmissionFour.seniorsApproachability,
        researchExposure: publishedSubmissionFour.researchExposure,
        lifestyleBalance: publishedSubmissionFour.lifestyleBalance,
        overallRecommendation: publishedSubmissionFour.overallRecommendation,
        pros: publishedSubmissionFour.pros,
        cons: publishedSubmissionFour.cons,
        tips: publishedSubmissionFour.tips,
        publishedAt: new Date("2026-04-01")
      }
    ]
  });

  const approvedRequestSheba = await prisma.publisherRequest.create({
    data: {
      userId: representativeUser.id,
      institutionId: institutionMap.sheba.id,
      departmentId: departmentMap["sheba-cardiology"].id,
      requestedRole: RoleKey.REPRESENTATIVE,
      note: "אחראית על עדכונים ומשרות במחלקה.",
      status: PublisherRequestStatus.APPROVED,
      adminNote: "אושר לאחר בדיקה מול המחלקה.",
      reviewedByUserId: adminUser.id,
      reviewedAt: new Date("2026-03-18")
    }
  });

  const approvedRequestClalit = await prisma.publisherRequest.create({
    data: {
      userId: representativeUser.id,
      institutionId: institutionMap.clalit.id,
      departmentId: departmentMap["clalit-family-medicine"].id,
      requestedRole: RoleKey.REPRESENTATIVE,
      note: "אחראית על מסלול הקהילה והזדמנויות סטודנטים.",
      status: PublisherRequestStatus.APPROVED,
      adminNote: "אושר ברמת מסלול קהילה.",
      reviewedByUserId: adminUser.id,
      reviewedAt: new Date("2026-03-22")
    }
  });

  const pendingPublisherRequest = await prisma.publisherRequest.create({
    data: {
      userId: studentUser.id,
      institutionId: institutionMap.maccabi.id,
      departmentId: departmentMap["maccabi-womens-health"].id,
      requestedRole: RoleKey.REPRESENTATIVE,
      note: "מבקש/ת הרשאה לעדכונים רשמיים למסלול הקהילה.",
      status: PublisherRequestStatus.PENDING
    }
  });

  await prisma.favoriteDepartment.createMany({
    data: [
      {
        userId: studentUser.id,
        departmentId: departmentMap["sheba-cardiology"].id
      },
      {
        userId: studentUser.id,
        departmentId: departmentMap["ichilov-neurology"].id
      },
      {
        userId: residentUser.id,
        departmentId: departmentMap["clalit-family-medicine"].id
      }
    ]
  });

  const applicationOne = await prisma.openingApplication.create({
    data: {
      openingId: openingOne.id,
      applicantType: ReviewSourceType.RESIDENT,
      fullName: "ד\"ר ליאור רז",
      phone: "050-7770001",
      email: "lior.raz@example.com",
      didDepartmentElective: true,
      departmentElectiveDetails: "ביצעתי אלקטיב של ארבעה שבועות במחלקה בסוף שנה ו'.",
      hasResearch: true,
      researchDetails: "מעורב/ת בפרויקט רטרוספקטיבי בקרדיולוגיה פולשנית.",
      didInternshipThere: false,
      motivationText: "אני מחפש/ת מחלקה עם שילוב בין הוראה חזקה, עומק קליני ואפשרות למחקר משמעותי.",
      relevantExperience: "עבדתי כסטאז'ר/ית במיון פנימי ועקבתי אחרי חולי לב מורכבים.",
      additionalNotes: "אשמח להשתלב גם בפעילות אקדמית של המחלקה.",
      status: OpeningApplicationStatus.UNDER_REVIEW,
      reviewedByUserId: representativeUser.id,
      reviewedAt: new Date("2026-04-17"),
      reviewerNote: "מועמד/ת חזקה, מחכים לקורות חיים מעודכנים."
    }
  });

  const applicationTwo = await prisma.openingApplication.create({
    data: {
      openingId: openingThree.id,
      applicantType: ReviewSourceType.STUDENT,
      fullName: "שקד מימון",
      phone: "050-7770002",
      email: "shaked.maymon@example.com",
      didDepartmentElective: false,
      hasResearch: false,
      didInternshipThere: true,
      internshipDetails: "הייתי בחודש קהילה במסלול דומה והבנתי שאני רוצה משפחה.",
      motivationText: "אני רוצה מסלול קהילה עם מדריכים נגישים ורצף טיפולי אמיתי.",
      relevantExperience: "ניסיון בפרויקטים של חינוך לבריאות וחשיפה למרפאות בקהילה.",
      status: OpeningApplicationStatus.SUBMITTED
    }
  });

  const applicationThree = await prisma.openingApplication.create({
    data: {
      openingId: openingFour.id,
      applicantType: ReviewSourceType.INTERN,
      fullName: "יובל כהן",
      phone: "050-7770003",
      email: "yuval.cohen@example.com",
      didDepartmentElective: true,
      departmentElectiveDetails: "אלקטיב של שבועיים באורתופדיה עם השתתפות בסבבים ובחדר ניתוח.",
      hasResearch: true,
      researchDetails: "עבודה קטנה בנושא outcomes בניתוחי שבר.",
      didInternshipThere: true,
      internshipDetails: "חודש סטאז' במיון אורתופדי.",
      motivationText: "אני רוצה להמשיך למחלקה דינמית עם טראומה, עשייה hands-on וצוות נגיש.",
      relevantExperience: "נוכחות קבועה בחדר ניתוח והצגת מקרים במהלך הסבב.",
      additionalNotes: "גמיש/ה לתאריכי התחלה שונים.",
      status: OpeningApplicationStatus.CONTACTED,
      reviewedByUserId: representativeUser.id,
      reviewedAt: new Date("2026-04-19"),
      reviewerNote: "זומן/ה לשיחת היכרות."
    }
  });

  await prisma.uploadedFile.createMany({
    data: [
      {
        departmentId: openingOne.departmentId,
        openingId: openingOne.id,
        openingApplicationId: applicationOne.id,
        category: UploadedFileCategory.APPLICATION_CV,
        isPublic: false,
        originalName: "lior-raz-cv.pdf",
        mimeType: "application/pdf",
        sizeBytes: sampleTextFile("CV", "Lior Raz CV sample").length,
        bytes: sampleTextFile("CV", "Lior Raz CV sample")
      },
      {
        departmentId: openingOne.departmentId,
        openingId: openingOne.id,
        openingApplicationId: applicationOne.id,
        category: UploadedFileCategory.APPLICATION_PROFILE_PHOTO,
        isPublic: false,
        originalName: "lior-raz-photo.svg",
        mimeType: "image/svg+xml",
        sizeBytes: sampleSvg("LR", "#1f576e").length,
        bytes: sampleSvg("LR", "#1f576e")
      },
      {
        departmentId: openingThree.departmentId,
        openingId: openingThree.id,
        openingApplicationId: applicationTwo.id,
        category: UploadedFileCategory.APPLICATION_CV,
        isPublic: false,
        originalName: "shaked-cv.pdf",
        mimeType: "application/pdf",
        sizeBytes: sampleTextFile("CV", "Shaked Maymon CV sample").length,
        bytes: sampleTextFile("CV", "Shaked Maymon CV sample")
      },
      {
        departmentId: openingFour.departmentId,
        openingId: openingFour.id,
        openingApplicationId: applicationThree.id,
        category: UploadedFileCategory.APPLICATION_CV,
        isPublic: false,
        originalName: "yuval-cohen-cv.pdf",
        mimeType: "application/pdf",
        sizeBytes: sampleTextFile("CV", "Yuval Cohen CV sample").length,
        bytes: sampleTextFile("CV", "Yuval Cohen CV sample")
      },
      {
        departmentId: openingFour.departmentId,
        openingId: openingFour.id,
        openingApplicationId: applicationThree.id,
        category: UploadedFileCategory.APPLICATION_PROFILE_PHOTO,
        isPublic: false,
        originalName: "yuval-cohen-photo.svg",
        mimeType: "image/svg+xml",
        sizeBytes: sampleSvg("YC", "#1daaa5").length,
        bytes: sampleSvg("YC", "#1daaa5")
      }
    ]
  });

  const publishedReview = await prisma.review.findFirstOrThrow({
    where: {
      submissionId: publishedSubmissionOne.id
    }
  });

  await prisma.reviewReport.create({
    data: {
      reviewId: publishedReview.id,
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
        entityId: publishedSubmissionOne.id,
        metadata: {
          department: "sheba-cardiology"
        }
      },
      {
        actorUserId: representativeUser.id,
        action: "opening.created",
        entityType: "ResidencyOpening",
        entityId: openingOne.id
      },
      {
        actorUserId: representativeUser.id,
        action: "opening.created",
        entityType: "ResidencyOpening",
        entityId: openingThree.id
      },
      {
        actorUserId: null,
        action: "opening_application.submitted_public",
        entityType: "OpeningApplication",
        entityId: applicationTwo.id
      },
      {
        actorUserId: representativeUser.id,
        action: "opening_application.reviewed",
        entityType: "OpeningApplication",
        entityId: applicationThree.id
      },
      {
        actorUserId: adminUser.id,
        action: "publisher_request.approved",
        entityType: "PublisherRequest",
        entityId: approvedRequestSheba.id
      },
      {
        actorUserId: adminUser.id,
        action: "publisher_request.approved",
        entityType: "PublisherRequest",
        entityId: approvedRequestClalit.id
      },
      {
        actorUserId: studentUser.id,
        action: "favorite.added",
        entityType: "Department",
        entityId: departmentMap["ichilov-neurology"].id
      },
      {
        actorUserId: null,
        action: "review_submission.created_public",
        entityType: "ReviewSubmission",
        entityId: pendingSubmissionOne.id
      },
      {
        actorUserId: null,
        action: "review_submission.created_public",
        entityType: "ReviewSubmission",
        entityId: pendingSubmissionTwo.id
      },
      {
        actorUserId: null,
        action: "publisher_request.created",
        entityType: "PublisherRequest",
        entityId: pendingPublisherRequest.id
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
      openings: 4
    }
  };
}
