import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  buildClinicalRotationPaymentLinkEmailPayload,
  canManageClinicalRotationHospital,
  evaluateClinicalRotationCoreLimit,
  isClinicalRotationDateRangeAllowed,
  summarizeClinicalRotationDashboard,
  validateClinicalRotationOfferingPublishInput
} from "@/lib/clinical-rotations-shared";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function collectPages(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return collectPages(fullPath);
    }

    return entry === "page.tsx" || entry === "layout.tsx" ? [fullPath] : [];
  });
}

function verifyAvailability() {
  const closed = isClinicalRotationDateRangeAllowed({
    requestedStartAt: date("2026-09-01"),
    requestedEndAt: date("2026-09-14"),
    openWindows: [],
    blackouts: []
  });
  assert(!closed.ok && closed.code === "DEFAULT_CLOSED", "default-closed availability failed");

  const blackout = isClinicalRotationDateRangeAllowed({
    requestedStartAt: date("2026-09-01"),
    requestedEndAt: date("2026-09-14"),
    openWindows: [{ startsAt: date("2026-09-01"), endsAt: date("2026-09-30") }],
    blackouts: [{ startsAt: date("2026-09-10"), endsAt: date("2026-09-12") }]
  });
  assert(!blackout.ok && blackout.code === "BLACKOUT", "blackout block failed");
}

function verifyPublishValidation() {
  const invalidLink = validateClinicalRotationOfferingPublishInput({
    hospitalId: "hospital_a",
    specialtyId: "specialty_a",
    displayName: "Internal Medicine rotation",
    startsAt: date("2026-09-01"),
    endsAt: date("2026-09-14"),
    minimumParticipants: 2,
    maximumCapacity: 5,
    minDurationWeeks: 1,
    maxDurationWeeks: 4,
    priceAmount: 500,
    paymentMethod: "EXTERNAL_PAYMENT_LINK",
    paymentLink: "http://payments.example.test/checkout",
    requirements: "אישור לימודים וביטוח",
    cancellationPolicy: "ביטול דורש אישור מתאם",
    openWindows: [{ startsAt: date("2026-09-01"), endsAt: date("2026-09-30") }],
    blackouts: []
  });
  assert(!invalidLink.ok, "external payment link allowed non-HTTPS URL");
}

function verifyEmailPayload() {
  const payload = buildClinicalRotationPaymentLinkEmailPayload({
    studentName: "Student",
    studentEmail: "student@example.test",
    hospitalName: "Hospital",
    offeringName: "Rotation",
    dateRange: "2026-09-01 - 2026-09-14",
    amountLabel: "₪500",
    paymentLink: "https://payments.example.test/checkout",
    dashboardUrl: "https://hitmachut.org/clinical-rotations/my-rotations"
  });
  assert(payload.to === "student@example.test", "email payload recipient mismatch");
  assert(payload.text.includes("https://payments.example.test/checkout"), "email payload missing payment link");
  assert(payload.text.includes("אינה מסמנת תשלום כהושלם"), "email payload must not imply automatic paid status");
}

function verifyCoreRules() {
  const warn = evaluateClinicalRotationCoreLimit({
    completedWeeks: 4,
    futureApprovedWeeks: 1,
    requestedWeeks: 1,
    rule: { maxWeeks: 6, enforcementMode: "WARN" }
  });
  assert(warn.action === "warn", "WARN mode did not warn at limit");

  const block = evaluateClinicalRotationCoreLimit({
    completedWeeks: 4,
    futureApprovedWeeks: 1,
    requestedWeeks: 2,
    rule: { maxWeeks: 6, enforcementMode: "BLOCK" }
  });
  assert(block.action === "block", "BLOCK mode did not block excess");
}

function verifyDashboard() {
  const summary = summarizeClinicalRotationDashboard({
    now: date("2026-08-01"),
    applications: [
      {
        status: "COMPLETED",
        requestedStartAt: date("2026-07-01"),
        requestedEndAt: date("2026-07-14"),
        coreSpecialty: "INTERNAL_MEDICINE"
      },
      {
        status: "APPROVED",
        requestedStartAt: date("2026-09-01"),
        requestedEndAt: date("2026-09-07"),
        coreSpecialty: "INTERNAL_MEDICINE"
      },
      {
        status: "DECLINED",
        requestedStartAt: date("2026-09-01"),
        requestedEndAt: date("2026-09-07"),
        coreSpecialty: "PEDIATRICS"
      }
    ],
    rules: [{ coreSpecialty: "INTERNAL_MEDICINE", maxWeeks: 3, enforcementMode: "WARN" }]
  });
  const internal = summary.byCoreSpecialty.find((row) => row.coreSpecialty === "INTERNAL_MEDICINE");
  assert(summary.buckets.completed === 1, "dashboard completed bucket mismatch");
  assert(summary.buckets.upcoming === 1, "dashboard upcoming bucket mismatch");
  assert(internal?.completedWeeks === 2, "dashboard completed weeks mismatch");
  assert(internal?.futureApprovedWeeks === 1, "dashboard future approved weeks mismatch");
  assert(internal.warning, "dashboard missing core-limit warning");
}

function verifyAuthorization() {
  const accesses = [{ userId: "rep_a", hospitalId: "hospital_a", isActive: true }];
  assert(canManageClinicalRotationHospital({ sessionRole: "representative", userId: "rep_a", hospitalId: "hospital_a", accesses }), "rep could not access own hospital");
  assert(!canManageClinicalRotationHospital({ sessionRole: "representative", userId: "rep_a", hospitalId: "hospital_b", accesses }), "rep accessed another hospital");
  assert(!canManageClinicalRotationHospital({ sessionRole: "student", userId: "rep_a", hospitalId: "hospital_a", accesses }), "student role got hospital access");
  assert(canManageClinicalRotationHospital({ sessionRole: "admin", userId: "admin", hospitalId: "hospital_b", accesses: [] }), "admin did not get admin access");
}

function verifyHiddenSurface() {
  const publicFiles = [
    "src/components/layout/site-header.tsx",
    "src/components/layout/site-footer.tsx",
    "src/lib/static-pages.ts",
    "src/app/page.tsx"
  ];

  for (const file of publicFiles) {
    const content = readFileSync(file, "utf8");
    assert(!content.includes("/clinical-rotations"), `${file} exposes clinical-rotations publicly`);
  }
}

function verifyNoIndexMetadata() {
  const pages = [
    ...collectPages("src/app/clinical-rotations"),
    ...collectPages("src/app/admin/clinical-rotations")
  ];

  for (const page of pages) {
    const content = readFileSync(page, "utf8");
    assert(
      content.includes("clinicalRotationNoIndexMetadata") || content.includes("index: false"),
      `${page} missing noindex metadata`
    );
  }
}

verifyAvailability();
verifyPublishValidation();
verifyEmailPayload();
verifyCoreRules();
verifyDashboard();
verifyAuthorization();
verifyHiddenSurface();
verifyNoIndexMetadata();

console.log("PASS clinical-rotations verifier");
