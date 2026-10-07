import type {Interest} from './model';
import type {rankSpecialties} from './scoring';
type RankedSpecialty=ReturnType<typeof rankSpecialties>['ranked'][number];
// Broad construct descriptions only: occupational interest vectors do not measure
// pace, autonomy, patient continuity or clinical competence.
const descriptions:Record<Interest,string>={
 R:'עבודה מעשית וטכנית',I:'חקר ופתרון בעיות',A:'יצירתיות',
 S:'עזרה והדרכה',E:'יוזמה והובלה',C:'ארגון ועבודה שיטתית',
};
export function explainSpecialty(row:RankedSpecialty){
 const ordered=[...row.dimensions].sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)||a.dimension.localeCompare(b.dimension));
 const shared=ordered.filter(d=>d.contribution>1e-12).slice(0,3).map(d=>({
  dimension:d.dimension,
  text:d.userCentered>0?`עניין ב${descriptions[d.dimension]} — בולט יחסית גם אצלך וגם בפרופיל התחום.`:`פחות דגש על ${descriptions[d.dimension]} — נקודת דמיון בין שני הפרופילים.`,
 }));
 const considerations=ordered.filter(d=>d.contribution< -1e-12).slice(0,2).map(d=>({
  dimension:d.dimension,
  text:d.userCentered>0?`הדגש שלך על ${descriptions[d.dimension]} גדול מהדגש בפרופיל התחום, ביחס לשאר תחומי העניין.`:`פרופיל התחום מדגיש ${descriptions[d.dimension]} יותר מהפרופיל שלך, ביחס לשאר תחומי העניין.`,
 }));
 return {shared,considerations};
}
