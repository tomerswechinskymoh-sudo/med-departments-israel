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

const emailHelperPath = "src/lib/services/elective-emails.ts";
const submitApiPath = "src/app/api/electives/applications/route.ts";
const decisionHelperPath = "src/lib/elective-representative-applications.ts";

add("elective email helper exists", existsSync(join(root, emailHelperPath)));

if (existsSync(join(root, emailHelperPath))) {
  const helper = read(emailHelperPath);
  add("submitted email helper defined", helper.includes("sendElectiveApplicationSubmittedEmails"));
  add("decision email helper defined", helper.includes("sendElectiveDecisionEmail"));
  add("email helper uses shared transactional email", helper.includes("sendTransactionalEmail("));
  add("representative link included", helper.includes("/electives/department/applications/"));
  add("student applications link included", helper.includes("/student/electives/my-applications"));
}

const submitApi = read(submitApiPath);
add("student submit API calls representative email", submitApi.includes("sendElectiveApplicationSubmittedEmails("));
add("student submit API loads representative assignments", submitApi.includes("electiveRepresentativeAssignments"));
add("student submit API filters receivesApplicationEmails", submitApi.includes("receivesApplicationEmails"));

const decisionHelper = read(decisionHelperPath);
add("representative decision sends student email", decisionHelper.includes("sendElectiveDecisionEmail("));
add("email failure is caught/logged", decisionHelper.includes("Failed to send student decision email"));

const failures = checks.filter((check) => !check.ok);
console.log(JSON.stringify({ ok: failures.length === 0, checked: checks.length, failed: failures.length, failures }, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
