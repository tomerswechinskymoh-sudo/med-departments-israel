import type { HospitalBaseline } from "./types";

export const hospitalBaselines: HospitalBaseline[] = [
  {
    hospitalSlug: "rabin",
    hospitalName: "Rabin Medical Center",
    hospitalHebrew: "מרכז רפואי רבין",
    provider: "clalit",
    websiteFamily: "clalit",
    homepageUrl: "https://hospitals.clalit.co.il/rabin/he/Pages/default.aspx",
    departmentsIndexUrlCandidates: [
      "https://hospitals.clalit.co.il/rabin/he/departments-and-clinics/Pages/default.aspx"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [],
    parserFamilies: ["classicDoctorCards", "teamPage"],
    notes: ["Baseline: Clalit classic *_doctors.aspx pages with profile URLs."]
  },
  {
    hospitalSlug: "carmel",
    hospitalName: "Carmel Medical Center",
    hospitalHebrew: "מרכז רפואי כרמל",
    provider: "clalit",
    websiteFamily: "clalit",
    homepageUrl: "https://hospitals.clalit.co.il/carmel/he/Pages/default.aspx",
    departmentsIndexUrlCandidates: [
      "https://hospitals.clalit.co.il/carmel/he/med_units/Pages/default.aspx"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [],
    parserFamilies: ["teamPage", "inlineStaff"],
    notes: ["Baseline: Clalit team pages, MedicalStaffControl and inline sections."]
  },
  {
    hospitalSlug: "soroka",
    hospitalName: "Soroka Medical Center",
    hospitalHebrew: "מרכז רפואי סורוקה",
    provider: "clalit",
    websiteFamily: "clalit",
    homepageUrl: "https://hospitals.clalit.co.il/soroka/he/Pages/default.aspx",
    departmentsIndexUrlCandidates: [
      "https://hospitals.clalit.co.il/soroka/he/med-units/Pages/default.aspx"
    ],
    doctorIndexUrlCandidates: [
      "https://hospitals.clalit.co.il/soroka/he/our-specialists/Pages/default.aspx"
    ],
    pilotUrlCandidates: [],
    parserFamilies: ["inlineStaff", "doctorIndexAssisted"],
    notes: ["Baseline: central doctor index plus noisy inline unit pages."]
  },
  {
    hospitalSlug: "sheba",
    hospitalName: "Sheba Medical Center",
    hospitalHebrew: "המרכז הרפואי שיבא",
    provider: "sheba",
    websiteFamily: "sheba",
    homepageUrl: "https://www.sheba.co.il/",
    departmentsIndexUrlCandidates: ["https://www.sheba.co.il/hospitals-clinics"],
    doctorIndexUrlCandidates: ["https://www.sheba.co.il/lobbies-container/doctors-lobby"],
    pilotUrlCandidates: ["https://www.sheba.co.il/lobbies-container/doctors-lobby"],
    parserFamilies: ["doctorIndexAssisted", "jsDriven", "unknown"],
    notes: ["Target: inspect doctor lobby for static HTML, JS state or API-backed data."]
  },
  {
    hospitalSlug: "ichilov",
    hospitalName: "Tel Aviv Sourasky / Ichilov",
    hospitalHebrew: "המרכז הרפואי תל אביב ע״ש סוראסקי",
    provider: "ichilov",
    websiteFamily: "ichilov",
    homepageUrl: "https://www.tasmc.org.il/",
    departmentsIndexUrlCandidates: ["https://www.tasmc.org.il/medical-services/"],
    doctorIndexUrlCandidates: ["https://www.tasmc.org.il/doctorssearch/"],
    pilotUrlCandidates: ["https://www.tasmc.org.il/doctorssearch/"],
    parserFamilies: ["searchDriven", "jsDriven", "unknown"],
    notes: ["Target: inspect doctor search source and profile-link coverage."]
  },
  {
    hospitalSlug: "hadassah",
    hospitalName: "Hadassah Medical Center",
    hospitalHebrew: "הדסה",
    provider: "hadassah",
    websiteFamily: "hadassah",
    homepageUrl: "https://he.hadassah.org.il/",
    departmentsIndexUrlCandidates: [
      "https://he.hadassah.org.il/medicine-specialization/internship-programs/"
    ],
    doctorIndexUrlCandidates: ["https://he.hadassah.org.il/doctor-search/"],
    pilotUrlCandidates: ["https://he.hadassah.org.il/doctor-search/"],
    parserFamilies: ["searchDriven", "jsDriven", "unknown"],
    notes: ["Doctor search is backed by the public /api/doctors endpoint; profile pages are Next shells with limited public metadata."]
  },
  {
    hospitalSlug: "meir",
    hospitalName: "Meir Medical Center",
    hospitalHebrew: "מרכז רפואי מאיר",
    provider: "clalit",
    websiteFamily: "clalit",
    homepageUrl: "https://hospitals.clalit.co.il/meir/he/Pages/default.aspx",
    departmentsIndexUrlCandidates: ["https://hospitals.clalit.co.il/meir/he/med/Pages/default.aspx"],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [
      "https://hospitals.clalit.co.il/meir/he/med/eyes/Pages/%D7%94%D7%A6%D7%95%D7%95%D7%AA-%D7%A9%D7%9C%D7%A0%D7%95.aspx"
    ],
    parserFamilies: ["teamPage", "inlineStaff", "unknown"],
    notes: ["Target: Clalit team page generalization from Carmel/Soroka patterns."]
  }
];

export function getHospitalBaseline(hospitalSlug: string) {
  const baseline = hospitalBaselines.find((hospital) => hospital.hospitalSlug === hospitalSlug);
  if (!baseline) {
    throw new Error(`Unknown hospital "${hospitalSlug}". Known: ${hospitalBaselines.map((item) => item.hospitalSlug).join(", ")}`);
  }
  return baseline;
}
