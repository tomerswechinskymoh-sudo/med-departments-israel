import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  CANONICAL_PUBLIC_REGIONS,
  resolveCanonicalInstitutionRegion
} from "@/lib/regions";

type Check = {
  name: string;
  ok: boolean;
  details?: string;
};

const root = process.cwd();
const checks: Check[] = [];

function addCheck(name: string, ok: boolean, details?: string) {
  checks.push({ name, ok, details });
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

function rel(path: string) {
  return relative(root, path);
}

function walk(dir: string, predicate: (path: string) => boolean = () => true): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

const regionCases = [
  {
    name: "EMMS Scottish hospital",
    institution: { name: `ביה"ח אי.מ.מ.ס הסקוטי`, city: "נצרת", region: "מרכז" },
    expected: "צפון"
  },
  {
    name: "Holy Family hospital",
    institution: { name: `ביה"ח המשפחה הקדושה`, city: "נצרת", region: "מרכז" },
    expected: "צפון"
  },
  {
    name: "Meir medical center",
    institution: { name: "מרכז רפואי מאיר", city: "כפר סבא", region: "שרון" },
    expected: "מרכז"
  },
  {
    name: "Kaplan medical center",
    institution: { name: "מרכז רפואי קפלן", city: "רחובות", region: "שפלה" },
    expected: "מרכז"
  },
  {
    name: "Sharon raw region normalizes to center",
    institution: { name: "בית חולים כללי", city: null, region: "שרון" },
    expected: "מרכז"
  },
  {
    name: "Shfela raw region normalizes to center",
    institution: { name: "בית חולים כללי", city: null, region: "שפלה" },
    expected: "מרכז"
  }
] as const;

for (const testCase of regionCases) {
  const actual = resolveCanonicalInstitutionRegion(testCase.institution);
  addCheck(testCase.name, actual === testCase.expected, `${actual} !== ${testCase.expected}`);
}

addCheck(
  "public region options exclude Sharon/Shfela",
  !CANONICAL_PUBLIC_REGIONS.includes("שרון" as never) &&
    !CANONICAL_PUBLIC_REGIONS.includes("שפלה" as never),
  CANONICAL_PUBLIC_REGIONS.join(", ")
);

const forbiddenVisibleLabels = [
  "משך המתנה לתקן",
  "זמן המתנה חציוני לתקן",
  "זמן המתנה חציוני למשרה"
];
const visibleTextFiles = [
  ...walk(join(root, "src/app"), (path) => path.endsWith(".tsx") || path.endsWith(".ts")),
  ...walk(join(root, "src/components"), (path) => path.endsWith(".tsx") || path.endsWith(".ts")),
  join(root, "src/lib/imported-metric-resolver.ts"),
  join(root, "src/lib/specialty-metrics.ts"),
  join(root, "src/lib/server/master-csv-importer.ts")
].filter((path) => existsSync(path));

const oldLabelHits = visibleTextFiles.flatMap((path) => {
  const content = read(path);
  return forbiddenVisibleLabels.flatMap((label) => content.includes(label) ? [`${rel(path)}:${label}`] : []);
});

addCheck("old wait-time visible label removed", oldLabelHits.length === 0, oldLabelHits.join("; "));

const failed = checks.filter((check) => !check.ok);

console.log(JSON.stringify({
  ok: failed.length === 0,
  checkedRegions: regionCases.length,
  publicRegions: CANONICAL_PUBLIC_REGIONS,
  failed
}, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
