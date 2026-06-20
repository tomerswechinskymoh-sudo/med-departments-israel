export type WebsiteFamily = "clalit" | "sheba" | "ichilov" | "hadassah" | "unknown";

export type ParserFamily =
  | "classicDoctorCards"
  | "teamPage"
  | "inlineStaff"
  | "doctorIndexAssisted"
  | "searchDriven"
  | "jsDriven"
  | "unknown";

export type ReadinessStatus =
  | "discoveryOnly"
  | "inspectNeeded"
  | "pilotReady"
  | "safeForFullBatch"
  | "needsCalibration"
  | "needsHumanReview"
  | "blocked";

export type AutopilotMode = "plan" | "pilot" | "evaluate" | "full";

export type HospitalBaseline = {
  hospitalSlug: string;
  hospitalName: string;
  hospitalHebrew?: string;
  provider: WebsiteFamily;
  websiteFamily: WebsiteFamily;
  homepageUrl: string;
  departmentsIndexUrlCandidates: string[];
  doctorIndexUrlCandidates: string[];
  pilotUrlCandidates: string[];
  parserFamilies: ParserFamily[];
  notes: string[];
};

export type FetchSnapshot = {
  url: string;
  ok: boolean;
  statusCode: number | null;
  finalUrl: string;
  title: string | null;
  h1: string[];
  h2: string[];
  htmlLength: number;
  visibleTextLength: number;
  error: string | null;
};

export type CandidatePage = {
  url: string;
  sourceUrl: string;
  anchorText: string;
  patternType: "doctorIndex" | "doctorPage" | "teamPage" | "staffPage" | "departmentPage" | "unknown";
  parserFamily: ParserFamily;
  confidence: number;
  evidence: string;
};

export type HospitalDoctorRecord = {
  fullName: string;
  normalizedName: string;
  titlePrefix: string | null;
  role: string | null;
  unit: string | null;
  profileUrl: string | null;
  imageUrl: string | null;
  rawText: string;
  sourceUrl: string;
  hospitalSlug: string;
  hospital: string;
  parserFamily: ParserFamily;
  sourceEvidence: string;
  qaFlags: string[];
  qaSeverity: "ok" | "review" | "fail";
  profileCompleteness?: "full" | "partial" | "listOnly";
  profileTextLength?: number;
};

export type HospitalPlan = {
  hospitalSlug: string;
  hospitalName: string;
  generatedAt: string;
  provider: WebsiteFamily;
  websiteFamily: WebsiteFamily;
  knownUrls: {
    homepageUrl: string;
    departmentsIndexUrlCandidates: string[];
    doctorIndexUrlCandidates: string[];
    pilotUrlCandidates: string[];
  };
  fetches: FetchSnapshot[];
  candidatePages: CandidatePage[];
  doctorIndexExists: boolean;
  parserFamilies: ParserFamily[];
  recommendedPilotUrls: string[];
  readiness: ReadinessStatus;
  mainBlocker: string | null;
};

export type HospitalPilotEvaluation = {
  hospitalSlug: string;
  hospitalName: string;
  generatedAt: string;
  urlsUsed: string[];
  doctorIndexExists: boolean;
  parserFamily: ParserFamily;
  candidatePagesFound: number;
  pilotPagesSelected: number;
  rawDoctorRecords: number;
  profileUrlCoverage: number;
  profileFetchSuccess: number;
  reviewedRecords: number;
  productionReadyCount: number;
  missingProfileUrlCount: number;
  duplicateNameCount: number;
  duplicateProfileUrlCount: number;
  suspectedFalsePositiveCount: number;
  profileCompleteness: {
    full: number;
    partial: number;
    listOnly: number;
  };
  readiness: ReadinessStatus;
  mainBlocker: string | null;
};
