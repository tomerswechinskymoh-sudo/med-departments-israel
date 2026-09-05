import { unstable_cache } from "next/cache";

type AsyncFn<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;
export type PublicDataCacheDiagnosticEvent = {
  event: "neon_transfer_cache";
  name: string;
  cacheStatus: string;
  bytes: number;
  runtime: "build" | "runtime";
};

export const PUBLIC_DATA_CACHE_REVALIDATE_SECONDS = 60 * 60;

export const PUBLIC_DATA_CACHE_TAGS = {
  departments: "public-departments",
  directory: "public-directory",
  departmentDetails: "public-department-details",
  specialtyMetrics: "public-specialty-metrics",
  dataExplanations: "public-data-explanations",
  metricExplanations: "public-metric-explanations",
  options: "public-options"
} as const;

const globalForPublicDataCache = globalThis as typeof globalThis & {
  publicDataMemoryCache?: Map<string, { expiresAt: number; value: unknown }>;
  publicDataCacheDiagnostics?: PublicDataCacheDiagnosticEvent[];
};

const memoryCache = globalForPublicDataCache.publicDataMemoryCache ?? new Map<string, { expiresAt: number; value: unknown }>();
globalForPublicDataCache.publicDataMemoryCache = memoryCache;
const diagnostics = globalForPublicDataCache.publicDataCacheDiagnostics ?? [];
globalForPublicDataCache.publicDataCacheDiagnostics = diagnostics;

function isStandaloneScriptRuntime() {
  if (process.env.NEXT_RUNTIME || process.env.NEXT_PHASE) return false;

  return process.argv.some(
    (arg) =>
      arg.includes("/tsx") ||
      arg.endsWith(".ts") ||
      arg.endsWith(".tsx") ||
      arg.includes("verify-neon-network-transfer")
  );
}

function useMemoryCache() {
  return process.env.NEON_TRANSFER_MEMORY_CACHE === "1" || isStandaloneScriptRuntime();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function cacheKey(name: string, args: unknown[]) {
  return `${name}:${stableStringify(args)}`;
}

function logDiagnostic(name: string, cacheStatus: string, result: unknown) {
  if (process.env.NEON_TRANSFER_DIAGNOSTICS !== "1") return;

  const serialized = JSON.stringify(result, (_key, item) =>
    typeof item === "bigint" ? item.toString() : item
  );

  const event: PublicDataCacheDiagnosticEvent = {
    event: "neon_transfer_cache",
    name,
    cacheStatus,
    bytes: Buffer.byteLength(serialized ?? "null", "utf8"),
    runtime: process.env.NEXT_PHASE === "phase-production-build" ? "build" : "runtime"
  };
  diagnostics.push(event);
  console.log(JSON.stringify(event));
}

function isRecoverableNextCacheError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /incrementalCache|unstable_cache|Invariant/i.test(message);
}

export function publicDataCache<TArgs extends unknown[], TResult>(
  name: string,
  fn: AsyncFn<TArgs, TResult>,
  tags: string[]
): AsyncFn<TArgs, TResult> {
  const nextCached = unstable_cache(fn, [name], {
    revalidate: PUBLIC_DATA_CACHE_REVALIDATE_SECONDS,
    tags
  });

  return async (...args: TArgs) => {
    const key = cacheKey(name, args);

    if (useMemoryCache()) {
      const cached = memoryCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        logDiagnostic(name, "memory_hit", cached.value);
        return cached.value as TResult;
      }

      const value = await fn(...args);
      memoryCache.set(key, {
        value,
        expiresAt: Date.now() + PUBLIC_DATA_CACHE_REVALIDATE_SECONDS * 1000
      });
      logDiagnostic(name, "memory_miss", value);
      return value;
    }

    if (process.env.NEON_TRANSFER_DISABLE_NEXT_CACHE === "1") {
      const value = await fn(...args);
      logDiagnostic(name, "uncached", value);
      return value;
    }

    try {
      const value = await nextCached(...args);
      logDiagnostic(name, "next_lookup", value);
      return value;
    } catch (error) {
      if (!isRecoverableNextCacheError(error)) {
        throw error;
      }

      const value = await fn(...args);
      logDiagnostic(name, "next_unavailable", value);
      return value;
    }
  };
}

export function clearPublicDataMemoryCache() {
  memoryCache.clear();
}

export function drainPublicDataCacheDiagnosticEvents() {
  const events = [...diagnostics];
  diagnostics.length = 0;
  return events;
}
