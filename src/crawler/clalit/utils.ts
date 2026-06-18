import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ClalitDepartmentConfig, CrawlerOutputPaths, EnrichedDoctorRecord } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "data", "crawler", "config", "clalit-departments.json");

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeWhitespace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200f\u202a-\u202e]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200f\u202a-\u202e]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .join("\n");
}

export function normalizeMultilineText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .join("\n");
}

export function absoluteUrl(value: string | null | undefined, sourceUrl: string) {
  if (!value) return null;
  const cleanValue = value.trim();
  if (!cleanValue || cleanValue.startsWith("#") || /^javascript:/i.test(cleanValue)) return null;

  try {
    return new URL(cleanValue, sourceUrl).toString();
  } catch {
    return null;
  }
}

export function safeSlugFromValue(value: string) {
  const decoded = decodeURIComponent(value);
  const filename =
    decoded
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/\.aspx$/i, "")
      .replace(/[^a-zA-Z0-9\u0590-\u05ff_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "profile";

  return filename.slice(0, 120);
}

export function safeSlugForDoctor(doctor: EnrichedDoctorRecord) {
  const source = doctor.profileUrl ?? doctor.profile.sourceUrl ?? doctor.fullName;
  const hash = crypto.createHash("sha1").update(source).digest("hex").slice(0, 8);

  return `${safeSlugFromValue(source).slice(0, 90)}-${hash}`;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(key, next);
      index += 1;
    } else {
      flags.add(key);
    }
  }

  return {
    get: (key: string) => values.get(key),
    has: (key: string) => flags.has(key) || values.has(key)
  };
}

export function outputPathsForDepartment(id: string): CrawlerOutputPaths {
  const baseDir = path.join(process.cwd(), "data", "crawler", "output", id);

  return {
    baseDir,
    doctorsPath: path.join(baseDir, "doctors.json"),
    enrichedPath: path.join(baseDir, "doctors-enriched.json"),
    aiNormalizedPath: path.join(baseDir, "doctors-ai-normalized.json"),
    inspectionPath: path.join(baseDir, "inspection.json"),
    rawListDir: path.join(baseDir, "raw", "list"),
    rawProfilesDir: path.join(baseDir, "raw", "profiles"),
    aiCacheDir: path.join(baseDir, "ai-cache")
  };
}

export async function ensureOutputDirs(paths: CrawlerOutputPaths) {
  await Promise.all([
    fs.mkdir(paths.baseDir, { recursive: true }),
    fs.mkdir(paths.rawListDir, { recursive: true }),
    fs.mkdir(paths.rawProfilesDir, { recursive: true }),
    fs.mkdir(paths.aiCacheDir, { recursive: true })
  ]);
}

export async function readJson<T>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

export async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function loadClalitDepartmentConfigs() {
  return readJson<ClalitDepartmentConfig[]>(CONFIG_PATH);
}

export async function loadClalitDepartmentConfig(id: string) {
  const configs = await loadClalitDepartmentConfigs();
  const config = configs.find((item) => item.id === id);
  if (!config) {
    throw new Error(`Unknown Clalit department config id "${id}".`);
  }

  return config;
}

export async function loadEnvFiles() {
  for (const filename of [".env.local", ".env", ".env.production.local"]) {
    try {
      const content = await fs.readFile(path.join(process.cwd(), filename), "utf8");
      for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#") || !line.includes("=")) continue;
        const [key, ...valueParts] = line.split("=");
        if (!key || process.env[key] !== undefined) continue;
        process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
      }
    } catch {
      // Missing env files are expected in local/script contexts.
    }
  }
}
