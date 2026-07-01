import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

const adminPageRoots = [join(root, "src/app/admin/electives"), join(root, "src/app/admin/fellowships")];
const adminApiRoots = [join(root, "src/app/api/admin/electives"), join(root, "src/app/api/admin/fellowships")];
const representativePagePaths = [
  "src/app/electives/department-login/page.tsx",
  "src/app/electives/department/page.tsx",
  "src/app/electives/department/applications/page.tsx",
  "src/app/electives/department/applications/[applicationId]/page.tsx",
  "src/app/electives/department/availability/page.tsx",
  "src/app/electives/department/settings/page.tsx"
];
const representativeApiPaths = [
  "src/app/api/electives/department/login/route.ts",
  "src/app/api/electives/department/logout/route.ts",
  "src/app/api/electives/department/settings/route.ts",
  "src/app/api/electives/department/availability/route.ts",
  "src/app/api/electives/department/applications/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/approve/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/reject/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/waitlist/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/suggest-alternative/route.ts"
];
const studentPreviewPagePaths = [
  "src/app/electives/page.tsx",
  "src/app/electives/[departmentSlug]/page.tsx",
  "src/app/electives/[departmentSlug]/apply/page.tsx",
  "src/app/student/electives/my-applications/page.tsx"
];
const studentPreviewApiPaths = [
  "src/app/api/electives/departments/route.ts",
  "src/app/api/electives/departments/[departmentSlug]/route.ts",
  "src/app/api/electives/applications/route.ts",
  "src/app/api/electives/applications/[applicationId]/accept-alternative/route.ts",
  "src/app/api/electives/applications/[applicationId]/decline-alternative/route.ts",
  "src/app/api/electives/my-applications/route.ts"
];
const forbiddenPublicRouteDirs = [
  "src/app/elective",
  "src/app/fellowship",
  "src/app/fellowships",
  "src/app/api/elective",
  "src/app/api/fellowship",
  "src/app/api/fellowships"
];
const publicSurfaceFiles = [
  "src/components/layout/site-header.tsx",
  "src/components/layout/site-footer.tsx",
  "src/lib/static-pages.ts",
  "src/app/sitemap/page.tsx",
  "src/app/layout.tsx"
].map((path) => join(root, path));
const publicRoutePattern = /href=["']\/(?:electives?|fellowships?)(?:[/"'#?]|["'])|["']\/(?:electives?|fellowships?)(?:[/"'#?]|["'])/;

for (const path of [
  "src/app/admin/electives/page.tsx",
  "src/app/admin/electives/departments/page.tsx",
  "src/app/admin/electives/departments/[departmentId]/page.tsx",
  "src/app/admin/electives/applications/page.tsx",
  "src/app/admin/electives/demo/page.tsx",
  "src/app/admin/electives/settings/page.tsx",
  "src/app/admin/fellowships/page.tsx",
  "src/app/admin/fellowships/content/page.tsx",
  "src/app/admin/fellowships/specialties/page.tsx",
  "src/app/admin/fellowships/programs/page.tsx"
]) {
  addCheck(`admin page exists: ${path}`, existsSync(join(root, path)));
}

for (const path of [
  "src/app/api/admin/electives/department-accounts/route.ts",
  "src/app/api/admin/electives/settings/route.ts",
  "src/app/api/admin/electives/windows/route.ts",
  "src/app/api/admin/electives/applications/route.ts",
  "src/app/api/admin/electives/demo/route.ts",
  "src/app/api/admin/electives/representatives/route.ts",
  "src/app/api/admin/fellowships/specialties/route.ts",
  "src/app/api/admin/fellowships/programs/route.ts",
  "src/app/api/admin/fellowships/experiences/route.ts",
  "src/app/api/admin/fellowships/demo/route.ts"
]) {
  addCheck(`admin api exists: ${path}`, existsSync(join(root, path)));
}

for (const path of forbiddenPublicRouteDirs) {
  addCheck(`no public route: ${path}`, !existsSync(join(root, path)));
}

addCheck("no student elective application route", !existsSync(join(root, "src/app/electives/applications")));
addCheck("no student elective registration route", !existsSync(join(root, "src/app/electives/register")));
addCheck("no root student elective apply route", !existsSync(join(root, "src/app/electives/apply")));

for (const path of representativePagePaths) {
  addCheck(`representative page exists: ${path}`, existsSync(join(root, path)));
}

for (const path of representativeApiPaths) {
  addCheck(`representative api exists: ${path}`, existsSync(join(root, path)));
}

const allowedRepresentativePageFiles = new Set(representativePagePaths);
const allowedStudentPreviewPageFiles = new Set(studentPreviewPagePaths);
const unexpectedElectivePages = walk(join(root, "src/app/electives"), (path) => path.endsWith(".tsx"))
  .map((path) => rel(path))
  .filter((path) => !allowedRepresentativePageFiles.has(path) && !allowedStudentPreviewPageFiles.has(path));
addCheck("only approved private electives pages exist", unexpectedElectivePages.length === 0, unexpectedElectivePages.join(", "));

const adminPageFiles = adminPageRoots.flatMap((dir) => walk(dir, (path) => path.endsWith(".tsx")));
for (const file of adminPageFiles) {
  const content = read(file);
  addCheck(`requireAdmin in ${rel(file)}`, content.includes("requireAdmin("));
  addCheck(`noindex metadata in ${rel(file)}`, content.includes("robots") && content.includes("index: false"));
}

const adminApiFiles = adminApiRoots.flatMap((dir) => walk(dir, (path) => path.endsWith("/route.ts")));
for (const file of adminApiFiles) {
  const content = read(file);
  const hasAdminGate =
    content.includes("getSession(") &&
    (content.includes('session.role !== "admin"') || content.includes("session.role !== 'admin'"));
  addCheck(`admin API role gate in ${rel(file)}`, hasAdminGate);
  addCheck(`same-origin guard in ${rel(file)}`, content.includes("hasValidSameOrigin("));
}

for (const path of representativePagePaths) {
  const file = join(root, path);
  const content = existsSync(file) ? read(file) : "";
  const hasFeatureGate =
    content.includes("isElectiveDepartmentPortalEnabled(") || content.includes("requireElectiveDepartmentSession(");
  const hasSessionGate =
    path.includes("department-login")
      ? content.includes("getElectiveDepartmentSession(")
      : content.includes("requireElectiveDepartmentSession(");

  addCheck(`representative page feature gate in ${path}`, hasFeatureGate);
  addCheck(`representative page session handling in ${path}`, hasSessionGate);
  addCheck(`representative page noindex in ${path}`, content.includes("robots") && content.includes("index: false"));
}

for (const path of representativeApiPaths) {
  const file = join(root, path);
  const content = existsSync(file) ? read(file) : "";
  const isLogin = path.includes("/login/");
  const isReadOnly = path.endsWith("/applications/route.ts") || path.endsWith("/[applicationId]/route.ts");
  const hasRepGate = isLogin
    ? content.includes("authenticateElectiveDepartmentAccount(") && content.includes("isElectiveDepartmentPortalEnabled(")
    : content.includes("requireElectiveDepartmentApiSession(");

  addCheck(`representative API gate in ${path}`, hasRepGate);
  addCheck(`representative API same-origin in ${path}`, isReadOnly || content.includes("hasValidSameOrigin("));
  addCheck(`representative API does not use admin session in ${path}`, !content.includes("getSession(") && !content.includes('role !== "admin"'));
}

const allowedRepresentativeApiFiles = new Set(representativeApiPaths);
const allowedStudentPreviewApiFiles = new Set(studentPreviewApiPaths);
const unexpectedElectiveApis = walk(join(root, "src/app/api/electives"), (path) => path.endsWith("/route.ts"))
  .map((path) => rel(path))
  .filter((path) => !allowedRepresentativeApiFiles.has(path) && !allowedStudentPreviewApiFiles.has(path));
addCheck("only approved private electives APIs exist outside /api/admin", unexpectedElectiveApis.length === 0, unexpectedElectiveApis.join(", "));

const leakedPublicLinks = publicSurfaceFiles
  .filter((file) => existsSync(file))
  .flatMap((file) => {
    const content = read(file);
    return publicRoutePattern.test(content) ? [rel(file)] : [];
  });
addCheck(
  "no public nav/static/sitemap fellowship-elective links",
  leakedPublicLinks.length === 0,
  leakedPublicLinks.join(", ")
);

const misplacedApis = walk(join(root, "src/app/api"), (path) => path.endsWith("/route.ts"))
  .map((path) => rel(path))
  .filter((path) => /api\/(?!admin\/)(?:electives?|fellowships?)\//.test(path))
  .filter((path) => !allowedRepresentativeApiFiles.has(path) && !allowedStudentPreviewApiFiles.has(path));
addCheck("no unapproved electives/fellowships APIs outside admin/representative scope", misplacedApis.length === 0, misplacedApis.join(", "));

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
