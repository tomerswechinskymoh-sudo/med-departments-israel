import assert from "node:assert/strict";
import { test } from "node:test";
import type { PrismaClient, Prisma } from "@prisma/client";
import { getExperienceContributionEligibility } from "@/lib/onboarding-contribution";
import { signupRequestSchema } from "@/lib/validation";
import { MEDICAL_FACULTY_OPTIONS } from "@/lib/constants";
import { createSignupExperienceReceipt, readSignupExperienceReceipt, signupExperienceMatches } from "@/lib/server/signup-experience";

const faculty = MEDICAL_FACULTY_OPTIONS[0];
const account = {
  fullName: "בדיקת הרשמה", email: "signup-test@example.invalid", phone: "", password: "TestOnly12345", confirmPassword: "TestOnly12345",
  roleStatus: "medical_student", studentTrack: "six_year", studentYear: 4, medicalFaculty: faculty,
  proofConfirmed: true, privacyVerificationConsent: true, marketingConsent: false,
  onboardingInstitutionId: "test-hospital", onboardingDepartmentId: "test-department"
};

test("mandatory experience boundaries and exemptions", () => {
  for (const track of ["six_year", "four_year"] as const) {
    for (let year = 1; year <= 7; year++) {
      const result = getExperienceContributionEligibility({ roleStatus: "medical_student", studentTrack: track, studentYear: year });
      assert.equal(result.eligible, year >= (track === "six_year" ? 4 : 3), `${track} year ${year}`);
    }
  }
  for (const roleStatus of ["intern", "resident"] as const) assert.equal(getExperienceContributionEligibility({ roleStatus }).eligible, true);
  for (const roleStatus of ["specialist", "other"] as const) assert.equal(getExperienceContributionEligibility({ roleStatus }).eligible, false);
  for (const studentYear of [undefined, "", 0, 8, 4.5, "invalid"]) {
    assert.equal(getExperienceContributionEligibility({ roleStatus: "medical_student", studentTrack: "six_year", studentYear }).eligible, false);
  }
});

test("server requires enough career context to classify signup", () => {
  assert.equal(signupRequestSchema.safeParse(account).success, true);
  for (const field of ["studentTrack", "studentYear", "medicalFaculty"]) {
    assert.equal(signupRequestSchema.safeParse({ ...account, [field]: "" }).success, false, field);
  }
  for (const studentYear of [0, 8, 4.5]) assert.equal(signupRequestSchema.safeParse({ ...account, studentYear }).success, false);
  assert.equal(signupRequestSchema.safeParse({ ...account, roleStatus: "intern", onboardingInstitutionId: "" }).success, false);
  assert.equal(signupRequestSchema.safeParse({ ...account, roleStatus: "resident", onboardingDepartmentId: "" }).success, false);
  assert.equal(signupRequestSchema.safeParse({ ...account, roleStatus: "specialist" }).success, true);
});

test("signed receipt rejects forgery, expiry, extra segments and missing secret", () => {
  const old = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "local-test-only-signing-key-not-a-live-secret";
  try {
    const now = 1_800_000_000_000;
    const receipt = createSignupExperienceReceipt("test-submission", now);
    assert.equal(readSignupExperienceReceipt(receipt, now), "test-submission");
    assert.equal(readSignupExperienceReceipt(receipt, now + 24 * 60 * 60 * 1000), null);
    assert.equal(readSignupExperienceReceipt(receipt, now - 1), null);
    assert.equal(readSignupExperienceReceipt(receipt + ".extra", now), null);
    const [body, signature] = receipt.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), id: "someone-else" })).toString("base64url");
    assert.equal(readSignupExperienceReceipt(`${forgedBody}.${signature}`, now), null);
    assert.equal(readSignupExperienceReceipt(`${body}.${signature.slice(0, -1)}${signature.endsWith("x") ? "y" : "x"}`, now), null);
    assert.equal(readSignupExperienceReceipt("x".repeat(513), now), null);
    delete process.env.AUTH_SECRET;
    assert.equal(readSignupExperienceReceipt(receipt, now), null);
    assert.throws(() => createSignupExperienceReceipt("test-submission", now));
  } finally {
    if (old === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = old;
  }
});

test("saved experience must match applicant, role, student context, consent and proof", () => {
  const input = { ...account, roleStatus: "medical_student" as const, studentTrack: "six_year" as const };
  const row = {
    email: " SIGNUP-TEST@example.invalid ", reviewerType: "STUDENT", roleDetails: { studentTrack: "six_year", studentYear: 4 },
    status: "PENDING_REVIEW", consentToContact: true, consentToTerms: true, consentNoPatientInfo: true, verificationFiles: [{ id: "private-proof" }]
  };
  assert.equal(signupExperienceMatches(input, row), true);
  for (const change of [
    { email: "other@example.invalid" }, { reviewerType: "INTERN" }, { status: "REJECTED" }, { verificationFiles: [] },
    { roleDetails: null }, { roleDetails: { studentTrack: "six_year", studentYear: 5 } }, { roleDetails: { studentTrack: "four_year", studentYear: 4 } },
    { consentToContact: false }, { consentToTerms: false }, { consentNoPatientInfo: false }
  ]) assert.equal(signupExperienceMatches(input, { ...row, ...change }), false, JSON.stringify(change));
  assert.equal(signupExperienceMatches(input, null), false);
});

test("real route handlers enforce submission before account writes, using memory-only dependencies", async (t) => {
  const savedEnv = { ...process.env };
  const globalState = globalThis as typeof globalThis & { prisma?: PrismaClient };
  const oldPrisma = globalState.prisma;
  Object.assign(process.env, { NODE_ENV: "test", AUTH_SECRET: "local-test-only-signing-key-not-a-live-secret", RESEND_API_KEY: "", EMAIL_FROM: "" });
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  let networkAttempts = 0;
  t.mock.method(globalThis, "fetch", async () => { networkAttempts++; throw new Error("Network forbidden in this test"); });
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "warn", () => {});
  type SavedReview = Prisma.ReviewSubmissionUncheckedCreateInput & { id: string; verificationFiles: { id: string }[] };
  type Audit = Prisma.AuditLogUncheckedCreateInput;
  let writes: string[] = [], reads: string[] = [], audits: Audit[] = [];
  const submissions = new Map<string, SavedReview>();
  let nextId = 0;
  let user: Record<string, unknown> | null = null;
  const allowed = {
    user: {
      findUnique: async () => { reads.push("user"); return null; },
      create: async ({ data }: { data: Prisma.UserUncheckedCreateInput }) => { writes.push("user.create"); return (user = { id: `user-${++nextId}`, ...data }); },
      update: async ({ data }: { data: Prisma.UserUncheckedUpdateInput }) => { writes.push("user.update"); return (user = { ...user, ...data }); }
    },
    department: { findUnique: async ({ where }: { where: { id: string } }) => where.id === "test-department" ? { id: where.id, name: "מחלקת בדיקה", specialty: { name: "פנימית" }, institution: { name: "מוסד בדיקה" }, medicalArray: null } : null },
    reviewSubmission: {
      create: async ({ data }: { data: Prisma.ReviewSubmissionUncheckedCreateInput }) => { writes.push("review.create"); const row = { ...data, id: `submission-${++nextId}`, verificationFiles: [] }; submissions.set(row.id, row); return row; },
      findUnique: async ({ where, select }: { where: { id: string }; select: { verificationFiles: { where: { isPublic: boolean; category: string } } } }) => {
        reads.push("review");
        assert.equal(select.verificationFiles.where.isPublic, false);
        assert.equal(select.verificationFiles.where.category, "REVIEW_VERIFICATION_PROOF");
        return submissions.get(where.id) ?? null;
      }
    },
    uploadedFile: { create: async ({ data }: { data: Prisma.UploadedFileUncheckedCreateInput }) => { writes.push("file.create"); assert.equal(data.isPublic, false); const file = { ...data, id: `file-${++nextId}` }; if (data.reviewSubmissionId) submissions.get(data.reviewSubmissionId)!.verificationFiles.push({ id: file.id }); return file; } },
    auditLog: { create: async ({ data }: { data: Audit }) => { writes.push("audit.create"); audits.push(data); return data; } },
    $transaction: async (fn: (tx: PrismaClient) => unknown) => fn(db as unknown as PrismaClient)
  };
  const db = new Proxy(allowed, { get(target, key) { assert.ok(key in target, `Unexpected database operation ${String(key)}`); return Reflect.get(target, key); } });
  globalState.prisma = db as unknown as PrismaClient;
  let requestCounter = 0;
  const form = (data: Record<string, unknown>, proof = true, proofKey = "verificationProof") => {
    const f = new FormData();
    f.set("experienceContributionStatus", "");
    f.set("experienceContributionCategory", "");
    f.set("phone", "");
    for (const [key, value] of Object.entries(data)) if (value !== undefined) f.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    if (proof) f.set(proofKey, new File(["%PDF-1.4\nSYNTHETIC TEST FILE"], "test-only.pdf", { type: "application/pdf" }));
    return f;
  };
  const request = (path: string, body: FormData, headers?: Record<string, string>) => new Request(`http://localhost${path}`, { method: "POST", body, headers: { origin: "http://localhost", host: "localhost", "x-real-ip": `test-${++requestCounter}`, ...headers } });
  try {
    const signup = await import("@/app/api/auth/signup/route");
    const review = await import("@/app/api/reviews/route");
    await t.test("forged status, omitted receipt and missing classifier never create an account", async () => {
      for (const status of [undefined, "submitted", "skipped", "not_eligible", "prompted"]) {
        writes = []; reads = [];
        const response = await signup.POST(request("/api/auth/signup", form({ ...account, experienceContributionStatus: status })));
        const result = await response.json();
        assert.equal(response.status, 400, JSON.stringify(result)); assert.equal(result.code, "EXPERIENCE_REQUIRED", JSON.stringify(result));
        assert.equal(writes.length, 0); assert.deepEqual(reads, []);
      }
      const response = await signup.POST(request("/api/auth/signup", form({ ...account, studentYear: "" })));
      assert.equal(response.status, 400); assert.equal(writes.length, 0);
    });
    let validReceipt = "";
    await t.test("review persists privately and returns a server receipt only after successful submission", async () => {
      const data = {
        departmentId: "test-department", reviewerType: "STUDENT", fullName: account.fullName, email: account.email, isAnonymous: true,
        teachingQuality: 4, workAtmosphere: 4, seniorsApproachability: 4, researchExposure: 3, lifestyleBalance: 3, overallRecommendation: 4,
        pros: "הסבר מועיל במהלך סבב בדיקה סינתטי", cons: "", tips: "", consentToContact: true, consentToTerms: true, consentNoPatientInfo: true,
        roleDetails: { medicalSchool: faculty, overallRating: 4, researchEncouragement: 3, mainlyTaughtBy: "MIXED", clinicalExposure: 4, rotationLength: "שבועיים", yearOfExperience: "2026", studentTrack: "six_year", studentYear: 4 },
        signupContribution: true
      };
      const missingProof = await review.POST(request("/api/reviews", form(data, false)));
      assert.equal(missingProof.status, 400);
      for (const pros of ["", "   ", "קצר מדי", "<>".repeat(20)]) {
        writes = [];
        const empty = await review.POST(request("/api/reviews", form({ ...data, pros }, true, "verificationDocument")));
        assert.equal(empty.status, 400); assert.equal(writes.length, 0);
      }
      const response = await review.POST(request("/api/reviews", form(data, true, "verificationDocument")));
      const result = await response.json();
      assert.equal(response.status, 200, JSON.stringify(result)); validReceipt = result.signupExperienceReceipt;
      assert.ok(readSignupExperienceReceipt(validReceipt));
      const saved = submissions.get(readSignupExperienceReceipt(validReceipt)!)!;
      assert.equal(saved.status, "PENDING_REVIEW"); assert.equal(saved.isAnonymous, true); assert.equal(saved.verificationFiles.length, 1);
      const standalone = await review.POST(request("/api/reviews", form({ ...data, signupContribution: false }, true, "verificationDocument")));
      assert.equal(standalone.status, 200); assert.equal((await standalone.json()).signupExperienceReceipt, undefined);
    });
    await t.test("wrong email, wrong role, mismatched student year and deleted submission cannot be reused", async () => {
      for (const change of [{ email: "someone-else@example.invalid" }, { roleStatus: "intern" }, { studentYear: 5 }]) {
        writes = [];
        const response = await signup.POST(request("/api/auth/signup", form({ ...account, ...change, experienceContributionReceipt: validReceipt })));
        assert.equal(response.status, 400); assert.equal(writes.length, 0);
      }
      writes = [];
      const missing = await signup.POST(request("/api/auth/signup", form({ ...account, experienceContributionReceipt: createSignupExperienceReceipt("deleted-submission") })));
      assert.equal(missing.status, 400); assert.equal(writes.length, 0);
    });
    await t.test("valid saved submission permits signup and audit uses server-derived evidence", async () => {
      writes = []; audits = [];
      const response = await signup.POST(request("/api/auth/signup", form({ ...account, experienceContributionStatus: "skipped", experienceContributionCategory: "intern", experienceContributionReceipt: validReceipt })));
      assert.equal(response.status, 200); assert.ok(writes.includes("user.create"));
      const audit = audits.find((entry) => entry.action === "auth.registration")!;
      const onboarding = (audit.metadata as { onboarding: Record<string, unknown> }).onboarding;
      assert.equal(onboarding.experienceContributionStatus, "submitted");
      assert.equal(onboarding.experienceContributionCategory, "student");
      assert.equal(onboarding.experienceSubmissionId, readSignupExperienceReceipt(validReceipt));
    });
    await t.test("four-year clinical students, interns and residents require a matching review", async () => {
      const saved = submissions.get(readSignupExperienceReceipt(validReceipt)!)!;
      for (const [change, reviewerType] of [
        [{ studentTrack: "four_year", studentYear: 3 }, "STUDENT"],
        [{ roleStatus: "intern" }, "INTERN"],
        [{ roleStatus: "resident" }, "RESIDENT"]
      ] as const) {
        writes = [];
        const applicant = { ...account, ...change };
        const denied = await signup.POST(request("/api/auth/signup", form(applicant)));
        assert.equal(denied.status, 400); assert.equal((await denied.json()).code, "EXPERIENCE_REQUIRED"); assert.equal(writes.length, 0);
        const id = `submission-${++nextId}`;
        submissions.set(id, { ...saved, id, reviewerType, roleDetails: { studentTrack: applicant.studentTrack, studentYear: applicant.studentYear } });
        const accepted = await signup.POST(request("/api/auth/signup", form({ ...applicant, experienceContributionReceipt: createSignupExperienceReceipt(id) })));
        assert.equal(accepted.status, 200); assert.ok(writes.includes("user.create"));
      }
    });
    await t.test("early students, specialists and other applicants register without experience", async () => {
      for (const change of [{ studentYear: 3 }, { studentTrack: "four_year", studentYear: 2 }, { roleStatus: "specialist" }, { roleStatus: "other" }]) {
        writes = []; reads = []; audits = [];
        const response = await signup.POST(request("/api/auth/signup", form({ ...account, ...change, experienceContributionStatus: "submitted" })));
        assert.equal(response.status, 200); assert.ok(writes.includes("user.create")); assert.ok(!reads.includes("review"));
        const metadata = audits.find((entry) => entry.action === "auth.registration")!.metadata as { onboarding: Record<string, unknown> };
        assert.equal(metadata.onboarding.experienceContributionStatus, "not_eligible");
      }
    });
    await t.test("origin and rate protections remain in front of account writes", async () => {
      writes = [];
      assert.equal((await signup.POST(request("/api/auth/signup", form(account), { origin: "https://foreign.invalid" }))).status, 403);
      for (let i = 0; i < 5; i++) assert.equal((await signup.POST(request("/api/auth/signup", form(account), { "x-real-ip": "rate-test" }))).status, 400);
      assert.equal((await signup.POST(request("/api/auth/signup", form(account), { "x-real-ip": "rate-test" }))).status, 429);
      assert.equal(writes.length, 0);
    });
    assert.equal(networkAttempts, 0, "No external request is permitted");
  } finally {
    globalState.prisma = oldPrisma;
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  }
});
