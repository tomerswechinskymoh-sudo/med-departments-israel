import path from "node:path";
import { readJson } from "./utils";

export type ClalitHospitalConfig = {
  hospitalSlug: string;
  hospitalName: string;
  hospitalHebrew: string;
  departmentsIndexUrl: string;
  departmentPathPrefixes?: string[];
  discoverInlineStaff?: boolean;
  allowTextOnlyStaffLinks?: boolean;
};

const HOSPITALS_PATH = path.join(process.cwd(), "data", "crawler", "config", "clalit-hospitals.json");

export async function loadClalitHospitalConfigs() {
  return readJson<ClalitHospitalConfig[]>(HOSPITALS_PATH);
}

export async function loadClalitHospitalConfig(hospitalSlug: string) {
  const configs = await loadClalitHospitalConfigs();
  const config = configs.find((item) => item.hospitalSlug === hospitalSlug);
  if (!config) throw new Error(`Unknown Clalit hospital slug "${hospitalSlug}".`);

  const indexUrl = new URL(config.departmentsIndexUrl);
  if (indexUrl.protocol !== "https:" || indexUrl.hostname !== "hospitals.clalit.co.il") {
    throw new Error(`Invalid Clalit departmentsIndexUrl for "${hospitalSlug}".`);
  }
  if (!indexUrl.pathname.toLowerCase().includes(`/${hospitalSlug.toLowerCase()}/`)) {
    throw new Error(`departmentsIndexUrl does not match hospital slug "${hospitalSlug}".`);
  }
  for (const prefix of config.departmentPathPrefixes ?? []) {
    if (!prefix.startsWith(`/${hospitalSlug}/`) || !prefix.endsWith("/")) {
      throw new Error(`Invalid departmentPathPrefixes entry for "${hospitalSlug}": ${prefix}`);
    }
  }

  return config;
}
