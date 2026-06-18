import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { buildDuplicateDoctorContext, qaForNormalizedDoctor, summarizeQaFlags } from "./qa";
import type { ClalitDepartmentConfig, CrawlerOutputPaths, EnrichedDoctorRecord, NormalizedDoctorRecord, SourceEvidence } from "./types";
import { loadEnvFiles, normalizeWhitespace, readJson, safeSlugForDoctor, writeJson } from "./utils";

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_RAW_TEXT_CHARS = 6_000;
const MAX_EVIDENCE_SNIPPETS_PER_FIELD = 6;

const fellowshipSchema = z.object({
  field: z.string().nullable(),
  institution: z.string().nullable(),
  country: z.string().nullable(),
  rawText: z.string()
});

const claimSchema = z.object({
  field: z.string(),
  value: z.string(),
  evidence: z.string(),
  sourceUrl: z.string()
});

const baseNormalizedDoctorSchema = z.object({
  profileCompleteness: z.enum(["full", "partial", "listOnly"]).optional().default("partial"),
  fullName: z.string(),
  hospital: z.string(),
  department: z.string(),
  isSenior: z.boolean().nullable(),
  seniorityEvidence: z.string().nullable(),
  role: z.string().nullable(),
  unit: z.string().nullable(),
  specialties: z.array(z.string()),
  subspecialties: z.array(z.string()),
  clinicalInterests: z.array(z.string()),
  education: z.array(z.string()),
  residency: z.array(z.string()),
  fellowship: z.array(fellowshipSchema),
  academicTitles: z.array(z.string()),
  contact: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable()
  }),
  confidence: z.object({
    role: z.number().min(0).max(1),
    subspecialties: z.number().min(0).max(1),
    fellowship: z.number().min(0).max(1),
    isSenior: z.number().min(0).max(1)
  }),
  claims: z.array(claimSchema),
  missingImportantFields: z.array(z.string()),
  qaFlags: z.array(z.string()).optional().default([]),
  qaNotes: z.array(z.string()).optional().default([]),
  qaSeverity: z.enum(["ok", "review", "fail"]).optional().default("ok")
});

function normalizedDoctorSchemaForConfig(config: ClalitDepartmentConfig) {
  return baseNormalizedDoctorSchema.refine(
    (value) => value.hospital === config.hospital && value.department === config.department,
    {
      message: `Normalized output must keep hospital=${config.hospital} and department=${config.department}.`
    }
  );
}

function normalizedDoctorJsonSchema(config: ClalitDepartmentConfig) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      fullName: { type: "string" },
      hospital: { type: "string", enum: [config.hospital] },
      department: { type: "string", enum: [config.department] },
      isSenior: { type: ["boolean", "null"] },
      seniorityEvidence: { type: ["string", "null"] },
      role: { type: ["string", "null"] },
      unit: { type: ["string", "null"] },
      specialties: { type: "array", items: { type: "string" } },
      subspecialties: { type: "array", items: { type: "string" } },
      clinicalInterests: { type: "array", items: { type: "string" } },
      education: { type: "array", items: { type: "string" } },
      residency: { type: "array", items: { type: "string" } },
      fellowship: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            field: { type: ["string", "null"] },
            institution: { type: ["string", "null"] },
            country: { type: ["string", "null"] },
            rawText: { type: "string" }
          },
          required: ["field", "institution", "country", "rawText"]
        }
      },
      academicTitles: { type: "array", items: { type: "string" } },
      contact: {
        type: "object",
        additionalProperties: false,
        properties: {
          email: { type: ["string", "null"] },
          phone: { type: ["string", "null"] }
        },
        required: ["email", "phone"]
      },
      confidence: {
        type: "object",
        additionalProperties: false,
        properties: {
          role: { type: "number", minimum: 0, maximum: 1 },
          subspecialties: { type: "number", minimum: 0, maximum: 1 },
          fellowship: { type: "number", minimum: 0, maximum: 1 },
          isSenior: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["role", "subspecialties", "fellowship", "isSenior"]
      },
      claims: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            field: { type: "string" },
            value: { type: "string" },
            evidence: { type: "string" },
            sourceUrl: { type: "string" }
          },
          required: ["field", "value", "evidence", "sourceUrl"]
        }
      },
      missingImportantFields: { type: "array", items: { type: "string" } }
    },
    required: [
      "fullName",
      "hospital",
      "department",
      "isSenior",
      "seniorityEvidence",
      "role",
      "unit",
      "specialties",
      "subspecialties",
      "clinicalInterests",
      "education",
      "residency",
      "fellowship",
      "academicTitles",
      "contact",
      "confidence",
      "claims",
      "missingImportantFields"
    ]
  } as const;
}

function truncate(value: string, maxLength: number) {
  const cleanValue = normalizeWhitespace(value);
  return cleanValue.length > maxLength ? `${cleanValue.slice(0, maxLength)}…` : cleanValue;
}

function compactEvidence(evidence: Record<string, SourceEvidence[]>) {
  return Object.fromEntries(
    Object.entries(evidence).map(([field, entries]) => [
      field,
      entries.slice(0, MAX_EVIDENCE_SNIPPETS_PER_FIELD).map((entry) => ({
        value: truncate(entry.value, 500),
        snippet: truncate(entry.snippet, 900)
      }))
    ])
  );
}

function buildPromptPayload(doctor: EnrichedDoctorRecord) {
  return {
    profileCompleteness: doctor.profileCompleteness,
    fullName: doctor.profile.fullName ?? doctor.fullName,
    sourceUrl: doctor.profile.sourceUrl,
    hospital: doctor.hospital,
    department: doctor.department,
    rawProfileText: truncate(doctor.profile.rawProfileText, MAX_RAW_TEXT_CHARS),
    extractedFields: {
      academicTitle: doctor.profile.academicTitle,
      role: doctor.profile.role,
      unit: doctor.profile.unit,
      specialties: doctor.profile.specialties,
      subspecialties: doctor.profile.subspecialties,
      clinicalInterests: doctor.profile.clinicalInterests,
      education: doctor.profile.education,
      residency: doctor.profile.residency,
      fellowship: doctor.profile.fellowship,
      previousRoles: doctor.profile.previousRoles,
      languages: doctor.profile.languages,
      contactDetails: doctor.profile.contactDetails,
      profileImage: doctor.profile.profileImage,
      warnings: doctor.profile.warnings
    },
    evidence: compactEvidence(doctor.profile.evidence)
  };
}

export function buildClalitAiMessages(doctor: EnrichedDoctorRecord, config: ClalitDepartmentConfig) {
  return [
    {
      role: "system",
      content:
        "You normalize already-scraped Israeli hospital doctor profile evidence. Return valid JSON only. Do not invent missing data. Use null or [] when evidence is absent. Keep Hebrew evidence snippets exactly as supplied. Every non-null important claim must be supported by evidence from the supplied text/snippets. isSenior must be true only when profile text explicitly supports רופא בכיר, מנהל, סגן מנהל, אחראי, פרופ׳, senior physician, director, or head of unit. If only רופא appears without seniority evidence, return isSenior null, not false. Confidence values must be 0 to 1."
    },
    {
      role: "user",
      content: JSON.stringify({
        task:
          "Normalize and classify this doctor profile. Return only the requested JSON shape. Do not infer facts beyond the evidence.",
        outputContract: {
          fullName: "string",
          hospital: config.hospital,
          department: config.department,
          isSenior: "boolean|null",
          seniorityEvidence: "string|null",
          role: "string|null",
          unit: "string|null",
          specialties: "string[]",
          subspecialties: "string[]",
          clinicalInterests: "string[]",
          education: "string[]",
          residency: "string[]",
          fellowship: [{ field: "string|null", institution: "string|null", country: "string|null", rawText: "string" }],
          academicTitles: "string[]",
          contact: { email: "string|null", phone: "string|null" },
          confidence: { role: "number", subspecialties: "number", fellowship: "number", isSenior: "number" },
          claims: [{ field: "string", value: "string", evidence: "string", sourceUrl: "string" }],
          missingImportantFields: "string[]"
        },
        data: buildPromptPayload(doctor)
      })
    }
  ] as const;
}

function extractJsonText(payload: unknown) {
  const choice = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0];
  const content = choice?.message?.content;
  return typeof content === "string" ? content : null;
}

async function callOpenAi(doctor: EnrichedDoctorRecord, config: ClalitDepartmentConfig, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
      temperature: 0,
      messages: buildClalitAiMessages(doctor, config),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "clalit_department_doctor_normalization",
          strict: true,
          schema: normalizedDoctorJsonSchema(config)
        }
      }
    })
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message = (payload as { error?: { message?: string } })?.error?.message ?? "OpenAI call failed.";
    throw new Error(message);
  }

  const content = extractJsonText(payload);
  if (!content) throw new Error("OpenAI returned no JSON content.");

  return normalizedDoctorSchemaForConfig(config).parse(JSON.parse(content)) as NormalizedDoctorRecord;
}

async function readCached(cachePath: string, config: ClalitDepartmentConfig) {
  try {
    return normalizedDoctorSchemaForConfig(config).parse(JSON.parse(await fs.readFile(cachePath, "utf8"))) as NormalizedDoctorRecord;
  } catch {
    return null;
  }
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
}

function buildSummary(
  inputDoctors: number,
  normalized: NormalizedDoctorRecord[],
  cacheHits: number,
  openAiCalls: number,
  failures: unknown[],
  paths: CrawlerOutputPaths
) {
  const confidenceFields = ["role", "subspecialties", "fellowship", "isSenior"] as const;

  return {
    ok: failures.length === 0,
    inputDoctors,
    openAiCalls,
    cacheHits,
    normalizedDoctors: normalized.length,
    failedDoctors: failures.length,
    seniorCount: normalized.filter((doctor) => doctor.isSenior === true).length,
    fellowshipCount: normalized.filter((doctor) => doctor.fellowship.length > 0).length,
    missingFellowshipCount: normalized.filter((doctor) => doctor.fellowship.length === 0).length,
    averageConfidence: Object.fromEntries(
      confidenceFields.map((field) => [field, average(normalized.map((doctor) => doctor.confidence[field]))])
    ),
    outputPath: paths.aiNormalizedPath,
    cacheDir: paths.aiCacheDir,
    failures,
    first3: normalized.slice(0, 3)
  };
}

export async function normalizeClalitDepartmentWithAi(options: {
  config: ClalitDepartmentConfig;
  paths: CrawlerOutputPaths;
  dryRun?: boolean;
  force?: boolean;
}) {
  const { config, paths, dryRun = false, force = false } = options;

  await loadEnvFiles();
  await fs.mkdir(paths.aiCacheDir, { recursive: true });

  const doctors = await readJson<EnrichedDoctorRecord[]>(paths.enrichedPath);
  const duplicateContext = buildDuplicateDoctorContext(doctors);
  if (dryRun) {
    const first = doctors[0];
    if (!first) throw new Error("No input doctors found.");

    return {
      dryRun: true,
      wouldCallOpenAI: false,
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
      cachePath: path.join(paths.aiCacheDir, `${safeSlugForDoctor(first)}.json`),
      messages: buildClalitAiMessages(first, config)
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      reason: `OPENAI_API_KEY is missing. Set OPENAI_API_KEY and rerun npm run ai:normalize:clalit-department -- --id ${config.id}.`,
      inputDoctors: doctors.length,
      openAiCalls: 0,
      cacheHits: 0
    };
  }
  const confirmedApiKey = apiKey;

  const normalizedByIndex: Array<NormalizedDoctorRecord | undefined> = new Array(doctors.length);
  const failures: Array<{ fullName: string; sourceUrl: string | null; error: string }> = [];
  let cacheHits = 0;
  let openAiCalls = 0;
  const configuredConcurrency = Number.parseInt(process.env.OPENAI_CONCURRENCY ?? "5", 10);
  const concurrency = Number.isFinite(configuredConcurrency) ? Math.min(5, Math.max(1, configuredConcurrency)) : 5;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < doctors.length) {
      const index = nextIndex;
      nextIndex += 1;
      const doctor = doctors[index];
      const cachePath = path.join(paths.aiCacheDir, `${safeSlugForDoctor(doctor)}.json`);
      const cached = force ? null : await readCached(cachePath, config);
      if (cached) {
        cacheHits += 1;
        const resultWithQa = qaForNormalizedDoctor(cached, doctor, config, duplicateContext);
        normalizedByIndex[index] = resultWithQa;
        await writeJson(cachePath, resultWithQa);
        continue;
      }

      try {
        const result = await callOpenAi(doctor, config, confirmedApiKey);
        openAiCalls += 1;
        const resultWithQa = qaForNormalizedDoctor(result, doctor, config, duplicateContext);
        normalizedByIndex[index] = resultWithQa;
        await writeJson(cachePath, resultWithQa);
      } catch (error) {
        failures.push({
          fullName: doctor.fullName,
          sourceUrl: doctor.profileUrl,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, doctors.length) }, () => worker()));
  const normalized = normalizedByIndex.filter((record): record is NormalizedDoctorRecord => Boolean(record));

  await writeJson(paths.aiNormalizedPath, normalized);
  return {
    ...buildSummary(doctors.length, normalized, cacheHits, openAiCalls, failures, paths),
    qaFlagsSummary: summarizeQaFlags(normalized)
  };
}
