import type {
  DepartmentEnrichmentResult,
  DepartmentEnrichmentService
} from "./department-enrichment-service";

export class MockDepartmentEnrichmentService implements DepartmentEnrichmentService {
  async enrichDepartmentHeads(input: {
    departmentName: string;
    institutionName: string;
    sourceUrl?: string;
  }): Promise<DepartmentEnrichmentResult> {
    // TODO: Replace with a real parser/background fetcher. Any scraping must comply with the
    // destination site's terms of use, robots directives, and privacy obligations.
    return {
      sourceLabel: input.sourceUrl ?? "mock-public-source",
      fetchedAt: new Date().toISOString(),
      note: `תוצאת דמה עבור ${input.departmentName} ב${input.institutionName}.`,
      heads: [
        {
          name: "פרופ' יעל רותם",
          title: "מנהלת מחלקה",
          bio: "מנהלת אקדמית עם דגש על הוראה קלינית, חדשנות ומחקר רב-תחומי."
        },
        {
          name: "ד\"ר עמרי שחם",
          title: "סגן מנהל מחלקה",
          bio: "מוביל תהליכי הכשרה ומתכלל שילוב סטודנטים ומתמחים בפעילות היום-יומית."
        }
      ]
    };
  }
}
