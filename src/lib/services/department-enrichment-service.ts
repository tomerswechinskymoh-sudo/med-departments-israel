export type EnrichedDepartmentHead = {
  name: string;
  title: string;
  bio: string;
  profileImageUrl?: string;
};

export type DepartmentEnrichmentResult = {
  sourceLabel: string;
  fetchedAt: string;
  heads: EnrichedDepartmentHead[];
  note: string;
};

export interface DepartmentEnrichmentService {
  enrichDepartmentHeads(input: {
    departmentName: string;
    institutionName: string;
    sourceUrl?: string;
  }): Promise<DepartmentEnrichmentResult>;
}
