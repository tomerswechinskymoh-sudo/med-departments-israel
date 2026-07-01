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
}

for (const path of previewPages) {
  const file = join(root, path);
  const content = existsSync(file) ? read(file) : "";
  addCheck(`preview page exists: ${path}`, existsSync(file));
  addCheck(`preview page noindex: ${path}`, content.includes("robots") && content.includes("index: false"));
  addCheck(`preview page feature gate: ${path}`, content.includes("requireStudentElectivesPreviewEnabled("));
}

for (const path of previewApis) {
  const file = join(root, path);
  const content = existsSync(file) ? read(file) : "";
  addCheck(`preview API exists: ${path}`, existsSync(file));
  addCheck(`preview API feature gate: ${path}`, content.includes("isStudentElectivesPreviewEnabled("));
}

const applicationsApi = read(join(root, "src/app/api/electives/applications/route.ts"));
addCheck("application API requires user session", applicationsApi.includes("getSession(") && applicationsApi.includes("if (!session)"));
addCheck("application API uses logged-in user id", applicationsApi.includes("applicantUserId: session.userId"));
addCheck("application API same-origin guard", applicationsApi.includes("hasValidSameOrigin("));

const myApplicationsApi = read(join(root, "src/app/api/electives/my-applications/route.ts"));
addCheck("my-applications API requires user session", myApplicationsApi.includes("getSession(") && myApplicationsApi.includes("if (!session)"));
addCheck("my-applications API filters by session user", myApplicationsApi.includes("applicantUserId: session.userId"));
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

const apiRoutes = walk(join(root, "src/app/api/electives"), (path) => path.endsWith("/route.ts")).map((path) => rel(path));
const allowedApis = new Set([
  ...previewApis,
  "src/app/api/electives/department/login/route.ts",
  "src/app/api/electives/department/logout/route.ts",
  "src/app/api/electives/department/settings/route.ts",
  "src/app/api/electives/department/availability/route.ts"
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
