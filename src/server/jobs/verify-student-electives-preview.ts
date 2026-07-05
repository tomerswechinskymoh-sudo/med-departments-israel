import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

type Check = {
  name: string;
  ok: boolean;
  details?: string;
};

const checks: Check[] = [];

function rel(path: string) {
  return relative(root, path);
}

function addCheck(name: string, ok: boolean, details?: string) {
  checks.push({ name, ok, details });
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

function walk(dir: string, predicate: (path: string) => boolean = () => true): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...walk(path, predicate));
    } else if (predicate(path)) {
      files.push(path);
    }
  }

  return files;
}

const featureFlagFile = join(root, "src/lib/student-electives.ts");
const previewPages = [
  "src/app/electives/page.tsx",
  "src/app/electives/[departmentSlug]/page.tsx",
  "src/app/electives/[departmentSlug]/apply/page.tsx",
  "src/app/student/electives/my-applications/page.tsx"
];
const previewApis = [
  "src/app/api/electives/departments/route.ts",
  "src/app/api/electives/departments/[departmentSlug]/route.ts",
  "src/app/api/electives/applications/route.ts",
  "src/app/api/electives/applications/[applicationId]/accept-alternative/route.ts",
  "src/app/api/electives/applications/[applicationId]/decline-alternative/route.ts",
  "src/app/api/electives/my-applications/route.ts"
];
const publicSurfaceFiles = [
  "src/components/layout/site-header.tsx",
  "src/components/layout/site-footer.tsx",
  "src/lib/static-pages.ts",
  "src/app/sitemap/page.tsx",
  "src/app/layout.tsx"
].map((path) => join(root, path));

addCheck("feature flag helper exists", existsSync(featureFlagFile));

if (existsSync(featureFlagFile)) {
  const content = read(featureFlagFile);
  addCheck("feature flag reads ENABLE_STUDENT_ELECTIVES_PREVIEW", content.includes("ENABLE_STUDENT_ELECTIVES_PREVIEW"));
  addCheck("feature flag defaults disabled", content.includes('=== "true"') || content.includes("=== 'true'"));
  addCheck("future public launch flag placeholder exists", content.includes("ENABLE_STUDENT_ELECTIVES_PUBLIC"));
  addCheck("hidden preview requires admin role", content.includes('session.role !== "admin"') && content.includes("admin_required"));
  addCheck("central preview access helper exists", content.includes("getStudentElectivesAccess") && content.includes("requireStudentElectivesPreviewAccess"));
  addCheck("stable detail href helper exists", content.includes("buildElectiveDepartmentHref") && content.includes("encodeURIComponent"));
  addCheck("detail resolver decodes slug candidates", content.includes("safeDecodeSlug") && content.includes("slugCandidates"));
  addCheck("date range helper only requires both dates", content.includes("hasCompleteElectiveDateRange") && content.includes("parseDateOnly(search.start)") && !content.includes("specialties.length > 0 && search.regions.length > 0"));
  addCheck("partial date helper exists", content.includes("hasPartialElectiveDateRange"));
  addCheck("list matching uses availability/capacity match", content.includes("getElectiveDepartmentAvailabilityMatch") && content.includes("remainingCapacity"));
}

for (const path of previewPages) {
  const file = join(root, path);
  const content = existsSync(file) ? read(file) : "";
  addCheck(`preview page exists: ${path}`, existsSync(file));
  addCheck(`preview page noindex: ${path}`, content.includes("robots") && content.includes("index: false"));
  addCheck(`preview page admin preview guard: ${path}`, content.includes("requireStudentElectivesPreviewAccess("));
}

const electivesPage = read(join(root, "src/app/electives/page.tsx"));
const electivesCatalog = read(join(root, "src/components/electives/student-electives-catalog.tsx"));
addCheck("electives page shows optional filter form", electivesPage.includes("תאריך התחלה") && electivesPage.includes("תחומי התמחות שמעניינים אותך") && electivesPage.includes("אזור בארץ"));
addCheck("electives page always lists departments", electivesPage.includes("const departments = await listElectiveDepartments(rawParams)") && !electivesPage.includes("required"));
addCheck("electives page warns on partial date only", electivesPage.includes("כדי לבדוק זמינות לפי תאריכים"));
addCheck("electives page results section is live catalog", electivesPage.includes("מחלקות פתוחות לאלקטיב") && electivesPage.includes("נמצאו {catalogDepartments.length} מחלקות"));
addCheck("electives page renders row catalog component", electivesPage.includes("StudentElectivesCatalog") && existsSync(join(root, "src/components/electives/student-electives-catalog.tsx")));
addCheck("electives empty state suggests clearing filters", electivesPage.includes("נסה לנקות סינונים"));
addCheck("closed row includes compact row columns", electivesCatalog.includes("בית חולים") && electivesCatalog.includes("מחלקה") && electivesCatalog.includes("תחום") && electivesCatalog.includes("דירוג סטודנטים"));
addCheck("closed row includes simultaneous student capacity label", electivesCatalog.includes("מספר סטודנטים שיכולים להיות בו זמנית"));
addCheck("expanded row renders inline calendar without popup trigger", electivesCatalog.includes("בחירת תאריכים") && electivesCatalog.includes("getMonthCells") && electivesCatalog.includes("onSelectDay") && !electivesCatalog.includes("פתח לוח שנה") && !electivesCatalog.includes("absolute right-0 z-40"));
addCheck("desktop picker shows two months", electivesCatalog.includes("secondMonth") && electivesCatalog.includes("md:grid-cols-2") && electivesCatalog.includes("hidden md:block"));
addCheck("calendar month navigation exists", electivesCatalog.includes("חודש קודם") && electivesCatalog.includes("חודש הבא") && electivesCatalog.includes("addMonths(currentMonth"));
addCheck("calendar supports clearing and hover preview", electivesCatalog.includes("נקה בחירה") && electivesCatalog.includes("setHoverDay"));
addCheck("calendar marks unavailable and full days", electivesCatalog.includes("לא זמין") && electivesCatalog.includes("מלא") && electivesCatalog.includes("approvedBookingsForDay"));
addCheck("calendar selected range uses strong readable styles", electivesCatalog.includes("inFinalSelectedRange") && electivesCatalog.includes("bg-brand-700") && electivesCatalog.includes("bg-brand-900") && electivesCatalog.includes("text-white"));
addCheck("selected range avoids low-opacity text", electivesCatalog.includes("isOutsideMonth && !inSelectedRange") && electivesCatalog.includes("inFinalSelectedRange && \"text-white\""));
addCheck("expanded row apply link includes selected dates", electivesCatalog.includes("applyHref(department.slug, search, dates.start, dates.end)"));
addCheck("electives catalog uses rating fallback", electivesCatalog.includes("עדיין אין נתונים מסטודנטים שביצעו אלקטיב במחלקה זו"));
addCheck("raw availability window list removed from expanded row", !electivesCatalog.includes("תאריכים פתוחים") && !electivesCatalog.includes("תאריכים חסומים") && !electivesCatalog.includes("WindowList"));
addCheck("old verbose closed-row phrases removed", !electivesCatalog.includes("בחר תאריכים כדי לבדוק זמינות מדויקת") && !electivesCatalog.includes("פתוח רק בחלונות מוגדרים") && !electivesCatalog.includes("סגור כברירת מחדל"));
addCheck("student-facing capacity wording replaced", !`${electivesPage}\n${electivesCatalog}`.includes("קיבולת מקסימלית") && electivesCatalog.includes("מספר סטודנטים שיכולים להיות בו זמנית"));

const electiveDetailPage = read(join(root, "src/app/electives/[departmentSlug]/page.tsx"));
addCheck("detail page preserves query for apply", electiveDetailPage.includes("buildElectiveApplyHref(department.slug, search)"));
addCheck("detail page displays capacity diagnostics", electiveDetailPage.includes("מקומות פנויים בטווח שבחרת") && electiveDetailPage.includes("בקשות מאושרות חופפות"));
addCheck("detail page works without dates", electiveDetailPage.includes("אפשר להמשיך לטופס ההגשה") && electiveDetailPage.includes("!hasSelectedDates || match?.ok"));
addCheck("detail page blocks apply when selected dates unavailable", electiveDetailPage.includes("match?.ok") && electiveDetailPage.includes("disabled"));
addCheck("detail page uses simultaneous student capacity wording", !electiveDetailPage.includes("קיבולת מקסימלית") && electiveDetailPage.includes("מספר סטודנטים שיכולים להיות בו זמנית"));

const electiveApplyPage = read(join(root, "src/app/electives/[departmentSlug]/apply/page.tsx"));
addCheck("apply page reads query dates", electiveApplyPage.includes("parseStudentElectiveSearch") && electiveApplyPage.includes("defaultStartDate"));
addCheck("apply page shows required date form without query dates", electiveApplyPage.includes("יש לבחור תאריך התחלה ותאריך סיום") && electiveApplyPage.includes("<ElectiveApplicationForm"));
addCheck("apply page warns on invalid selected dates", electiveApplyPage.includes("getElectiveDepartmentAvailabilityMatch") && electiveApplyPage.includes("!match?.ok"));

const electiveDepartmentApi = read(join(root, "src/app/api/electives/departments/[departmentSlug]/route.ts"));
addCheck("department API returns date availability for expanded rows", electiveDepartmentApi.includes("dateAvailability") && electiveDepartmentApi.includes("getElectiveDepartmentAvailabilityMatch"));

for (const path of previewApis) {
  const file = join(root, path);
  const content = existsSync(file) ? read(file) : "";
  addCheck(`preview API exists: ${path}`, existsSync(file));
  addCheck(`preview API admin preview guard: ${path}`, content.includes("getStudentElectivesAccess("));
}

const applicationsApi = read(join(root, "src/app/api/electives/applications/route.ts"));
addCheck("application API blocks normal users in hidden preview", applicationsApi.includes("getStudentElectivesAccess(") && applicationsApi.includes("if (!access.ok)"));
addCheck("application API uses guarded session user id", applicationsApi.includes("applicantUserId: access.session.userId"));
addCheck("application API same-origin guard", applicationsApi.includes("hasValidSameOrigin("));

const myApplicationsApi = read(join(root, "src/app/api/electives/my-applications/route.ts"));
addCheck("my-applications API blocks normal users in hidden preview", myApplicationsApi.includes("getStudentElectivesAccess(") && myApplicationsApi.includes("if (!access.ok)"));
addCheck("my-applications API filters by guarded session user", myApplicationsApi.includes("applicantUserId: access.session.userId"));
addCheck(
  "my-applications API does not accept external user selector",
  !myApplicationsApi.includes("searchParams") && !myApplicationsApi.includes("params") && !myApplicationsApi.includes("request.json")
);

const leakedSurfaceLinks = publicSurfaceFiles
  .filter((file) => existsSync(file))
  .flatMap((file) => {
    const content = read(file);
    return /href=["']\/(?:electives|student\/electives)|["']\/(?:electives|student\/electives)/.test(content) ? [rel(file)] : [];
  });
addCheck("no nav/static/sitemap links to student electives preview", leakedSurfaceLinks.length === 0, leakedSurfaceLinks.join(", "));

addCheck("no public fellowship route", !existsSync(join(root, "src/app/fellowship")) && !existsSync(join(root, "src/app/fellowships")));
addCheck("no student elective registration route", !existsSync(join(root, "src/app/electives/register")) && !existsSync(join(root, "src/app/electives/applications")));

const schema = read(join(root, "prisma/schema.prisma"));
addCheck("no plaintext elective passwords in schema", !schema.includes("password String") && schema.includes("passwordHash"));

const apiRoutes = walk(join(root, "src/app/api/electives"), (path) => path.endsWith("/route.ts")).map((path) => rel(path));
const allowedApis = new Set([
  ...previewApis,
  "src/app/api/electives/department/login/route.ts",
  "src/app/api/electives/department/logout/route.ts",
  "src/app/api/electives/department/settings/route.ts",
  "src/app/api/electives/department/availability/route.ts",
  "src/app/api/electives/department/applications/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/approve/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/reject/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/waitlist/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/suggest-alternative/route.ts",
  "src/app/api/electives/applications/[applicationId]/accept-alternative/route.ts",
  "src/app/api/electives/applications/[applicationId]/decline-alternative/route.ts"
]);
const unexpectedApis = apiRoutes.filter((path) => !allowedApis.has(path));
addCheck("no unapproved electives APIs", unexpectedApis.length === 0, unexpectedApis.join(", "));

const failures = checks.filter((check) => !check.ok);

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      checked: checks.length,
      failed: failures.length,
      failures
    },
    null,
    2
  )
);

if (failures.length > 0) {
  process.exit(1);
}
