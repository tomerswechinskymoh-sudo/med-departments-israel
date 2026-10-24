import { createHmac, timingSafeEqual } from "node:crypto";
import { getExperienceContributionEligibility, type ExperienceContributionEligibilityInput } from "@/lib/onboarding-contribution";

const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;
const RECEIPT_PURPOSE = "hitmachut:signup-experience:v1:";

export function canIssueSignupExperienceReceipt() {
  return Boolean(process.env.AUTH_SECRET);
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(RECEIPT_PURPOSE + payload).digest("base64url");
}

export function createSignupExperienceReceipt(submissionId: string, now = Date.now()) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Signup experience signing is not configured.");
  const payload = Buffer.from(JSON.stringify({ v: 1, id: submissionId, exp: now + RECEIPT_TTL_MS })).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function readSignupExperienceReceipt(receipt?: string | null, now = Date.now()): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !receipt || receipt.length > 512) return null;
  const parts = receipt.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [payload, providedSignature] = parts;
  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(providedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.v !== 1 || typeof decoded.id !== "string" || !decoded.id || decoded.id.length > 128 ||
        !Number.isSafeInteger(decoded.exp) || decoded.exp <= now || decoded.exp > now + RECEIPT_TTL_MS) return null;
    return decoded.id;
  } catch {
    return null;
  }
}

type SignupExperienceRecord = {
  email: string | null;
  reviewerType: string;
  roleDetails: unknown;
  status: string;
  consentToContact: boolean;
  consentToTerms: boolean;
  consentNoPatientInfo: boolean;
  verificationFiles: { id: string }[];
};

export function signupExperienceMatches(
  input: ExperienceContributionEligibilityInput & { email: string },
  submission: SignupExperienceRecord | null
) {
  const eligibility = getExperienceContributionEligibility(input);
  if (!eligibility.eligible || !submission ||
      submission.email?.trim().toLowerCase() !== input.email.trim().toLowerCase() ||
      submission.reviewerType !== eligibility.reviewerType ||
      !["PENDING_REVIEW", "APPROVED", "PUBLISHED"].includes(submission.status) ||
      !submission.consentToContact || !submission.consentToTerms || !submission.consentNoPatientInfo ||
      submission.verificationFiles.length === 0) return false;
  if (input.roleStatus === "medical_student") {
    const details = submission.roleDetails;
    if (!details || typeof details !== "object" || Array.isArray(details)) return false;
    const student = details as Record<string, unknown>;
    return student.studentTrack === input.studentTrack && student.studentYear === Number(input.studentYear);
  }
  return true;
}
