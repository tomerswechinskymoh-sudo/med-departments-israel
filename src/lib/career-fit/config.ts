/** Original Hebrew editorial configuration; no proprietary assessment items. */
export const VERSION = '2026-10-01.1';
export const DISCLAIMER = 'כלי עזר להיכרות עם ההעדפות שלך; אינו מבדק מתוקף או קביעה מקצועית.';
export const IMA = 'https://www.ima.org.il/internship/Specializations.aspx';
export const dimensions = {
  procedural: 'פעולות מעשיות', diagnostic: 'בירור ואבחון', acute: 'טיפול במצבים חריפים',
  continuity: 'מעקב לאורך זמן', interaction: 'שיחה וקשר עם מטופלים', broad: 'מגוון תחומים קליניים',
  focused: 'התמקדות בתחום קליני', outpatient: 'עבודה במרפאה', inpatient: 'עבודה באשפוז',
  theatre: 'סביבת חדר ניתוח', laboratory: 'עבודה במעבדה', imaging: 'עבודה עם דימות',
  children: 'טיפול בילדים', older: 'טיפול במבוגרים בגיל הזיקנה', research: 'מחקר', teaching: 'הוראה'
} as const;
export type Dimension = keyof typeof dimensions;
export const scoredDimensions = Object.keys(dimensions).filter(d => !['research', 'teaching'].includes(d)) as Dimension[];
export type Question = { id: string; dimension: Dimension; text: string; section: number };
const items: [Dimension, string][] = [
 ['procedural','עד כמה ארצה לבצע פעולות טיפוליות בעזרת הידיים והמכשור?'],
 ['procedural','עד כמה ארצה שפעולות מעשיות יהיו חלק חוזר מיום העבודה שלי?'],
 ['diagnostic','עד כמה ארצה לחבר ממצאים שונים כדי לברר מה מסביר מצב רפואי?'],
 ['diagnostic','עד כמה ארצה לפרש בדיקות ולבחון מחדש אפשרויות אבחנתיות?'],
 ['acute','עד כמה ארצה לטפל בבעיה רפואית שמצריכה מענה מיידי?'],
 ['acute','עד כמה ארצה להיות חלק מצוות המייצב מצב רפואי חריף?'],
 ['continuity','עד כמה ארצה לפגוש את אותם מטופלים לאורך חודשים ושנים?'],
 ['continuity','עד כמה ארצה לעקוב אחר השפעת הטיפול ולהתאים אותו לאורך זמן?'],
 ['interaction','עד כמה ארצה להקדיש זמן לשיחה מפורטת עם מטופלים ומשפחות?'],
 ['interaction','עד כמה ארצה לשלב הסברים וקבלת החלטות משותפת עם מטופלים?'],
 ['broad','עד כמה ארצה לעסוק בבעיות מכמה מערכות גוף באותו יום?'],
 ['broad','עד כמה ארצה לשלב היבטים רפואיים מגוונים בתוכנית טיפול אחת?'],
 ['focused','עד כמה ארצה להעמיק בתחום קליני מוגדר?'],
 ['focused','עד כמה ארצה לחזור לשאלות מורכבות בתוך תחום ממוקד?'],
 ['outpatient','עד כמה ארצה לעבוד במסגרת מרפאה?'],
 ['outpatient','עד כמה ארצה לפגוש מטופלים בביקורים שאינם דורשים אשפוז?'],
 ['inpatient','עד כמה ארצה ללוות טיפול במטופלים מאושפזים?'],
 ['inpatient','עד כמה ארצה להשתתף בביקורים ובתכנון טיפול במחלקת אשפוז?'],
 ['theatre','עד כמה ארצה לעבוד בסביבת חדר ניתוח?'],
 ['theatre','עד כמה ארצה להשתתף בטיפול סביב ניתוח, כחלק מצוות?'],
 ['laboratory','עד כמה ארצה לעסוק בדגימות ובבדיקות מעבדה?'],
 ['laboratory','עד כמה ארצה לפרש תהליכים רפואיים דרך עבודה במעבדה?'],
 ['imaging','עד כמה ארצה לפרש תמונות דימות כחלק מרכזי מהעבודה?'],
 ['imaging','עד כמה ארצה להתעמק בבחירת בדיקות דימות ובהבנת ממצאיהן?'],
 ['children','עד כמה ארצה לטפל בילדים ובמתבגרים?'],
 ['older','עד כמה ארצה לטפל באנשים בגיל הזיקנה?'],
 ['research','עד כמה ארצה לשלב מחקר בעבודה המקצועית שלי?'],
 ['teaching','עד כמה ארצה לשלב הוראה והדרכה בעבודה המקצועית שלי?']
];
export const questions: Question[] = items.map(([dimension,text],i)=>({id:`q${i+1}`,dimension,text,section:Math.floor(i/7)}));
export const sections = ['פעולות, בירור ורצף טיפולי','קשר והיקף העיסוק','סביבות עבודה','דימות, אוכלוסיות ועניין מקצועי'];
export const scale = ['בכלל לא מעוניין/ת','מעט מעוניין/ת','העדפה בינונית','מעוניין/ת','מעוניין/ת מאוד'];
export const considerations = ['מחקר','הוראה','שעות צפויות','איזון בין עבודה לחיים','הכנסה','עומס ותורנויות','תהליך הקבלה'];
export type Pathway = 'base' | 'subspecialty' | 'fellowship';
export const pathwayLabels: Record<Pathway,string> = {base:'מקצוע בסיס',subspecialty:'מקצוע על — נדרש מסלול קודם לפי הר״י',fellowship:'השתלמות עמיתים — אינה התמחות בסיס'};
export type Profile = {id:string;label:string;aliases:string[];pathways:Pathway[];supported:Dimension[];missing:Dimension[];sources:string[];interpretation:string;limitation:string;version:string};
export const availability = [
 {id:'region',label:'אזור',supported:true,field:'Institution.region',scope:'מיקום מוסד; שנת עדכון לא זמינה',meaning:'אזור רשום ומנורמל בלבד. ערך חסר אינו ניחוש לפי עיר.'},
 {id:'hospital',label:'מוסד מועדף',supported:true,field:'Department.institution.id/name',scope:'קטלוג המחלקות הציבורי; שנת עדכון לא זמינה',meaning:'זהות מוסד, ללא מסקנה על איכות או יוקרה.'},
 {id:'type',label:'סוג מסגרת',supported:true,field:'Institution.type',scope:'HOSPITAL / HMO; שנת עדכון לא זמינה',meaning:'סוג מוסד בלבד; לא הוכחה לעבודה באשפוז או במרפאה.'},
 {id:'exposure',label:'חשיפה לתחומים ופעולות',supported:false,field:'אין שדה ציבורי מובנה בר השוואה',scope:'לא זמין',meaning:'נפח פעילות אינו ניסיון של מתמחה.'},
 {id:'academic',label:'אפשרויות מחקר',supported:false,field:'אין מדד להזדמנויות בפועל',scope:'לא זמין',meaning:'פרסומים ותארים אינם זמינות ליווי.'},
 {id:'size',label:'גודל צוות',supported:false,field:'residentsCount / roster / yearly metrics אינם ספירת צוות מלאה אחידה',scope:'היקף, הגדרה ושנה משתנים',meaning:'אין ערבוב בין מספר מתמחים חדשים למצבת צוות.'},
 {id:'teaching',label:'הוראה וחניכה',supported:false,field:'Review.teachingQuality + submission.roleDetails אינם אגרגט מתוארך אחיד עם N',scope:'אוכלוסייה ומסגרת מדידה אינן אחידות',meaning:'אין הסקת הוראה ממספר פרופסורים או ערבוב סטודנטים ומתמחים.'},
 {id:'environment',label:'סביבת עבודה ועומס',supported:false,field:'Review.lifestyleBalance; חסר בסיס ציבורי בר השוואה',scope:'אוכלוסייה, תאריך וגודל מדגם אינם אחידים',meaning:'מיטות וסקר מטופלים אינם חוויית מתמחים.'}
] as const;
