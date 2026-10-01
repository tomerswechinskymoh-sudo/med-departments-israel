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
const entries: [string,string,number,Dimension[],string,string[]?,Pathway[]?][] = [
 ['pathology','פתולוגיה אבחנתית',32,['laboratory','diagnostic','focused'],'תיאור בחינת ההתמחות כולל אבחון תכשירים מאקרוסקופיים ומיקרוסקופיים; זהו בסיס לבחינת עניין בדגימות ובפרשנות אבחנתית.',['אנטומיה פתולוגית']],
 ['emergency','רפואה דחופה',293,['acute','broad','inpatient'],'מסלול ברפואה דחופה עם פנימית, כירורגיה, טיפול נמרץ ורפואה דחופה ילדים תומך בבחינת טיפול חריף והיקף רחב. קיימים מסלולי בסיס ועל.',[],['base','subspecialty']],
 ['obgyn','יילוד וגינקולוגיה',20,['focused','procedural','theatre'],'תקופות ביילוד, גינקולוגיה ופריון ורשימות פעולות וניתוחים תומכות בבחינת תחום ממוקד ועיסוק מעשי.',['מיילדות וגינקולוגיה']],
 ['orthopedics','כירורגיה אורתופדית',75,['focused','procedural','theatre','acute'],'מסלול כירורגי עם ניתוחי עמוד שדרה וכף יד וטיפול נמרץ תומך בבחינת פעולות, חדר ניתוח וטיפול חריף.',['אורתופדיה']],
 ['internal','רפואה פנימית',1,['inpatient','broad','acute'],'מחלקת פנימית, רוטציות קליניות וטיפול נמרץ תומכים בבחינת עבודה באשפוז ובהיקף קליני רחב.'],
 ['surgery','כירורגיה כללית',70,['procedural','theatre','inpatient','acute'],'מסלול כירורגי, רשימת ניתוחים ורוטציות בטראומה וטיפול נמרץ תומכים בבחינת פעולות וטיפול סביב ניתוח.'],
 ['pediatrics','רפואת ילדים',10,['children','inpatient','outpatient','broad'],'המסלול כולל מחלקת ילדים, רפואת ילדים בקהילה ומגוון תחומי ילדים.'],
 ['family','רפואת משפחה',99,['outpatient','broad','continuity'],'תקופות ברפואת המשפחה ובמרפאות לצד רוטציות בפנימית, ילדים ופסיכיאטריה; רצף טיפולי הוא פירוש עריכתי למסגרת המרפאה.'],
 ['psychiatry','פסיכיאטריה',50,['inpatient','outpatient','focused'],'המסלול כולל מחלקה פסיכיאטרית ושירות אמבולטורי. קיים גם מסלול למומחים ברפואת משפחה; יש לבדוק תנאים במקור.'],
 ['radiology','רדיולוגיה אבחנתית',48,['imaging','diagnostic','focused'],'המסלול ברדיולוגיה אבחנתית תומך בבחינת עניין בדימות ובפרשנות אבחנתית.',['דימות'],['base','subspecialty']],
 ['anesthesia','הרדמה',47,['procedural','theatre','acute','inpatient'],'פעולות הרדמה סביב ניתוח ותקופת חובה בטיפול נמרץ תומכות במיפוי הפעילויות הללו.'],
 ['ent','מחלות א.א.ג וכירורגיה של ראש וצוואר',44,['procedural','theatre','focused','inpatient'],'מחלקת אם כירורגית ורשימת פעולות תומכות בבחינת עיסוק כירורגי בתחום ראש וצוואר.',['אף אוזן גרון','מחלות אף אוזן גרון וכירורגיית ראש וצוואר','מחלות אף אוזן גרון וכירורגיה של ראש וצוואר']],
 ['dermatology','מחלות עור ומין',4,['focused','inpatient'],'תקופה במחלקת עור תומכת בבחינת תחום ממוקד ומסגרת מחלקתית; חסר אפיון לשאר ההעדפות.'],
 ['ophthalmology','מחלות עיניים',78,['focused','procedural','theatre'],'תחום העיניים ורשימת פעולות וניתוחים תומכים בבחינת עיסוק ממוקד ופעולות.'],
 ['neurology','נוירולוגיה',60,['focused','inpatient'],'תקופה במחלקת נוירולוגיה תומכת בבחינת תחום ממוקד ומסגרת מחלקתית; אין אומדן לכמות הפעילות.'],
 ['rehabilitation','רפואה פיזיקלית ושיקום',43,['focused','inpatient'],'תקופה במחלקת שיקום תומכת בבחינת תחום ממוקד ומסגרת מחלקתית; רצף הטיפול דורש אפיון נוסף.',['שיקום'],['base','subspecialty']]
];
export const profiles: Profile[] = entries.map(([id,label,sp,supported,interpretation,aliases=[],pathways=['base']])=>({id,label,aliases,pathways,supported,missing:scoredDimensions.filter(d=>!supported.includes(d)),sources:[`${'https://www.ima.org.il/internship/Syllabus.aspx'}?SpId=${sp}`,IMA],interpretation,limitation:'זהו מיפוי עריכתי של פעילויות במסלול, לא מדידה של תדירותן או חוויית ההתמחות. היקף הפעילות, קשר עם מטופלים והאפשרויות משתנים בין מסגרות; יש לברר בשיחה ובחשיפה בשטח.',version:VERSION}));
export const unprofiledBase = ['אונקולוגיה','ביוכימיה קלינית','בריאות הציבור','גריאטריה','כירורגיה אורולוגית','כירורגיה פלסטית ואסתטית','כירורגיה של בית החזה','כירורגית ילדים','כירורגית כלי-דם','מיקרוביולוגיה קלינית','נוירוכירורגיה','פסיכיאטריה של הילד ומתבגר','רפואה גרעינית','רפואה משפטית','רפואה תעסוקתית'];
export const multiplePathwayBase = ['אונקולוגיה','גריאטריה','כירורגית ילדים','כירורגית כלי-דם','רדיולוגיה אבחנתית','רפואה גרעינית','רפואה דחופה','רפואה פיזיקלית ושיקום'];
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
