import type { HospitalBaseline, HospitalDoctorRecord } from "../types";
import { absoluteUrl, normalizeText, normalizeWhitespace, sleep } from "@/crawler/clalit/utils";

const ICHILOV_ENDPOINT =
  "https://tasmc-search-82c272.ent.westeurope.azure.elastic-cloud.com/api/as/v1/engines/tasmcprod/search.json";
const ICHILOV_PUBLIC_SEARCH_KEY = "search-zickmtrj5fe9qg3zgt8o8y2e";
const DEFAULT_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "י", "מ"];

type ElasticField<T = string> = { raw?: T; snippet?: string };

type IchilovElasticResult = {
  title?: ElasticField;
  url?: ElasticField;
  image_search?: ElasticField;
  doctor_full_name?: ElasticField;
  doctor_academic_title?: ElasticField;
  doctor_position?: ElasticField;
  doctor_units?: ElasticField<string[] | string>;
  doctor_last_name?: ElasticField;
  is_doctor?: ElasticField<string | boolean>;
};

type IchilovElasticResponse = {
  meta?: {
    page?: {
      total_results?: number;
    };
  };
  results?: IchilovElasticResult[];
  errors?: string[];
};

function rawText(value: ElasticField | undefined) {
  return normalizeWhitespace(String(value?.raw ?? value?.snippet ?? ""));
}

function rawArray(value: ElasticField<string[] | string> | undefined) {
  const raw = value?.raw;
  if (Array.isArray(raw)) return raw.map((item) => normalizeWhitespace(item)).filter(Boolean);
  return normalizeWhitespace(String(raw ?? ""))
    .split(/\s*[,;|]\s*/)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
}

function normalizeDoctorName(name: string) {
  return normalizeWhitespace(name)
    .replace(/^(ד["״']?ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור)\s+/, "")
    .replace(/[׳'״"]/g, "")
    .replace(/[.\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titlePrefix(name: string, academicTitle: string | null) {
  return (
    academicTitle ||
    normalizeWhitespace(name).match(/^(ד["״']?ר|ד״ר|ד"ר|פרופ['׳]?|פרופ׳|פרופסור|Dr\.?|Prof\.?)/i)?.[1] ||
    null
  );
}

function isDoctorSearchUrl(url: string | null): url is string {
  return Boolean(url && /\/doctorssearch\/dr\//i.test(url));
}

async function searchIchilovDoctors(letter: string, size: number) {
  const body = {
    query: letter,
    page: { size, current: 1 },
    result_fields: {
      title: { raw: {} },
      url: { raw: {} },
      image_search: { raw: {} },
      doctor_full_name: { raw: {} },
      doctor_academic_title: { raw: {} },
      doctor_position: { raw: {} },
      doctor_units: { raw: {} },
      doctor_last_name: { raw: {} },
      is_doctor: { raw: {} }
    },
    search_fields: {
      doctor_academic_title: {},
      doctor_full_name: {},
      doctor_position: {},
      doctor_units: {},
      doctor_last_name: {},
      title: {}
    }
  };

  const response = await fetch(ICHILOV_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ICHILOV_PUBLIC_SEARCH_KEY}`,
      "Content-Type": "application/json",
      "X-Swiftype-Client": "elastic-app-search-javascript"
    },
    body: JSON.stringify(body)
  });
  const json = (await response.json()) as IchilovElasticResponse;
  if (!response.ok || json.errors?.length) {
    throw new Error(`Ichilov Elastic search failed: ${json.errors?.join(", ") || response.statusText}`);
  }
  return json;
}

export async function crawlIchilovDoctorSearchPilot(baseline: HospitalBaseline, options: { letters?: string[]; size?: number } = {}) {
  const byUrl = new Map<string, HospitalDoctorRecord>();
  const letters = options.letters ?? DEFAULT_LETTERS;
  const size = options.size ?? 20;

  for (const letter of letters) {
    const json = await searchIchilovDoctors(letter, size);
    for (const result of json.results ?? []) {
      const profileUrl = absoluteUrl(rawText(result.url), "https://www.tasmc.org.il/doctorssearch/");
      if (!isDoctorSearchUrl(profileUrl)) continue;
      const name = rawText(result.doctor_full_name) || rawText(result.title);
      const normalizedName = normalizeDoctorName(name);
      if (!name || !normalizedName) continue;
      const academicTitle = rawText(result.doctor_academic_title) || null;
      const role = rawText(result.doctor_position) || null;
      const units = rawArray(result.doctor_units);
      const raw = normalizeText([academicTitle, name, role, ...units, rawText(result.title)].filter(Boolean).join("\n"));
      byUrl.set(profileUrl, {
        fullName: name,
        normalizedName,
        titlePrefix: titlePrefix(name, academicTitle),
        role,
        unit: units.join(", ") || null,
        profileUrl,
        imageUrl: absoluteUrl(rawText(result.image_search), "https://www.tasmc.org.il/"),
        rawText: raw,
        sourceUrl: "https://www.tasmc.org.il/doctorssearch/",
        hospitalSlug: baseline.hospitalSlug,
        hospital: baseline.hospitalName,
        parserFamily: "searchDriven",
        sourceEvidence: raw.slice(0, 500),
        qaFlags: [],
        qaSeverity: "ok"
      });
    }
    await sleep(150);
  }

  return Array.from(byUrl.values()).sort((left, right) => left.normalizedName.localeCompare(right.normalizedName, "he"));
}
