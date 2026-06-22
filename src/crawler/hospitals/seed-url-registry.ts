export type HospitalSeedUrl = {
  hospitalSlug: string;
  seedUrl: string;
  seedType: "homepage" | "doctorsIndex" | "departmentsIndex" | "clinicsIndex" | "searchPage" | "unknown";
  source: "manualPublicUrl" | "discoveredFromOfficialSite" | "masterDeptUrl";
  notes: string;
  safeToUse: boolean;
};

export const hospitalSeedUrlRegistry: HospitalSeedUrl[] = [
  {
    hospitalSlug: "shaare-zedek",
    seedUrl: "https://www.szmc.org.il/",
    seedType: "homepage",
    source: "manualPublicUrl",
    notes: "Official Shaare Zedek domain. Local DNS validation was blocked by execution quota; keep unsafe until manually verified.",
    safeToUse: false
  },
  {
    hospitalSlug: "rambam",
    seedUrl: "https://www.rambam.org.il/",
    seedType: "homepage",
    source: "manualPublicUrl",
    notes: "Official Rambam public homepage; HEAD validation returned HTTP 200.",
    safeToUse: true
  },
  {
    hospitalSlug: "yoseftal",
    seedUrl: "https://hospitals.clalit.co.il/joseftal/he/Pages/default.aspx",
    seedType: "homepage",
    source: "manualPublicUrl",
    notes: "Official Clalit/Yoseftal public homepage; HEAD validation returned HTTP 200.",
    safeToUse: true
  },
  {
    hospitalSlug: "beer-sheva-mental-health",
    seedUrl: "https://www.gov.il/he/departments/beer_sheva_mental_health_center/govil-landing-page",
    seedType: "homepage",
    source: "manualPublicUrl",
    notes: "Official gov.il landing page. HEAD returned HTTP 403; keep as safe public seed but classify site blocking if fetch fails.",
    safeToUse: true
  }
];

export function seedUrlsForHospital(hospitalSlug: string) {
  return hospitalSeedUrlRegistry.filter((seed) => seed.hospitalSlug === hospitalSlug);
}

export function safeSeedUrlsForHospital(hospitalSlug: string) {
  return seedUrlsForHospital(hospitalSlug).filter((seed) => seed.safeToUse);
}
