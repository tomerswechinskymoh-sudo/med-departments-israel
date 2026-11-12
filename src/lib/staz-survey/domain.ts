export const SOURCE_ID = 'STAZ_SURVEY_2020_2025';
export const SOURCE_TITLE = 'סקר הסטאז׳ (2020–2025)';
export const DISCLOSURE = 'מוצגות תגובות חיוביות נבחרות מהסקר, שאינן משקפות את כלל התגובות';
export const SOURCE_LABEL = 'מתוך סקר הסטאז׳ · 2020–2025';
export type SourceColumn = 'BL' | 'BP' | 'BG';
export const CONTEXT = {
  BL: { hospital: 'BI', department: 'BJ', rating: 'BK', questionCode: 'qus_70', rotation: 'ELECTIVE_1' },
  BP: { hospital: 'BM', department: 'BN', rating: 'BO', questionCode: 'qus_73', rotation: 'ELECTIVE_2' },
  BG: { hospital: 'CT', department: null, rating: null, questionCode: 'qus_66', rotation: 'HOSPITAL_OVERALL' }
} as const;
export type RatingEvidence = { metricCode: string; label: string; questionCode: string; question: string; sourceRowNumber: number; sourceColumn: string; rawAnswer: string; scale: string; normalizedValue: number | null; rotationContext: string; confidence: string; verified: boolean };
export type Candidate = {
  sourceReviewKey: string; sourceRowNumber: number; sourceColumnLetter: SourceColumn; sourceYear: number;
  originalHospital: string; originalDepartmentOrScope: string; sourceQuestion: string;
  rawHospital: string; rawDepartment: string; proposedText: string; originalText: string;
  sourceVerified: boolean; workbookHash: string | null; ratings: RatingEvidence[]; privacyFlags: string[];
};
export type DepartmentOption = { id: string; name: string; slug: string; institutionId: string; institution: { name: string }; specialty: { name: string } };
export type Mapping = { suggestedDepartmentId: string | null; mappedInstitutionId: string | null; mappingConfidence: string; mappingReason: string };
export type PublicSurveyExperience = { id: string; text: string | null; year: number; hospitalScope: boolean; ratings: { code: string; label: string; value: number }[] };
export function clean(value: string) { return value.normalize('NFKC').replace(/\r\n?/g, '\n').trim(); }
export function parseRating(value: string): number | null {
  const match = clean(value).match(/^([1-5])(?:\s*[-–—]\s*[^\d].*|(?:\.0)?)$/);
  return match ? Number(match[1]) : null;
}
export function privacyFlags(text: string) {
  return ['HUMAN_PRIVACY_REVIEW_REQUIRED', ...(/\b\d{7,}\b|0[2-9][\d -]{7,}/.test(text) ? ['POSSIBLE_PHONE_OR_ID'] : []), ...(/\S+@\S+|https?:\/\//i.test(text) ? ['CONTACT_DETAILS'] : []), ...(/מטופל|חולה|דוקטור|ד״ר|ד"ר|פרופ/.test(text) ? ['PERSON_OR_PATIENT_CONTEXT'] : [])];
}
function norm(v: string) { return clean(v).replace(/["'׳״.,()־-]/g, ' ').replace(/(?:בית חולים|מרכז רפואי|המרכז הרפואי|מחלקת|מחלקה)/g, '').replace(/\s+/g, ' ').trim(); }
// Explicit aliases only. Ambiguous campuses and department letters are never inferred.
const hospitalAliases: Record<string, string[]> = {
  'שיבא': ['שיבא תל השומר', 'תל השומר'], 'איכילוב': ['תל אביב סוראסקי', 'סוראסקי', 'תל אביב ע ש סוראסקי'],
  'בילינסון': ['בילינסון רבין', 'רבין בילינסון', 'ביילינסון'], 'אסף הרופא': ['שמיר', 'שמיר אסף הרופא'],
  'וולפסון': ['וולפסון חולון'], 'רמבם': ['רמב ם', 'רמבם חיפה'], 'סורוקה': ['סורוקה באר שבע'],
  'ברזילי': ['ברזילי אשקלון'], 'פוריה': ['צפון פוריה', 'פדה פוריה'], 'זיו': ['זיו צפת'],
  'העמק': ['העמק עפולה'], 'בני ציון': ['בני ציון חיפה'], 'מאיר': ['מאיר כפר סבא']
};
function hospitalKey(v: string) {
  const n = norm(v);
  for (const [key, values] of Object.entries(hospitalAliases)) if ([key, ...values].some(x => norm(x) === n)) return norm(key);
  return n;
}
const specialtyAliases: Record<string, string> = { 'כירורגיה': 'כירורגיה כללית', 'ילדים': 'רפואת ילדים', 'פנימית': 'רפואה פנימית', 'נשים': 'יילוד וגינקולוגיה', 'אורטופדיה': 'כירורגיה אורתופדית', 'אורתופדיה': 'כירורגיה אורתופדית', 'אף אוזן גרון': 'אף אוזן גרון וכירורגיית ראש וצוואר', 'עיניים': 'רפואת עיניים', 'עור': 'מחלות עור ומין', 'הרדמה': 'הרדמה', 'רדיולוגיה': 'רדיולוגיה אבחנתית' };
function specialtyKey(v: string) { const n = norm(v); return norm(specialtyAliases[n] ?? n); }
export function suggestMapping(row: Candidate, catalog: DepartmentOption[]): Mapping {
  const none = (reason: string, institution: string | null = null): Mapping => ({ suggestedDepartmentId: null, mappedInstitutionId: institution, mappingConfidence: 'NEEDS_MAPPING', mappingReason: reason });
  const hospitals = [...new Set(catalog.filter(d => hospitalKey(d.institution.name) === hospitalKey(row.rawHospital)).map(d => d.institutionId))];
  if (hospitals.length !== 1) return none('שם המוסד חסר, עמום או אינו תואם מוסד יחיד באתר');
  const institution = hospitals[0];
  if (row.sourceColumnLetter === 'BG') return none('כלל בית החולים: אין שיוך אוטומטי למחלקה ואין דירוג מחלקה', institution);
  if (/קהילה|קופת|מרפאת|מחוץ|אחר/.test(row.rawDepartment + ' ' + row.rawHospital)) return none('הקשר קהילה / מוסד חיצוני / אחר דורש בירור', institution);
  if (hospitalKey(row.originalHospital) !== hospitalKey(row.rawHospital)) return none('שם המוסד המעובד סותר את שורת המקור', institution);
  const sameHospital = catalog.filter(d => d.institutionId === institution);
  const exact = sameHospital.filter(d => norm(d.name) === norm(row.rawDepartment));
  const candidates = exact.length ? exact : sameHospital.filter(d => specialtyKey(d.specialty.name) === specialtyKey(row.rawDepartment));
  if (candidates.length !== 1) return none(candidates.length ? 'קיימות כמה יחידות מתאימות; יש לבחור מחלקה מפורשת' : 'לא נמצאה מחלקה תואמת בבטחה', institution);
  // A numbered/lettered source unit may only match an exact unit name.
  if (!exact.length && /(?:^|\s)[אבגד\d](?:\s|$)/.test(norm(row.rawDepartment))) return none('אות או מספר מחלקה אינם crosswalk מאושר', institution);
  return { suggestedDepartmentId: candidates[0].id, mappedInstitutionId: institution, mappingConfidence: exact.length ? 'EXACT_NAME' : 'UNIQUE_SPECIALTY', mappingReason: 'מוסד תואם ויעד יחיד; ההצעה מחייבת אישור אדמין' };
}
export function sourceAllowsPublication(source: { isPublicEnabled: boolean; permissionConfirmedAt: Date | string | null; permissionEvidence?: string | null }) {
  return Boolean(source.isPublicEnabled && source.permissionConfirmedAt && source.permissionEvidence?.trim());
}
