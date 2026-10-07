import medicalData from './medical-riasec.json';
import israeliData from './israeli-criteria.json';
import mmsData from './mmsccq.json';
import crosswalkData from './crosswalk.json';

export const VERSION = '2026-10-07.medical-preview.2';
export const RIASEC = ['R','I','A','S','E','C'] as const;
export type Interest = typeof RIASEC[number];
export const interestLabels:Record<Interest,string> = {R:'מעשי וטכני',I:'חקר וניתוח',A:'יצירתיות בהקשר רפואי',S:'עזרה והדרכה',E:'יזמות והובלה',C:'ארגון ועבודה שיטתית'};
export const domains = ['schedule','patient','training','experience','specialty','career','social'] as const;
export type Domain = typeof domains[number];
export const domainLabels:Record<Domain,string> = {schedule:'שעות עבודה וגורמים אישיים',patient:'מאפייני הטיפול במטופלים',training:'הכשרה',experience:'ניסיון והשפעות מעבודה קודמת',specialty:'אופי ההתמחות',career:'אפשרויות קריירה',social:'שיקולים חברתיים'};
export type Mode = 'quick'|'deep';
export type AnswerMap = Readonly<Record<string,number|null|undefined>>;
export type Item = {id:string;sourceItemId:string;sourceLocator:string;english:string;hebrew:string;source:string;translationStatus:string;adaptation:string;dimension?:Interest;domain?:Domain;helper?:string;sourceFramework:string;sourceUrl:string;construct:string;medicalDomain:string;wording:string;englishGloss?:string;reviewNote?:string;scored:boolean;reverseScored:boolean;scale:string;tracks:string};
export type Crosswalk = {specialty:string;catalog:boolean;mapping:'direct'|'approximate'|'none';code:string|null;title:string|null;description:string|null;sourceVersion:string;scores:Record<Interest,number>|null;sourceDate:string|null;sourceMethod:string|null;confidence:string;limitation:string};
export const medical = medicalData as Item[];
export const israeli = israeliData as Item[];
export const mms = mmsData as Item[];
export const crosswalk = crosswalkData as Crosswalk[];
export const itemsFor = (mode:Mode):readonly Item[] => mode==='quick'?medical:[...medical,...israeli,...mms];
export const interestChoices = ['בכלל לא','מעט','לא בטוח/ה','במידה רבה','במידה רבה מאוד'];
export const importanceChoices = ['בכלל לא חשוב','חשוב מעט','חשוב במידה בינונית','חשוב במידה רבה','חשוב במידה רבה מאוד'];
export const sectionsFor = (mode:Mode) => mode==='quick'
 ? RIASEC.map((d,i)=>({id:d,label:interestLabels[d],start:i*5,end:(i+1)*5}))
 : [{id:'medical',label:'אופי העבודה הרפואית שמושך אותי',start:0,end:30},{id:'israeli',label:'מה חשוב לי בבחירת התמחות',start:30,end:56},{id:'mmsccq',label:'קריירה, אורח חיים והכשרה',start:56,end:82}];
export const disclaimer = 'השאלון נועד לסייע בחשיבה על התאמה בין ההעדפות שלכם לבין תחומי התמחות אפשריים. הוא אינו מהווה ייעוץ אישי, אינו מחליף התנסות קלינית או שיקול דעת מקצועי, ואינו מבטיח קבלה להתמחות, שביעות רצון או הצלחה בתחום.';
export const fitDisclaimer = 'מדד ההתאמה משווה את דפוס תחומי העניין שלכם למאפייני העבודה של התחום ואינו מהווה הסתברות לקבלה או הצלחה.';
export const onetNotice = 'This application includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the O*NET Tools Developer License. O*NET® is a trademark of USDOL/ETA. Hitmachut has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.';
