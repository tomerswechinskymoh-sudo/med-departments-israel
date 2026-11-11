// Provenance inventory: MASTER_Spec/Dept + Data_Exp import mappings, and
// DepartmentExternalMetric/Person.sourceName. Never infer provenance from UI titles.
export type SourceVisibility = { ima: boolean; duns100: boolean; revision?: number };
const imaKeys = new Set([
  'specialtyType', 'סוג מקצוע', 'imaSyllabusText', 'imaSyllabusUrl',
  'הסבר על ההתמחות ע׳׳פ הרי', 'אתר של הר׳׳י על ההתמחות',
  'officialResidencyDuration', 'משך_התמחות_רשמי', 'משך_התמחות_רשמי (שנים)', 'משך_התמחות_רשמי (חודשים)',
  'centerSalary', 'peripherySalary', 'peripherySalaryGap', 'salaryGap', 'salary',
  'שכר_לא_פריפריה', 'שכר_פריפריה', 'שכר_פריפריה 1', 'פער_שכר_פריפריה',
  'boardStageAPassRate', 'boardStageBPassRate', 'inherited_boardStageAPassRate', 'inherited_boardStageBPassRate',
  'shlavAlephPassRate', 'shlavBetPassRate', 'boardPassA', 'boardPassB', 'מעבר_שלב_א', 'מעבר_שלב_ב'
]);
const dunsKeys = new Set(['DUNS100', 'duns100PhysiciansCount', 'dunsPhysicianRecords']);
export function sourceIsHidden(source: unknown, flags: SourceVisibility) {
  if (typeof source !== 'string') return false;
  const normalized = source.toLowerCase().replace(/[״׳"']/g, '');
  return (!flags.duns100 && /duns\s*100/.test(normalized)) ||
    (!flags.ima && /(?:^|[\s,;:/()־—-])הריי?(?=$|[\s,;:/()־—-])|\bima\b|ima\.org\.il|ההסתדרות הרפואית בישראל/.test(normalized));
}
export function metricIsHidden(key: unknown, flags: SourceVisibility) {
  return typeof key === 'string' && ((!flags.ima && imaKeys.has(key)) || (!flags.duns100 && dunsKeys.has(key)));
}
export function projectVisibleSources<T>(value: T, flags: SourceVisibility, relation = ''): T {
  const project = (v: unknown, context: string): unknown => {
    if (v === null || typeof v !== 'object' || v instanceof Date || Buffer.isBuffer(v)) return v;
    if (Array.isArray(v)) return v.map(x => project(x, context)).filter(x => x !== null);
    const row = v as Record<string, unknown>;
    if (metricIsHidden(row.metricKey ?? row.key, flags) ||
        sourceIsHidden(row.sourceName, flags) ||
        ((row.metricKey || row.criterion) && [row.sourceNotes, row.sourceLabel, row.sourceUrl].some(s => sourceIsHidden(s, flags)))) return null;
    const result: Record<string, unknown> = {};
    if (!flags.ima && row.key === 'residencyDuration') {
      return { ...row, label: 'משך התמחות בפועל', description: 'משך ההתמחות בפועל לפי הנתונים הזמינים', tooltip: 'משך ההתמחות בפועל לפי הנתונים הזמינים', sourceLabel: 'משרד הבריאות', sourceUrl: null };
    }
    for (const [key, item] of Object.entries(row)) {
      if (metricIsHidden(key, flags)) { result[key] = Array.isArray(item) ? [] : null; continue; }
      // Specialty.description is copied from imaSyllabusText by the CSV importer.
      if (!flags.ima && key === 'description' && context.toLowerCase() === 'specialty') { result[key] = ''; continue; }
      if (key === 'dataSourceNotes' && (!flags.ima || !flags.duns100)) { result[key] = null; continue; }
      result[key] = project(item, key);
    }
    return result;
  };
  return project(value, relation) as T;
}
