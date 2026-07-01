import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  HOSPITAL_LOGO_PATHS,
  getHospitalLogoByName,
  getHospitalLogoBySlug
} from "@/lib/hospital-logos";

type Check = {
  name: string;
  ok: boolean;
  details?: string;
};

const root = process.cwd();
const publicLogoDir = join(root, "public/logos/hospitals");
const checks: Check[] = [];

function addCheck(name: string, ok: boolean, details?: string) {
  checks.push({ name, ok, details });
}

function rel(path: string) {
  return relative(root, path);
}

function logoPathToFilePath(src: string) {
  const prefix = "/logos/hospitals/";
  if (!src.startsWith(prefix)) return null;
  return join(publicLogoDir, decodeURIComponent(src.slice(prefix.length)));
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

function read(path: string) {
  return readFileSync(path, "utf8");
}

const knownNameCases = [
  "בי״ח אסותא אשדוד",
  "מרכז רפואי שיבא",
  "מרכז רפואי ת״א סוראסקי",
  "מרכז רפואי קפלן",
  "מרכז רפואי מאיר",
  `ביה"ח אי.מ.מ.ס הסקוטי`,
  `ביה"ח המשפחה הקדושה`,
  `ביה"ח בילינסון מרכז רפואי רבין`,
  `ביה"ח השרון מרכז רפואי רבין`
];

addCheck("public logos directory exists", existsSync(publicLogoDir), rel(publicLogoDir));

const publicLogoFiles = existsSync(publicLogoDir)
  ? readdirSync(publicLogoDir).filter((file) => statSync(join(publicLogoDir, file)).isFile())
  : [];
addCheck("public logos directory has files", publicLogoFiles.length > 0, `${publicLogoFiles.length}`);

for (const name of knownNameCases) {
  const logo = getHospitalLogoByName(name);
  addCheck(`known hospital resolves logo: ${name}`, Boolean(logo), logo ?? "missing");
  if (logo) {
    const filePath = logoPathToFilePath(logo);
    addCheck(`known hospital logo file exists: ${name}`, Boolean(filePath && existsSync(filePath)), logo);
  }
}

const knownSlugCases = ["assuta-ashdod", "sheba", "meir", "kaplan", "rabin-beilinson", "rabin-hasharon"];
for (const slug of knownSlugCases) {
  const logo = getHospitalLogoBySlug(slug);
  addCheck(`known slug resolves logo: ${slug}`, Boolean(logo), logo ?? "missing");
}

addCheck("unknown hospital returns null", getHospitalLogoByName("בית חולים דמיוני שלא קיים") === null);

const missingMappedPaths = HOSPITAL_LOGO_PATHS.filter((path) => {
  const filePath = logoPathToFilePath(path);
  return !filePath || !existsSync(filePath);
});
addCheck("all resolver mapped logo files exist", missingMappedPaths.length === 0, missingMappedPaths.join(", "));

const sourceFiles = [
  ...walk(join(root, "src/app"), (path) => /\.(ts|tsx)$/.test(path)),
  ...walk(join(root, "src/components"), (path) => /\.(ts|tsx)$/.test(path)),
  ...walk(join(root, "src/lib"), (path) => /\.(ts|tsx)$/.test(path))
].filter((path) => !path.endsWith("src/lib/hospital-logos.ts"));
const hardcodedLogoPathRegex = /["'`]([^"'`]*\/logos\/hospitals\/[^"'`]*)["'`]/g;
const invalidHardcodedLogoPaths = sourceFiles.flatMap((path) => {
  const content = read(path);
  return Array.from(content.matchAll(hardcodedLogoPathRegex)).flatMap((match) => {
    const src = match[1];
    const filePath = logoPathToFilePath(src);
    return filePath && existsSync(filePath) ? [] : [`${rel(path)}:${src}`];
  });
});
addCheck(
  "no hardcoded invalid public logo paths",
  invalidHardcodedLogoPaths.length === 0,
  invalidHardcodedLogoPaths.join("; ")
);

const failed = checks.filter((check) => !check.ok);

console.log(JSON.stringify({
  ok: failed.length === 0,
  publicLogoFiles: publicLogoFiles.length,
  checkedKnownHospitals: knownNameCases.length,
  checkedMappedPaths: HOSPITAL_LOGO_PATHS.length,
  failed
}, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
