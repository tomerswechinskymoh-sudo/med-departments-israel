/** Presentation only: never infer a ranking year from an import/update timestamp. */
export const DUNS100_TITLE = "רופאים ברשימת DUNS100 Medical";
export const DUNS100_METHODOLOGY_URL = "https://www.duns100.co.il/criterions";
export const DUNS100_LIST_URL = "https://www.duns100.co.il/rating/Duns_100_medical";
export const DUNS100_DESCRIPTION = "DUNS100 Medical מפרסמת רשימות רופאים בתחומי מומחיות שונים. לפי המתודולוגיה שלה, הבחירה נעזרת בשאלוני רופאים, בהמלצות עמיתים ובהתייעצות עם מנהלי בתי חולים, מנהלי מחלקות ובכירים במערכת הבריאות. הנתון עשוי לסייע בבירור הרקע המקצועי של הסגל; הופעה ברשימה אינה מדד ישיר לאיכות ההכשרה, להוראה או לתנאי ההתמחות.";
export const DUNS100_MAPPING_NOTE = "הספירה באתר מבוססת על הנתונים שיובאו ושויכו למוסד או למחלקה. בחלק מהמקורות השיוך מסתמך על אזכורים של מוסד ותחום, ולכן הוא עשוי להיות משוער ואינו בהכרח רשימת רופאי המחלקה. נתון חסר אינו אפס; אפס מדווח אינו הוכחה שאין רופאים ברשימה.";
export const DUNS100_AGGREGATE_NOTE = "בתמונת המצב הארצית מסוכמים נתוני המחלקות הזמינים. שיוך לכמה מחלקות באותו מוסד עלול ליצור ספירה חוזרת; אין לראות בסכום מספר רופאים ייחודיים.";
export function duns100SourceYearLabel(sourceLabel: string | null | undefined) {
  // Only explicit years in the source label, not the current edition on a linked website.
  const years = [...new Set(sourceLabel?.match(/\b20\d{2}\b/g) ?? [])];
  return years.length === 1 ? `שנת מקור: ${years[0]}` : years.length > 1 ? `שנות המקור שצוינו: ${years.join("، ")}` : "שנת הרשימה לא צוינה במידע הזמין. תאריך עדכון באתר אינו שנת דירוג.";
}
