import { ElectiveAvailabilityMode, ElectiveWindowStatus } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getEffectiveCapacityForRange,
  isDateRangeAllowedForDepartment,
  rangesOverlap
} from "@/lib/elective-availability";

const checks: Array<{ name: string; ok: boolean; details?: string }> = [];

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function add(name: string, ok: boolean, details?: string) {
  checks.push({ name, ok, details });
}

const openSettings = {
  availabilityMode: ElectiveAvailabilityMode.OPEN_BY_DEFAULT,
  maxStudentsAtOnce: 2,
  minDurationDays: 2,
  maxDurationDays: 30,
  allowApplications: true
};
const closedSettings = {
  availabilityMode: ElectiveAvailabilityMode.CLOSED_BY_DEFAULT,
  maxStudentsAtOnce: 1,
  minDurationDays: 2,
  maxDurationDays: 30,
  allowApplications: true
};

add("overlap helper includes crossing ranges", rangesOverlap(date("2026-08-01"), date("2026-08-10"), date("2026-08-10"), date("2026-08-12")));
add(
  "OPEN_BY_DEFAULT blocks closed window",
  !isDateRangeAllowedForDepartment({
    settings: openSettings,
    requestedStartDate: date("2026-08-05"),
    requestedEndDate: date("2026-08-08"),
    windows: [{ status: ElectiveWindowStatus.CLOSED, startsAt: date("2026-08-01"), endsAt: date("2026-08-12") }]
  }).ok
);
add(
  "OPEN_BY_DEFAULT allows range outside closed windows",
  isDateRangeAllowedForDepartment({
    settings: openSettings,
    requestedStartDate: date("2026-08-15"),
    requestedEndDate: date("2026-08-20"),
    windows: [{ status: ElectiveWindowStatus.CLOSED, startsAt: date("2026-08-01"), endsAt: date("2026-08-12") }]
  }).ok
);
add(
  "CLOSED_BY_DEFAULT requires open window containment",
  isDateRangeAllowedForDepartment({
    settings: closedSettings,
    requestedStartDate: date("2026-09-03"),
    requestedEndDate: date("2026-09-10"),
    windows: [{ status: ElectiveWindowStatus.OPEN, startsAt: date("2026-09-01"), endsAt: date("2026-09-30") }]
  }).ok
);
add(
  "CLOSED_BY_DEFAULT treats date windows as whole calendar days",
  isDateRangeAllowedForDepartment({
    settings: closedSettings,
    requestedStartDate: date("2026-09-01"),
    requestedEndDate: date("2026-09-14"),
    windows: [{ status: ElectiveWindowStatus.OPEN, startsAt: new Date("2026-09-01T09:00:00.000Z"), endsAt: new Date("2026-09-14T09:00:00.000Z") }]
  }).ok
);
add(
  "CLOSED_BY_DEFAULT rejects range outside open window",
  !isDateRangeAllowedForDepartment({
    settings: closedSettings,
    requestedStartDate: date("2026-10-03"),
    requestedEndDate: date("2026-10-10"),
    windows: [{ status: ElectiveWindowStatus.OPEN, startsAt: date("2026-09-01"), endsAt: date("2026-09-30") }]
  }).ok
);
add(
  "capacity override wins over base capacity",
  getEffectiveCapacityForRange({
    settings: openSettings,
    requestedStartDate: date("2026-11-03"),
    requestedEndDate: date("2026-11-10"),
    windows: [{ status: ElectiveWindowStatus.OPEN, startsAt: date("2026-11-01"), endsAt: date("2026-11-30"), capacityOverride: 1 }]
  }) === 1
);

const availabilitySource = readFileSync(join(process.cwd(), "src/lib/elective-availability.ts"), "utf8");
const studentElectivesSource = readFileSync(join(process.cwd(), "src/lib/student-electives.ts"), "utf8");
const studentCatalogSource = readFileSync(join(process.cwd(), "src/components/electives/student-electives-catalog.tsx"), "utf8");
add("server validation blocks full capacity", availabilitySource.includes("approvedOverlapCount >= range.capacity"));
add("student catalog flags full capacity results", studentElectivesSource.includes("remainingCapacity <= 0") && studentElectivesSource.includes("ok: false as const"));
add("student matching uses approved overlap count", studentElectivesSource.includes("countApprovedApplicationsOverlappingRange"));
add("expanded row fetches capacity check by selected date range", studentCatalogSource.includes("/api/electives/departments/") && studentCatalogSource.includes("remainingCapacity"));
add("calendar marks full days from approved bookings", studentCatalogSource.includes("approvedBookingsForDay") && studentCatalogSource.includes("מלא"));
add("inline date picker keeps server validation path", !studentCatalogSource.includes("פתח לוח שנה") && studentCatalogSource.includes("checkDates(department"));

const failures = checks.filter((check) => !check.ok);
console.log(JSON.stringify({ ok: failures.length === 0, checked: checks.length, failed: failures.length, failures }, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
