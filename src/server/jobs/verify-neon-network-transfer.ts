import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { PublicDataCacheDiagnosticEvent } from "@/lib/public-data-cache";

process.env.NEON_TRANSFER_DIAGNOSTICS = "1";
process.env.NEON_TRANSFER_MEMORY_CACHE ??= "1";

type QueryEvent = {
  query: string;
  params?: string;
  duration?: number;
};

type ProbeResult = {
  route: string;
  label: string;
  cacheStatus: "cold" | "repeat";
  status: "ok" | "timeout" | "error";
  errorMessage?: string;
  queryCount: number;
  duplicateQueries: number;
  rowUnits: number;
  estimatedBytes: number;
  dbCacheMissBytes: number;
  cacheHitBytes: number;
  userOverlayBytes: number;
  cacheEvents: PublicDataCacheDiagnosticEvent[];
  cacheHits: number;
  cacheMisses: number;
  durationMs: number;
};

type ProbeContext = {
  prisma: typeof import("@/lib/prisma").prisma;
  queries: typeof import("@/lib/queries");
  cache: typeof import("@/lib/public-data-cache");
  specialtyId: string | null;
  institutionFilterId: string | null;
  departmentSlug: string | null;
  departmentId: string | null;
  compareDepartmentIds: string[];
};

const args = new Set(process.argv.slice(2));
const mode = args.has("--mode=measure") ? "measure" : "verify";
const labelArg = process.argv.find((arg) => arg.startsWith("--label="));
const runLabel = labelArg?.slice("--label=".length) || (mode === "measure" ? "measurement" : "verification");
const envFileArg = process.argv.find((arg) => arg.startsWith("--env-file="));
const timeoutArg = process.argv.find((arg) => arg.startsWith("--timeout-ms="));
const PROBE_TIMEOUT_MS = Number(
  timeoutArg?.slice("--timeout-ms=".length) ?? process.env.NEON_TRANSFER_PROBE_TIMEOUT_MS ?? 15_000
);
const queryEvents: QueryEvent[] = [];

function parseDotEnvFile(filePath: string) {
  const values = new Map<string, string>();
  if (!existsSync(filePath)) return values;

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }

  return values;
}

function applyEnvFile() {
  const envFile = envFileArg?.slice("--env-file=".length);
  const filePath = envFile ? resolve(process.cwd(), envFile) : resolve(process.cwd(), ".env");
  const values = parseDotEnvFile(filePath);

  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const value = values.get(key);
    if (value && (envFile || !process.env[key])) {
      process.env[key] = value;
    }
  }
}

function addDiagnosticConnectTimeout() {
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const value = process.env[key];
    if (!value) continue;

    try {
      const url = new URL(value);
      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set("connect_timeout", "10");
        process.env[key] = url.toString();
      }
    } catch {
      // Static guards will still run; malformed env URLs fail during DB probe.
    }
  }
}

function summarizeDbTarget() {
  const value = process.env.DATABASE_URL;
  if (!value) return { present: false };

  try {
    const url = new URL(value);
    const category = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      ? "localhost"
      : url.hostname.includes("neon.tech")
        ? "Neon"
        : "other";

    return {
      present: true,
      category,
      port: url.port || "default",
      database: url.pathname.replace(/^\//, "") || null,
      pooled: url.hostname.includes("pooler"),
      sslmode: url.searchParams.get("sslmode") || null,
      envFile: envFileArg?.slice("--env-file=".length) ?? ".env"
    };
  } catch {
    return { present: true, parseError: true };
  }
}

applyEnvFile();
addDiagnosticConnectTimeout();

async function withProbeTimeout<T>(label: string, promise: Promise<T>) {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} timed out after ${PROBE_TIMEOUT_MS}ms`)),
          PROBE_TIMEOUT_MS
        );
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim();
}

function duplicateQueryCount(events: QueryEvent[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = normalizeSql(event.query);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.values()).reduce((total, count) => total + Math.max(0, count - 1), 0);
}

function cacheHitCount(events: PublicDataCacheDiagnosticEvent[]) {
  return events.filter((event) => /hit/i.test(event.cacheStatus)).length;
}

function cacheMissCount(events: PublicDataCacheDiagnosticEvent[]) {
  return events.filter((event) => /miss|uncached|unavailable/i.test(event.cacheStatus)).length;
}

function dbCacheMissBytes(events: PublicDataCacheDiagnosticEvent[]) {
  return events
    .filter((event) => /miss|uncached|unavailable/i.test(event.cacheStatus))
    .reduce((total, event) => total + event.bytes, 0);
}

function cacheHitBytes(events: PublicDataCacheDiagnosticEvent[]) {
  return events
    .filter((event) => /hit/i.test(event.cacheStatus))
    .reduce((total, event) => total + event.bytes, 0);
}

function safeStringify(value: unknown) {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
}

function byteLength(value: unknown) {
  return Buffer.byteLength(safeStringify(value) ?? "null", "utf8");
}

function countRowUnits(value: unknown, seen = new WeakSet<object>()): number {
  if (!value || typeof value !== "object") return 0;
  if (seen.has(value)) return 0;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.length + value.reduce<number>((sum, item) => sum + countRowUnits(item, seen), 0);
  }

  return Object.values(value as Record<string, unknown>).reduce<number>(
    (sum, item) => sum + countRowUnits(item, seen),
    0
  );
}

async function measureProbe<T>(
  route: string,
  label: string,
  cacheStatus: ProbeResult["cacheStatus"],
  cache: ProbeContext["cache"],
  run: () => Promise<T>
): Promise<ProbeResult> {
  queryEvents.length = 0;
  cache.drainPublicDataCacheDiagnosticEvents();
  const startedAt = Date.now();
  console.log(`NEON_TRANSFER_ROUTE_START ${cacheStatus} ${route} ${label}`);

  try {
    const result = await withProbeTimeout(`${cacheStatus} ${route}`, run());
    const durationMs = Date.now() - startedAt;
    const events = [...queryEvents];
    const cacheEvents = cache.drainPublicDataCacheDiagnosticEvents();
    const probeResult = {
      route,
      label,
      cacheStatus,
      status: "ok" as const,
      queryCount: events.length,
      duplicateQueries: duplicateQueryCount(events),
      rowUnits: countRowUnits(result),
      estimatedBytes: byteLength(result),
      dbCacheMissBytes: dbCacheMissBytes(cacheEvents),
      cacheHitBytes: cacheHitBytes(cacheEvents),
      userOverlayBytes: 0,
      cacheEvents,
      cacheHits: cacheHitCount(cacheEvents),
      cacheMisses: cacheMissCount(cacheEvents),
      durationMs
    };
    console.log(
      `NEON_TRANSFER_ROUTE_END ${cacheStatus} ${route} ok queries=${probeResult.queryCount} dbBytes=${probeResult.dbCacheMissBytes} durationMs=${durationMs}`
    );
    return probeResult;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const events = [...queryEvents];
    const cacheEvents = cache.drainPublicDataCacheDiagnosticEvents();
    const message = error instanceof Error ? error.message : String(error);
    const status = /timed out/i.test(message) ? "timeout" : "error";
    console.warn(`NEON_TRANSFER_ROUTE_END ${cacheStatus} ${route} ${status} message=${message}`);

    return {
      route,
      label,
      cacheStatus,
      status,
      errorMessage: message,
      queryCount: events.length,
      duplicateQueries: duplicateQueryCount(events),
      rowUnits: 0,
      estimatedBytes: 0,
      dbCacheMissBytes: dbCacheMissBytes(cacheEvents),
      cacheHitBytes: cacheHitBytes(cacheEvents),
      userOverlayBytes: 0,
      cacheEvents,
      cacheHits: cacheHitCount(cacheEvents),
      cacheMisses: cacheMissCount(cacheEvents),
      durationMs
    };
  }
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(3)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
  return `${bytes} B`;
}

function printResults(results: ProbeResult[]) {
  console.log(`NEON_TRANSFER_PROBE ${runLabel}`);
  console.table(
    results.map((result) => ({
      route: result.route,
      label: result.label,
      cache: result.cacheStatus,
      status: result.status,
      queries: result.queryCount,
      duplicateQueries: result.duplicateQueries,
      rowUnits: result.rowUnits,
      resultBytes: result.estimatedBytes,
      displayResultBytes: formatBytes(result.estimatedBytes),
      dbCacheMissBytes: result.dbCacheMissBytes,
      displayDbBytes: formatBytes(result.dbCacheMissBytes),
      cacheHitBytes: result.cacheHitBytes,
      displayCacheHitBytes: formatBytes(result.cacheHitBytes),
      userOverlayBytes: result.userOverlayBytes,
      cacheHits: result.cacheHits,
      cacheMisses: result.cacheMisses,
      cacheEvents: result.cacheEvents.map((event) => `${event.name}:${event.cacheStatus}`).join(", "),
      durationMs: result.durationMs,
      error: result.errorMessage ?? ""
    }))
  );

  const totals = results.reduce(
    (sum, result) => ({
      queryCount: sum.queryCount + result.queryCount,
      dbCacheMissBytes: sum.dbCacheMissBytes + result.dbCacheMissBytes,
      cacheHitBytes: sum.cacheHitBytes + result.cacheHitBytes,
      resultBytes: sum.resultBytes + result.estimatedBytes,
      failed: sum.failed + (result.status === "ok" ? 0 : 1)
    }),
    {
      queryCount: 0,
      dbCacheMissBytes: 0,
      cacheHitBytes: 0,
      resultBytes: 0,
      failed: 0
    }
  );
  console.log(`NEON_TRANSFER_SUMMARY ${JSON.stringify(totals)}`);
}

async function loadRuntime() {
  const prismaModule = await import("@/lib/prisma");
  const queries = await import("@/lib/queries");
  const cache = await import("@/lib/public-data-cache");
  const prisma = prismaModule.prisma;

  (prisma as unknown as { $on: (event: "query", cb: (event: QueryEvent) => void) => void }).$on(
    "query",
    (event) => {
      queryEvents.push(event);
    }
  );

  return { prisma, queries, cache };
}

async function buildContext(): Promise<ProbeContext> {
  const { prisma, queries, cache } = await loadRuntime();
  const filters = await queries.getDirectoryFilters();
  const specialty =
    filters.specialties.find((item) => item.name === "רפואה פנימית") ??
    filters.specialties[0] ??
    null;
  const specialtyId = specialty?.id ?? null;
  const directory = specialtyId ? await queries.getDirectoryData({ specialties: [specialtyId] }) : [];
  const firstDepartment = directory.find((item) => item.hrefDepartmentId || item.id) ?? directory[0] ?? null;
  const departmentId = firstDepartment?.hrefDepartmentId ?? firstDepartment?.id ?? null;
  const departmentSlug = firstDepartment?.slug ?? null;
  const institutionFilterId = filters.institutions[0]?.id ?? null;
  const compareDepartmentIds = directory
    .map((item) => item.hrefDepartmentId ?? item.id)
    .filter(Boolean)
    .slice(0, 4);

  cache.clearPublicDataMemoryCache();
  cache.drainPublicDataCacheDiagnosticEvents();
  queryEvents.length = 0;

  return {
    prisma,
    queries,
    cache,
    specialtyId,
    institutionFilterId,
    departmentSlug,
    departmentId,
    compareDepartmentIds
  };
}

function topLevelByteBreakdown(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, byteLength(item)])
  );
}

function objectFieldByteBreakdown(rows: Array<Record<string, unknown>>) {
  const totals = new Map<string, number>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      totals.set(key, (totals.get(key) ?? 0) + byteLength(value));
    }
  }

  return Object.fromEntries(Array.from(totals.entries()).sort((left, right) => right[1] - left[1]));
}

function duplicateValueCount(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.values()).reduce((total, count) => total + Math.max(0, count - 1), 0);
}

async function printPayloadInvestigation(context: ProbeContext) {
  const options = await context.queries.getDepartmentOptions();
  const filters = await context.queries.getDirectoryFilters();
  const firstOption = options[0] ?? null;
  const firstFilterDepartment = filters.departments[0] ?? null;

  console.log(
    `NEON_TRANSFER_PAYLOAD getDepartmentOptions ${JSON.stringify({
      bytes: byteLength(options),
      departmentCount: options.length,
      fields: firstOption ? Object.keys(firstOption) : [],
      institutionFields: firstOption?.institution ? Object.keys(firstOption.institution) : [],
      specialtyFields: firstOption?.specialty ? Object.keys(firstOption.specialty) : [],
      fieldBytes: objectFieldByteBreakdown(options as Array<Record<string, unknown>>),
      duplicateDepartmentNames: duplicateValueCount(options.map((department) => department.name)),
      duplicateInstitutionObjects: duplicateValueCount(
        options.map((department) => safeStringify(department.institution) ?? "")
      ),
      duplicateSpecialtyObjects: duplicateValueCount(
        options.map((department) => safeStringify(department.specialty) ?? "")
      )
    })}`
  );
  console.log(
    `NEON_TRANSFER_PAYLOAD getDirectoryFilters ${JSON.stringify({
      bytes: byteLength(filters),
      topLevelBytes: topLevelByteBreakdown(filters as Record<string, unknown>),
      institutions: filters.institutions.length,
      specialties: filters.specialties.length,
      regions: filters.regions.length,
      departments: filters.departments.length,
      departmentFields: firstFilterDepartment ? Object.keys(firstFilterDepartment) : [],
      departmentInstitutionFields: firstFilterDepartment?.institution
        ? Object.keys(firstFilterDepartment.institution)
        : [],
      departmentSpecialtyFields: firstFilterDepartment?.specialty
        ? Object.keys(firstFilterDepartment.specialty)
        : [],
      departmentFieldBytes: objectFieldByteBreakdown(filters.departments as Array<Record<string, unknown>>),
      duplicatedDepartmentIdsFromOptions: filters.departments.filter((department) =>
        options.some((option) => option.id === department.id)
      ).length
    })}`
  );

  context.cache.clearPublicDataMemoryCache();
  context.cache.drainPublicDataCacheDiagnosticEvents();
  queryEvents.length = 0;
}

async function runRouteProbes(context: ProbeContext, cacheStatus: ProbeResult["cacheStatus"]) {
  const q = context.queries;
  const specialtyId = context.specialtyId;
  const institutionFilterId = context.institutionFilterId;
  const departmentSlug = context.departmentSlug;
  const departmentId = context.departmentId;

  const results: ProbeResult[] = [];

  results.push(
    await measureProbe("/", "layout department options", cacheStatus, context.cache, async () => ({
      headerOptions: await q.getDepartmentOptions()
    }))
  );

  results.push(
    await measureProbe("/departments", "directory + filters + specialty dashboard", cacheStatus, context.cache, async () => ({
      filters: await q.getDirectoryFilters(),
      reviewDepartments: await q.getDepartmentOptions(),
      departments: specialtyId ? await q.getDirectoryData({ specialties: [specialtyId] }) : [],
      specialtyDashboard: specialtyId ? await q.getSpecialtyDashboardMetrics(specialtyId) : null
    }))
  );

  results.push(
    await measureProbe("/departments?specialty=...", "one specialty filter", cacheStatus, context.cache, async () => ({
      departments: specialtyId ? await q.getDirectoryData({ specialties: [specialtyId] }) : [],
      specialtyDashboard: specialtyId ? await q.getSpecialtyDashboardMetrics(specialtyId) : null
    }))
  );

  results.push(
    await measureProbe("/departments?institution=...", "one hospital filter", cacheStatus, context.cache, async () => ({
      departments:
        specialtyId && institutionFilterId
          ? await q.getDirectoryData({ specialties: [specialtyId], institutions: [institutionFilterId] })
          : []
    }))
  );

  results.push(
    await measureProbe("/departments/[slug]", "one department detail", cacheStatus, context.cache, async () => ({
      department:
        departmentSlug && departmentId
          ? await q.getDepartmentPageData(departmentSlug, undefined, departmentId)
          : null,
      dataExplanations: await q.getDataExplanations()
    }))
  );

  results.push(
    await measureProbe("/compare", "four-department comparison", cacheStatus, context.cache, async () => ({
      comparison:
        context.compareDepartmentIds.length > 0
          ? await q.getDepartmentComparisonData({
              departmentIds: context.compareDepartmentIds,
              specialtyId
            })
          : null
    }))
  );

  results.push(
    await measureProbe("/departments?search=...", "search/autocomplete source", cacheStatus, context.cache, async () => ({
      filters: await q.getDirectoryFilters(),
      departments:
        specialtyId
          ? await q.getDirectoryData({
              search: "רפואה",
              specialties: [specialtyId],
              searchAcrossSpecialties: false
            })
          : []
    }))
  );

  results.push(
    await measureProbe("/sitemap", "static sitemap page", cacheStatus, context.cache, async () => ({
      dbBacked: false
    }))
  );

  return results;
}

function assertText(condition: boolean, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

function fileText(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function verifyStaticGuards() {
  const failures: string[] = [];
  const queries = fileText("src/lib/queries.ts");
  const departmentsPage = fileText("src/app/departments/page.tsx");
  const detailPage = fileText("src/app/departments/[slug]/page.tsx");
  const comparePage = fileText("src/app/compare/page.tsx");
  const homePage = fileText("src/app/page.tsx");
  const packageJson = fileText("package.json");
  const cacheFile = fileText("src/lib/public-data-cache.ts");
  const invalidationFile = fileText("src/lib/public-data-cache-invalidation.ts");
  const verifier = fileText("src/server/jobs/verify-neon-network-transfer.ts");

  assertText(
    packageJson.includes("\"verify:neon-network-transfer\""),
    "package script verify:neon-network-transfer missing",
    failures
  );
  assertText(
    queries.includes("DIRECTORY_CARD_METRIC_KEYS") && queries.includes("directoryMetricWhere"),
    "directory metric allow-list missing",
    failures
  );
  assertText(
    queries.includes("where: directoryMetricWhere") &&
      !/metrics:\s*\{\s*select:\s*\{[\s\S]*?metricKey:\s*true,[\s\S]*?value:\s*true,[\s\S]*?rawValue:\s*true,[\s\S]*?unit:\s*true,[\s\S]*?label:\s*true,[\s\S]*?lastUpdated:\s*true[\s\S]*?\}/.test(queries),
    "directory metrics still look unrestricted or over-selected",
    failures
  );
  assertText(
    queries.includes("where: directoryYearlyMetricWhere"),
    "directory yearly metrics are not restricted",
    failures
  );
  assertText(
    queries.includes("getFavoriteDepartmentIdSet") && queries.includes("getPublicDirectoryData"),
    "viewer favorites not split from cached public directory data",
    failures
  );
  assertText(
    queries.includes("COMPARISON_DEPARTMENT_METRIC_KEYS") &&
      !queries.includes("getDepartmentPageData(department.slug, undefined, department.id)"),
    "comparison still depends on full detail query",
    failures
  );
  assertText(
    queries.includes("publicDataCache") && queries.includes("PUBLIC_DATA_CACHE_TAGS"),
    "public data cache wrapper/tags missing",
    failures
  );
  assertText(
    queries.includes("function toPublicDepartmentOption") &&
      queries.includes("function toDirectoryFilterDepartment") &&
      queries.includes("publicDepartmentFilterSelect"),
    "department option/filter payload compaction helpers missing",
    failures
  );
  assertText(
    cacheFile.includes("stableStringify") && cacheFile.includes("cacheKey(name, args)"),
    "public cache keys do not include stable serialized arguments",
    failures
  );
  assertText(
    queries.includes("getPublicDirectoryDataCached(filters)") &&
      queries.includes("getFavoriteDepartmentIdSet") &&
      queries.includes("isFavorite: false") &&
      queries.includes("favoriteDepartment.findUnique"),
    "signed-in favorite state may be shared through public cached payloads",
    failures
  );
  assertText(
    !cacheFile.includes("revalidateTag") && invalidationFile.includes("revalidateTag"),
    "cache invalidation is not isolated to route-safe module",
    failures
  );
  assertText(
    queries.includes("process.env.NEXT_PHASE === \"phase-production-build\"") &&
      queries.includes("isNextProductionBuildPhase()"),
    "build-phase guard missing or not tied to NEXT_PHASE",
    failures
  );
  assertText(
    queries.includes(".slice(0, 4)") && queries.includes("getPublicDepartmentComparisonData"),
    "comparison query is not bounded to four departments",
    failures
  );
  assertText(
    verifier.includes("const results: ProbeResult[] = []") && verifier.includes("await measureProbe"),
    "route probes are not measured sequentially",
    failures
  );
  assertText(
    !departmentsPage.includes("unstable_noStore") &&
      !departmentsPage.includes("force-dynamic") &&
      !departmentsPage.includes("revalidate = 0"),
    "departments page still forces no-store/dynamic",
    failures
  );
  assertText(
    !detailPage.includes("unstable_noStore") &&
      !detailPage.includes("force-dynamic") &&
      !detailPage.includes("revalidate = 0"),
    "department detail page still forces no-store/dynamic",
    failures
  );
  assertText(
    !comparePage.includes("force-dynamic") && !comparePage.includes("revalidate = 0"),
    "compare page still forces no-store/dynamic",
    failures
  );
  assertText(!homePage.includes("force-dynamic"), "home page still force-dynamic without DB need", failures);

  return failures;
}

async function main() {
  console.log(`NEON_TRANSFER_DB_TARGET ${JSON.stringify(summarizeDbTarget())}`);

  if (mode === "verify") {
    const failures = verifyStaticGuards();
    try {
      const context = await withProbeTimeout("buildContext", buildContext());
      await printPayloadInvestigation(context);
      const cold = await runRouteProbes(context, "cold");
      const repeat = await runRouteProbes(context, "repeat");
      const results = [...cold, ...repeat];
      printResults(results);
      await context.prisma.$disconnect();
    } catch (error) {
      console.warn("NEON_TRANSFER_PROBE_BLOCKED");
      const message = error instanceof Error ? error.message : String(error);
      const hostMatch = message.match(/at `([^`]+)`/);
      console.warn(`db_unreachable ${hostMatch?.[1] ?? "unknown"}`);
    }

    if (failures.length > 0) {
      console.error("NEON_TRANSFER_STATIC_GUARDS_FAIL");
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
    } else {
      console.log("NEON_TRANSFER_STATIC_GUARDS_PASS");
    }

    return;
  }

  const context = await withProbeTimeout("buildContext", buildContext());
  await printPayloadInvestigation(context);
  const cold = await runRouteProbes(context, "cold");
  const repeat = await runRouteProbes(context, "repeat");
  const results = [...cold, ...repeat];
  printResults(results);
  await context.prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  try {
    const prismaUrl = pathToFileURL(resolve(process.cwd(), "src/lib/prisma.ts")).href;
    const prismaModule = await import(prismaUrl);
    await prismaModule.prisma?.$disconnect?.();
  } catch {
    // best-effort disconnect after startup/import failures
  }
  process.exit(1);
});
