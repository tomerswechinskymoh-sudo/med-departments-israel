import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks: Array<{ name: string; ok: boolean; details?: string }> = [];

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function add(name: string, ok: boolean, details?: string) {
  checks.push({ name, ok, details });
}

const pages = [
  "src/app/electives/department-login/page.tsx",
  "src/app/electives/department/page.tsx",
  "src/app/electives/department/settings/page.tsx",
  "src/app/electives/department/availability/page.tsx",
  "src/app/electives/department/applications/page.tsx",
  "src/app/electives/department/applications/[applicationId]/page.tsx"
];

for (const page of pages) {
  const content = existsSync(join(root, page)) ? read(page) : "";
  add(`portal page exists: ${page}`, Boolean(content));
  add(`portal page noindex: ${page}`, content.includes("robots") && content.includes("index: false"));
  add(
    `portal page gated: ${page}`,
    page.includes("department-login")
      ? content.includes("isElectiveDepartmentPortalEnabled(")
      : content.includes("requireElectiveDepartmentSession(")
  );
}

const auth = read("src/lib/elective-department-auth.ts");
add("portal feature flag default disabled", auth.includes("ENABLE_ELECTIVE_DEPARTMENT_PORTAL") && auth.includes('=== "true"'));
add("representative session supports assigned departments", auth.includes("assignedDepartments") && auth.includes("canManageElectiveDepartment"));
add("legacy department account compatibility kept", auth.includes("electiveDepartmentAccount") && auth.includes("legacy_department"));

const apis = [
  "src/app/api/electives/department/settings/route.ts",
  "src/app/api/electives/department/availability/route.ts",
  "src/app/api/electives/department/applications/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/approve/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/reject/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/waitlist/route.ts",
  "src/app/api/electives/department/applications/[applicationId]/suggest-alternative/route.ts"
];

for (const api of apis) {
  const content = existsSync(join(root, api)) ? read(api) : "";
  add(`portal API exists: ${api}`, Boolean(content));
  add(`portal API requires session: ${api}`, content.includes("requireElectiveDepartmentApiSession("));
  add(
    `portal API assignment-scoped: ${api}`,
    content.includes("canManageElectiveDepartment(") || content.includes("getRepresentativeApplication(") || content.includes("updateRepresentativeApplicationDecision(")
      || (content.includes("assignedDepartments.map") && content.includes("departmentId: { in: departmentIds }"))
  );
}

const schema = read("prisma/schema.prisma");
add("representative account model exists", schema.includes("model ElectiveRepresentativeAccount"));
add("representative assignment model exists", schema.includes("model ElectiveRepresentativeDepartmentAssignment"));
add("plain password field absent", !schema.includes("password String") && schema.includes("passwordHash"));
add("track settings model exists", schema.includes("model ElectiveDepartmentTrackSettings") && schema.includes("paymentRequired") && schema.includes("paymentInstructions"));
add("availability windows support track type", /trackType\s+ElectiveTrackType\?\s+@map\("track_type"\)/.test(schema));

const settingsPage = read("src/app/electives/department/settings/page.tsx");
const portalActions = read("src/components/electives/department-portal-actions.tsx");
const settingsApi = read("src/app/api/electives/department/settings/route.ts");
const availabilityApi = read("src/app/api/electives/department/availability/route.ts");
add("portal settings page loads track settings", settingsPage.includes("electiveDepartmentTrackSettings") && settingsPage.includes("initialTrackSettings"));
add("portal settings form renders two track sections", portalActions.includes("סטודנטים לרפואה בישראל") && portalActions.includes("ישראלים הלומדים בחו״ל"));
add("portal settings form renders payment fields", portalActions.includes("נדרש תשלום") && portalActions.includes("קישור לתשלום") && portalActions.includes("הנחיות תשלום"));
add("portal settings API upserts track settings", settingsApi.includes("electiveDepartmentTrackSettings.upsert") && settingsApi.includes("trackSettings"));
add("portal availability form/API supports track-specific windows", portalActions.includes("סוג סבב") && availabilityApi.includes("trackType: parsed.data.trackType ?? null"));

const failures = checks.filter((check) => !check.ok);
console.log(JSON.stringify({ ok: failures.length === 0, checked: checks.length, failed: failures.length, failures }, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
