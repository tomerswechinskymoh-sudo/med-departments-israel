import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type ParsedEnvValue = {
  value: string;
  source: "process.env" | ".env";
};

function parseDotEnvFile(path: string) {
  if (!existsSync(path)) {
    return new Map<string, string>();
  }

  const env = new Map<string, string>();
  const content = readFileSync(path, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env.set(key, value);
  }

  return env;
}

function readEnvValue(key: string, fileValues: Map<string, string>): ParsedEnvValue | null {
  const processValue = process.env[key];

  if (processValue) {
    return {
      value: processValue,
      source: "process.env"
    };
  }

  const fileValue = fileValues.get(key);

  if (fileValue) {
    return {
      value: fileValue,
      source: ".env"
    };
  }

  return null;
}

function classifyHost(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (["localhost", "127.0.0.1", "::1"].includes(normalized)) {
    return "local";
  }

  if (normalized.includes("neon.tech")) {
    return "remote_neon";
  }

  return "remote_other";
}

function summarizeUrl(key: string, parsed: ParsedEnvValue | null) {
  if (!parsed) {
    return {
      key,
      present: false
    };
  }

  try {
    const url = new URL(parsed.value);

    return {
      key,
      present: true,
      source: parsed.source,
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || null,
      database: url.pathname.replace(/^\//, "") || null,
      target: classifyHost(url.hostname)
    };
  } catch {
    return {
      key,
      present: true,
      source: parsed.source,
      parseError: true
    };
  }
}

const envPath = resolve(process.cwd(), ".env");
const fileValues = parseDotEnvFile(envPath);
const databaseUrl = summarizeUrl("DATABASE_URL", readEnvValue("DATABASE_URL", fileValues));
const directUrl = summarizeUrl("DIRECT_URL", readEnvValue("DIRECT_URL", fileValues));

console.log(
  JSON.stringify(
    {
      ok: true,
      prismaEnvFile: existsSync(envPath) ? ".env" : "missing",
      databaseUrl,
      directUrl,
      safeToMigrateLocal:
        databaseUrl.present === true &&
        "target" in databaseUrl &&
        databaseUrl.target === "local"
    },
    null,
    2
  )
);
