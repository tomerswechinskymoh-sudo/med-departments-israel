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

const schema = read("prisma/schema.prisma");
const generationPath = "src/lib/server/elective-representative-generation.ts";
const generation = existsSync(join(root, generationPath)) ? read(generationPath) : "";
const adminRoute = read("src/app/api/admin/electives/representatives/route.ts");
const adminForms = read("src/components/admin/electives-admin-forms.tsx");
const adminDepartmentsPage = read("src/app/admin/electives/departments/page.tsx");
const portalAuth = read("src/lib/elective-department-auth.ts");
const portalSettingsApi = read("src/app/api/electives/department/settings/route.ts");
const portalAvailabilityApi = read("src/app/api/electives/department/availability/route.ts");
const studentApplicationApi = read("src/app/api/electives/applications/route.ts");
const emailHelper = read("src/lib/services/elective-emails.ts");
const demoSeed = read("src/lib/server/electives-demo-seed.ts");
const packageJson = read("package.json");

add("representative generation service exists", Boolean(generation));
add("representative account model stores only hash", schema.includes("model ElectiveRepresentativeAccount") && schema.includes("passwordHash") && !schema.includes("password String"));
add("representative assignment model supports many departments", schema.includes("model ElectiveRepresentativeDepartmentAssignment") && schema.includes("representativeAccountId") && schema.includes("departmentId"));
add("track enum exists", schema.includes("enum ElectiveTrackType") && schema.includes("ISRAELI_FACULTY_STUDENT") && schema.includes("ABROAD_ISRAELI_STUDENT"));
add("track settings model exists", schema.includes("model ElectiveDepartmentTrackSettings") && schema.includes("paymentRequired") && schema.includes("paymentLink") && schema.includes("paymentInstructions"));
add("availability windows can be track-specific", /trackType\s+ElectiveTrackType\?\s+@map\("track_type"\)/.test(schema));
add("applications store track type", /trackType\s+ElectiveTrackType\s+@default\(ISRAELI_FACULTY_STUDENT\)\s+@map\("track_type"\)/.test(schema));

add("hospital representative usernames use suffix", generation.includes("_electives") && generation.includes("generateHospitalElectivesUsername"));
add("password generator uses HMAC secret", generation.includes("createHmac(\"sha256\"") && generation.includes("ELECTIVES_REP_PASSWORD_SECRET"));
add("password generator does not store plaintext", generation.includes("hashPassword(temporaryPassword)") && !generation.includes("password: temporaryPassword"));
add("production without secret is blocked", generation.includes("NODE_ENV === \"production\"") && generation.includes("throw new Error"));
add("generation is idempotent by username", generation.includes("findUnique({ where: { username } })") && generation.includes("createMany") && generation.includes("skipDuplicates"));
add("generation keeps manual assignments", generation.includes("skipDuplicates: true") && !generation.includes("deleteMany"));
add("generation supports reset one representative", generation.includes("resetHospitalElectiveRepresentativePassword") && generation.includes("temporaryPassword"));

add("package command for generation exists", packageJson.includes("generate:elective-representatives"));
add("package command for representative verification exists", packageJson.includes("verify:elective-representatives"));
add("admin API exposes hospital generation action", adminRoute.includes("generateByHospital") && adminRoute.includes("generateElectiveRepresentativesByHospital"));
add("admin API exposes reset action", adminRoute.includes("resetHospitalRepresentativePassword") && adminRoute.includes("resetHospitalElectiveRepresentativePassword"));
add("admin UI has hospital generation button", adminForms.includes("יצירת משתמשי נציגים לפי בתי חולים") && adminForms.includes("temporaryPassword"));
add("admin UI has reset password button", adminForms.includes("ElectiveRepresentativeResetPasswordButton") && adminForms.includes("איפוס סיסמה לנציג"));
add("admin departments page renders generation and reset UI", adminDepartmentsPage.includes("ElectiveHospitalRepresentativeGenerationForm") && adminDepartmentsPage.includes("ElectiveRepresentativeResetPasswordButton"));
add("representative portal remains assignment scoped", portalAuth.includes("canManageElectiveDepartment") && portalAuth.includes("assignedDepartments"));
add("portal settings API saves track settings", portalSettingsApi.includes("trackSettings") && portalSettingsApi.includes("electiveDepartmentTrackSettings.upsert"));
add("portal availability API saves track type", portalAvailabilityApi.includes("trackType: parsed.data.trackType ?? null"));

add("student application requires track type", studentApplicationApi.includes("trackType") && studentApplicationApi.includes("electiveStudentApplicationSchema"));
add("email payload includes track label", emailHelper.includes("getElectiveTrackLabel") && emailHelper.includes("סוג סבב"));
add("email payload includes payment details", emailHelper.includes("paymentRequired") && emailHelper.includes("קישור לתשלום") && emailHelper.includes("הנחיות תשלום"));
add("demo seed creates both track types", demoSeed.includes("ISRAELI_FACULTY_STUDENT") && demoSeed.includes("ABROAD_ISRAELI_STUDENT"));
add("demo seed includes demo payment link only", demoSeed.includes("https://example.com/demo-payment") && demoSeed.includes("[DEMO]"));

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
