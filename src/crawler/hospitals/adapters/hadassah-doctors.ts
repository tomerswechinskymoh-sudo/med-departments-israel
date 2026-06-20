import type { HospitalBaseline, HospitalDoctorRecord } from "../types";
import { normalizeWhitespace, sleep } from "@/crawler/clalit/utils";

type HadassahDoctorApiRecord = {
  id?: string;
  ID?: string;
  IDEMPLOYEE?: string;
  title?: string;
  TITLE?: string;
  private_name?: string;
  PRIVATE_NAME?: string;
  last_name?: string;
  LAST_NAME?: string;
  role?: string;
  ROLE?: string;
  medical_center?: string;
  MEDICAL_CENTER?: string;
  department?: string;
  DEPARTMENT?: string;
  agaf?: string;
  AGAF?: string;
  field?: string;
  FIELD?: string;
  tel_num?: string;
  TEL_NUM?: string;
};

const HADASSAH_DOCTOR_API = "https://he.hadassah.org.il/api/doctors";
const PILOT_QUERIES = ["א", "ב", "ג", "ד", "ה", "י", "מ", "ר"];
const PILOT_LIMIT = 72;

function value(record: HadassahDoctorApiRecord, lower: keyof HadassahDoctorApiRecord, upper: keyof HadassahDoctorApiRecord) {
  return normalizeWhitespace(String(record[lower] ?? record[upper] ?? ""));
}

function normalizeDoctorName(fullName: string) {
  return normalizeWhitespace(fullName)
    .replace(/^(ד["״']?ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור)\s+/i, "")
    .replace(/[׳'״"]/g, "")
    .replace(/[.\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function doctorId(record: HadassahDoctorApiRecord) {
  const raw = String(record.id ?? record.ID ?? record.IDEMPLOYEE ?? "").trim();
  if (!raw) return null;
  return raw.startsWith("doctor/") ? raw : `doctor/${raw}`;
}

function profileUrlFor(record: HadassahDoctorApiRecord) {
  const id = doctorId(record);
  return id ? `https://he.hadassah.org.il/doctors${id}/` : null;
}

function parseDoctorPayload(payload: unknown): HadassahDoctorApiRecord[] {
  if (Array.isArray(payload)) return payload as HadassahDoctorApiRecord[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: HadassahDoctorApiRecord[] }).results;
  }
  return [];
}

async function fetchDoctorsForQuery(query: string) {
  const url = `${HADASSAH_DOCTOR_API}?search=${encodeURIComponent(query)}&skip=0`;
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      accept: "application/json,text/plain,*/*",
      "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7"
    }
  });
  if (!response.ok) throw new Error(`Hadassah doctor API failed: ${response.status} ${response.statusText}`);
  return parseDoctorPayload(await response.json());
}

function toDoctorRecord(record: HadassahDoctorApiRecord, baseline: HospitalBaseline): HospitalDoctorRecord | null {
  const title = value(record, "title", "TITLE");
  const privateName = value(record, "private_name", "PRIVATE_NAME");
  const lastName = value(record, "last_name", "LAST_NAME");
  const fullName = normalizeWhitespace([title, privateName, lastName].filter(Boolean).join(" "));
  const normalizedName = normalizeDoctorName(fullName);
  if (!normalizedName || normalizedName.length < 3) return null;

  const role = value(record, "role", "ROLE") || null;
  const unit = value(record, "department", "DEPARTMENT") || null;
  const field = value(record, "field", "FIELD");
  const medicalCenter = value(record, "medical_center", "MEDICAL_CENTER");
  const agaf = value(record, "agaf", "AGAF");
  const phone = value(record, "tel_num", "TEL_NUM");
  const profileUrl = profileUrlFor(record);
  const rawText = normalizeWhitespace(
    [
      fullName,
      role,
      medicalCenter,
      unit,
      agaf,
      field ? `תחום: ${field}` : "",
      phone ? `טלפון ציבורי: ${phone}` : ""
    ]
      .filter(Boolean)
      .join(" | ")
  );

  return {
    fullName,
    normalizedName,
    titlePrefix: title || null,
    role,
    unit,
    profileUrl,
    imageUrl: null,
    rawText,
    sourceUrl: `${HADASSAH_DOCTOR_API}?search=&skip=0`,
    hospitalSlug: baseline.hospitalSlug,
    hospital: baseline.hospitalName,
    parserFamily: "searchDriven",
    sourceEvidence: rawText,
    qaFlags: profileUrl ? [] : ["missingProfileUrl"],
    qaSeverity: profileUrl ? "ok" : "review",
    profileCompleteness: "partial"
  };
}

export async function crawlHadassahDoctorSearchPilot(baseline: HospitalBaseline) {
  const byKey = new Map<string, HospitalDoctorRecord>();

  for (const query of PILOT_QUERIES) {
    const records = await fetchDoctorsForQuery(query);
    for (const record of records) {
      const doctor = toDoctorRecord(record, baseline);
      if (!doctor) continue;
      const key = doctor.profileUrl ?? `${doctor.normalizedName}::${doctor.unit ?? ""}`;
      byKey.set(key, doctor);
      if (byKey.size >= PILOT_LIMIT) break;
    }
    if (byKey.size >= PILOT_LIMIT) break;
    await sleep(150);
  }

  return Array.from(byKey.values()).sort((left, right) => left.normalizedName.localeCompare(right.normalizedName, "he"));
}
