export type ClalitDepartmentConfig = {
  id: string;
  hospital: string;
  hospitalSlug: string;
  department: string;
  departmentHebrew: string;
  doctorListUrl: string;
  departmentKeywordsHebrew: string[];
  departmentKeywordsEnglish: string[];
  allowedCrossUnits: string[];
  minDoctorsExpected?: number;
  allowSmallDepartment?: boolean;
  maxDuplicateDoctors?: number;
  maxUnitMismatch?: number;
  minSpecialtyEvidenceCoverage?: number;
  maxMissingProfileUrlCoverage?: number;
  pageType?: "coreDepartment" | "unit" | "subUnit" | "clinic" | "service" | "lab" | "institute" | "unknown";
  parserType?: "rabinDoctorsPage" | "clalitTeamPage" | "inlineStaffPage" | "genericStaffPage";
  needsReview?: boolean;
  sourceDepartmentUrl?: string;
  discoveryConfidence?: number;
};

export type QaSeverity = "ok" | "review" | "fail";
export type ProfileCompleteness = "full" | "partial" | "listOnly";

export type CrawlerOutputPaths = {
  baseDir: string;
  doctorsPath: string;
  enrichedPath: string;
  aiNormalizedPath: string;
  inspectionPath: string;
  rawListDir: string;
  rawProfilesDir: string;
  aiCacheDir: string;
};

export type DoctorRecord = {
  fullName: string;
  titleOrRole: string | null;
  profileUrl: string | null;
  imageUrl: string | null;
  rawText: string;
  sourceUrl: string;
  hospital: string;
  department: string;
  sectionHeading?: string | null;
  qaFlags?: string[];
  qaNotes?: string[];
  qaSeverity?: QaSeverity;
};

export type CandidateBlock = {
  selector: string;
  textLength: number;
  doctorLikeMatches: number;
  textPreview: string;
};

export type DoctorListPageResult = {
  url: string;
  pageNumber: number;
  html: string;
  doctors: DoctorRecord[];
  discoveredPageUrls: string[];
  candidateBlocks: CandidateBlock[];
};

export type SourceEvidence = {
  value: string;
  snippet: string;
};

export type EnrichedDoctorRecord = DoctorRecord & {
  profileCompleteness: ProfileCompleteness;
  profile: {
    fullName: string | null;
    academicTitle: string | null;
    role: string | null;
    unit: string | null;
    department: string | null;
    hospital: string | null;
    specialties: string[];
    subspecialties: string[];
    clinicalInterests: string[];
    education: string[];
    residency: string[];
    fellowship: string[];
    previousRoles: string[];
    languages: string[];
    contactDetails: {
      phones: string[];
      emails: string[];
    };
    profileImage: string | null;
    rawProfileText: string;
    sourceUrl: string;
    evidence: Record<string, SourceEvidence[]>;
    warnings: string[];
  };
  qaFlags: string[];
  qaNotes: string[];
  qaSeverity: QaSeverity;
};

export type ProfileInspectionEntry = {
  sourceUrl: string;
  labelsFound: Record<string, number>;
  sectionHeadings: string[];
  candidateBlocks: Array<{
    selector: string;
    textLength: number;
    textPreview: string;
  }>;
};

export type NormalizedDoctorRecord = {
  profileCompleteness: ProfileCompleteness;
  fullName: string;
  hospital: string;
  department: string;
  isSenior: boolean | null;
  seniorityEvidence: string | null;
  role: string | null;
  unit: string | null;
  specialties: string[];
  subspecialties: string[];
  clinicalInterests: string[];
  education: string[];
  residency: string[];
  fellowship: Array<{
    field: string | null;
    institution: string | null;
    country: string | null;
    rawText: string;
  }>;
  academicTitles: string[];
  contact: {
    email: string | null;
    phone: string | null;
  };
  confidence: {
    role: number;
    subspecialties: number;
    fellowship: number;
    isSenior: number;
  };
  claims: Array<{
    field: string;
    value: string;
    evidence: string;
    sourceUrl: string;
  }>;
  missingImportantFields: string[];
  qaFlags: string[];
  qaNotes: string[];
  qaSeverity: QaSeverity;
};
