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
  },
  {
    hospitalSlug: "emek",
    hospitalName: "Emek Medical Center",
    hospitalHebrew: "מרכז רפואי העמק",
    provider: "clalit",
    websiteFamily: "clalit",
    homepageUrl: "https://hospitals.clalit.co.il/emek/he/Pages/default.aspx",
    departmentsIndexUrlCandidates: [
      "https://hospitals.clalit.co.il/emek/he/departmentsandclinics/Pages/default.aspx"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [
      "https://hospitals.clalit.co.il/emek/he/departmentsandclinics/internal_departments/Pages/skin.aspx"
    ],
    parserFamilies: ["teamPage", "inlineStaff", "classicDoctorCards"],
    notes: ["Master_Dept Wave2 baseline: Clalit department pages with possible inline/team links."]
  },
  {
    hospitalSlug: "kaplan",
    hospitalName: "Kaplan Medical Center",
    hospitalHebrew: "מרכז רפואי קפלן",
    provider: "clalit",
    websiteFamily: "clalit",
    homepageUrl: "https://hospitals.clalit.co.il/kaplan/he/Pages/default.aspx",
    departmentsIndexUrlCandidates: [
      "https://hospitals.clalit.co.il/kaplan/he/med_units/Pages/default.aspx"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [
      "https://hospitals.clalit.co.il/kaplan/he/med_units/children/Pages/default.aspx",
      "https://hospitals.clalit.co.il/kaplan/he/med_units/women_maternity/women_maternity_doctors/Pages/doctors_list.aspx"
    ],
    parserFamilies: ["teamPage", "inlineStaff", "classicDoctorCards"],
    notes: ["Master_Dept Wave2 baseline: Clalit department pages with possible inline/team links."]
  },
  {
    hospitalSlug: "wolfson",
    hospitalName: "Wolfson Medical Center",
    hospitalHebrew: "מרכז רפואי וולפסון",
    provider: "unknown",
    websiteFamily: "unknown",
    homepageUrl: "https://www.gov.il/he/departments/wolfson-medical-center/govil-landing-page",
    departmentsIndexUrlCandidates: [
      "https://www.gov.il/he/pages/medical_staff",
      "https://www.gov.il/he/pages/staff_of_the_plastic_surgery_unit",
      "https://www.gov.il/he/pages/surgery-a-chest-surgeries-staff",
      "https://www.gov.il/he/pages/nuclear_medicine_institute_staff"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [
      "https://www.gov.il/he/pages/medical_staff",
      "https://www.gov.il/he/pages/staff_of_the_plastic_surgery_unit",
      "https://www.gov.il/he/pages/surgery-a-chest-surgeries-staff",
      "https://www.gov.il/he/pages/nuclear_medicine_institute_staff"
    ],
    parserFamilies: ["teamPage", "inlineStaff", "unknown"],
    notes: ["Wave3 baseline: gov.il staff pages seeded from Master_Dept row URLs."]
  },
  {
    hospitalSlug: "maayanei-hayeshua",
    hospitalName: "Maayanei Hayeshua Medical Center",
    hospitalHebrew: "ביה\"ח מעיני הישועה",
    provider: "unknown",
    websiteFamily: "unknown",
    homepageUrl: "https://www.mymc.co.il/",
    departmentsIndexUrlCandidates: [
      "https://www.mymc.co.il/children-wing/",
      "https://www.mymc.co.il/wings/internal-affairs-division/",
      "https://www.mymc.co.il/main-departments/surgical-department/",
      "https://www.mymc.co.il/mental-health/"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [
      "https://www.mymc.co.il/children-wing/",
      "https://www.mymc.co.il/wings/internal-affairs-division/",
      "https://www.mymc.co.il/main-departments/surgical-department/",
      "https://www.mymc.co.il/mental-health/"
    ],
    parserFamilies: ["teamPage", "inlineStaff", "unknown"],
    notes: ["Wave3 baseline: private hospital department pages seeded from Master_Dept."]
  },
  {
    hospitalSlug: "galilee",
    hospitalName: "Galilee Medical Center",
    hospitalHebrew: "המרכז הרפואי לגליל",
    provider: "unknown",
    websiteFamily: "unknown",
    homepageUrl: "https://www.gmc.gov.il/",
    departmentsIndexUrlCandidates: [
      "https://www.gmc.gov.il/?department=%d7%90%d7%92%d7%a3-%d7%a0%d7%a9%d7%99%d7%9d-%d7%95%d7%99%d7%95%d7%9c%d7%93%d7%95%d7%aa",
      "https://www.gmc.gov.il/?p=10533",
      "https://www.gmc.gov.il/?p=8838",
      "https://www.gmc.gov.il/?p=10501",
      "https://www.gmc.gov.il/?p=8742"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [
      "https://www.gmc.gov.il/?department=%d7%90%d7%92%d7%a3-%d7%a0%d7%a9%d7%99%d7%9d-%d7%95%d7%99%d7%95%d7%9c%d7%93%d7%95%d7%aa",
      "https://www.gmc.gov.il/?p=10533",
      "https://www.gmc.gov.il/?p=8838",
      "https://www.gmc.gov.il/?p=10501",
      "https://www.gmc.gov.il/?p=8742"
    ],
    parserFamilies: ["inlineStaff", "teamPage", "unknown"],
    notes: ["Wave3 baseline: government hospital department pages seeded from Master_Dept."]
  },
  {
    hospitalSlug: "shamir",
    hospitalName: "Shamir Medical Center",
    hospitalHebrew: "מרכז רפואי יצחק שמיר",
    provider: "unknown",
    websiteFamily: "unknown",
    homepageUrl: "https://www.shamir.org/",
    departmentsIndexUrlCandidates: [
      "https://www.shamir.org/clinics/orthopedics/ortopedicdepartment/",
      "https://www.shamir.org/clinics/pediatrics/",
      "https://www.shamir.org/clinics/%D7%97%D7%98%D7%99%D7%91%D7%94-%D7%A4%D7%A0%D7%99%D7%9E%D7%99%D7%AA/%D7%A4%D7%A0%D7%99%D7%9E%D7%99%D7%AA-%D7%90-%D7%9E%D7%97%D7%9C%D7%A7%D7%94/",
      "https://www.shamir.org/clinics/gynecology/",
      "https://www.shamir.org/clinics/labs/cytologyandpathology/"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [
      "https://www.shamir.org/clinics/orthopedics/ortopedicdepartment/",
      "https://www.shamir.org/clinics/pediatrics/",
      "https://www.shamir.org/clinics/%D7%97%D7%98%D7%99%D7%91%D7%94-%D7%A4%D7%A0%D7%99%D7%9E%D7%99%D7%AA/%D7%A4%D7%A0%D7%99%D7%9E%D7%99%D7%AA-%D7%90-%D7%9E%D7%97%D7%9C%D7%A7%D7%94/",
      "https://www.shamir.org/clinics/gynecology/",
      "https://www.shamir.org/clinics/labs/cytologyandpathology/"
    ],
    parserFamilies: ["inlineStaff", "teamPage", "unknown"],
    notes: ["Wave3 baseline: public hospital department pages seeded from Master_Dept."]
  },
  {
    hospitalSlug: "laniado",
    hospitalName: "Laniado Medical Center",
    hospitalHebrew: "ביה\"ח לניאדו",
    provider: "unknown",
    websiteFamily: "unknown",
    homepageUrl: "https://www.laniado.org.il/",
    departmentsIndexUrlCandidates: [
      "https://www.laniado.org.il/mahlakot/%d7%99%d7%9c%d7%93%d7%99%d7%9d/",
      "https://www.laniado.org.il/mahlakot/%d7%90%d7%95%d7%a8%d7%98%d7%95%d7%a4%d7%93%d7%99%d7%94/",
      "https://www.laniado.org.il/mahlakot/%d7%a4%d7%a0%d7%99%d7%9e%d7%99%d7%aa-%d7%90/",
      "https://www.laniado.org.il/mahlakot/%d7%90%d7%92%d7%a3-%d7%a0%d7%a9%d7%99%d7%9d-%d7%95%d7%99%d7%95%d7%9c%d7%93%d7%95%d7%aa/",
      "https://www.laniado.org.il/mahlakot/%d7%9b%d7%99%d7%a8%d7%95%d7%a8%d7%92%d7%99%d7%94/"
    ],
    doctorIndexUrlCandidates: [],
    pilotUrlCandidates: [
      "https://www.laniado.org.il/mahlakot/%d7%99%d7%9c%d7%93%d7%99%d7%9d/",
      "https://www.laniado.org.il/mahlakot/%d7%90%d7%95%d7%a8%d7%98%d7%95%d7%a4%d7%93%d7%99%d7%94/",
      "https://www.laniado.org.il/mahlakot/%d7%a4%d7%a0%d7%99%d7%9e%d7%99%d7%aa-%d7%90/",
      "https://www.laniado.org.il/mahlakot/%d7%90%d7%92%d7%a3-%d7%a0%d7%a9%d7%99%d7%9d-%d7%95%d7%99%d7%95%d7%9c%d7%93%d7%95%d7%aa/",
      "https://www.laniado.org.il/mahlakot/%d7%9b%d7%99%d7%a8%d7%95%d7%a8%d7%92%d7%99%d7%94/"
    ],
    parserFamilies: ["inlineStaff", "teamPage", "unknown"],
    notes: ["Wave3 baseline: private hospital pages seeded from Master_Dept."]
  }
];

export function getHospitalBaseline(hospitalSlug: string) {
  const baseline = hospitalBaselines.find((hospital) => hospital.hospitalSlug === hospitalSlug);
  if (!baseline) {
    throw new Error(`Unknown hospital "${hospitalSlug}". Known: ${hospitalBaselines.map((item) => item.hospitalSlug).join(", ")}`);
  }
  return baseline;
}

export function registerHospitalBaseline(baseline: HospitalBaseline) {
  const index = hospitalBaselines.findIndex((hospital) => hospital.hospitalSlug === baseline.hospitalSlug);
  if (index >= 0) {
    hospitalBaselines[index] = baseline;
  } else {
    hospitalBaselines.push(baseline);
  }
  return baseline;
}
