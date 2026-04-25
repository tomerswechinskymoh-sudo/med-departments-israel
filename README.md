# הדרך להתמחות

אפליקציית Full-Stack בעברית וב־RTL לסטודנטים לרפואה ולסטאז'רים בישראל. המוצר עוזר להבין איך מחלקות באמת נראות לפני שבוחרים סבב, מחקר או כיוון עתידי להתמחות.

## מה יש במוצר

- `Next.js App Router` עם `TypeScript`
- `Tailwind CSS` עם עיצוב RTL-first
- `Prisma` + `PostgreSQL`
- session auth מאובטח עם תפקידים והרשאות, כולל LinkedIn / Google / Facebook למשתמשים שאינם אדמין
- חוויות מהשטח בלי הרשמה, עם אישור אדמין לפני פרסום
- תקנים פתוחים רשמיים דרך אזור נציגים בלבד
- מועמדות פרטית לתקן פתוח מתוך חשבון מחובר בלבד
- דירוג מועמדויות אחרי דדליין בעזרת OpenAI API ושליחת התאמות מובילות במייל
- דשבורד נציגים לניהול פרופיל, שינויים למחלקה ותקנים פתוחים
- דשבורד אדמין ליצירת נציגים, שיוך מחלקות, אישורים ופיקוח
- `DepartmentEnrichmentService` מוכן להרחבה עתידית עם mock implementation

## עקרונות מוצר והרשאות

### קהל יעד

- ה־homepage, הניווט והעמודים הציבוריים מיועדים קודם כל לסטודנטים ולסטאז'רים
- מתמחים ונציגי מחלקות מוסיפים תוכן, אבל לא עומדים במרכז החוויה הציבורית

### חוויות מהשטח

- לא דורשות חשבון
- נשמרות כ־`ReviewSubmission`
- נבדקות על ידי אדמין
- מתפרסמות רק אחרי אישור כ־`Review`

### מועמדות לתקן פתוח

- דורשת התחברות
- לא מוצגת לציבור
- נשמרת פרטית למחלקה, לנציגים מורשים ולאדמין
- כוללת קבצים ושדות התאמה מובנים

### נציגי מחלקות

- לא נרשמים לבד
- לא מבקשים הרשאה דרך signup
- נוצרים רק על ידי אדמין
- משויכים למחלקה אחת או יותר דרך `RepresentativeAssignment`
- יכולים להגיש רק שינויים ותקנים פתוחים למחלקות המשויכות להם
- יכולים לחבר LinkedIn רק אחרי שהאדמין יצר את החשבון ורק מתוך אזור הנציג/ה
- שום תוכן לא עולה לציבור ישירות, הכול עובר אישור אדמין

### אדמין

- יוצר חשבונות נציגים
- משייך נציגים למחלקות
- מאשר או דוחה חוויות מהשטח
- מאשר או דוחה תקנים פתוחים
- מאשר או דוחה שינויי מחלקה
- מנהל הרשאות, מוסדות, תחומים, מחלקות ולוג פעילות
- לא משמש כנציג/ת מחלקה במסלול העבודה הרגיל

## מודל נתונים

הסכמה כוללת בין היתר:

- `Role`
- `User`
- `Institution`
- `Specialty`
- `Department`
- `DepartmentHead`
- `RepresentativeProfile`
- `RepresentativeAssignment`
- `DepartmentChangeRequest`
- `ResearchOpportunity`
- `OfficialDepartmentUpdate`
- `ReviewSubmission`
- `Review`
- `ReviewReport`
- `ResidencyOpening`
- `OpeningAcceptanceCriteria`
- `OpeningApplication`
- `UploadedFile`
- `FavoriteDepartment`
- `AuditLog`

### דגשים חשובים

- `ResidencyOpening` תומך ב־pending approval ובטיוטות עדכון למחלקות
- `DepartmentChangeRequest` שומר שינויים למחלקה עד שאדמין מאשר
- `OpeningApplication` שומר גם ציון התאמה, סיכום, חוזקות, חששות ומנוע דירוג

## Seed ודמו

ה־seed כולל:

- את כל בתי החולים וקופות החולים המרכזיים שהוגדרו בקטלוג
- את כל תחומי הדיפולט הרלוונטיים לבתי חולים כלליים
- עמודי מחלקה בסיסיים לכל צירוף בית חולים + תחום רלוונטי
- רפואת משפחה בלבד בקופות החולים
- ראשי מחלקה
- תקנים פתוחים רשמיים
- בקשת שינוי מחלקה שממתינה לאישור
- תקן פתוח שממתין לאישור
- מועמדויות פרטיות לדוגמה
- חוויות שפורסמו וחוויות ממתינות
- לוג פעילות

### חשבונות דמו קבועים

- אדמין: `admin@example.com` / `Admin123!`
- `student@example.com` / `Student123!`
- `resident@example.com` / `Resident123!`
- נציג/ת מחלקה: `representative@example.com` / `Rep123!`

### שיוכי נציג הדמו

החשבון `representative@example.com` משויך/ת ל:

- `המרכז הרפואי ע"ש חיים שיבא - תל השומר · רפואה פנימית`
- `כללית · רפואת משפחה`
- `המרכז הרפואי ע"ש אדית וולפסון · כירורגיה אורתופדית`

## הרצה מקומית

1. התקנת תלויות

```bash
npm install
```

2. יצירת קובץ סביבה

```bash
cp .env.example .env
```

3. הרמת PostgreSQL מקומי

```bash
docker compose up -d
```

4. החלת migrations וטעינת seed

```bash
npx prisma migrate reset --force
```

5. הרצת שרת פיתוח

```bash
npm run dev
```

## סקריפטים חשובים

- `npm run dev` - שרת פיתוח
- `npm run build` - build מלא
- `npm run start` - הרצת production build מקומית
- `npm run prisma:generate` - יצירת Prisma Client
- `npm run prisma:migrate` - migration dev מקומית
- `npm run prisma:migrate:deploy` - החלת migrations קיימות
- `npm run prisma:seed` - טעינת seed
- `npm run import:department-heads -- <path-to-csv>` - קליטת ראשי מחלקה מקובץ CSV/TSV שיוצא מאקסל
- `npm run vercel-build` - `prisma generate` + `prisma migrate deploy` + `next build`
- `npm run enrichment:mock` - הרצת mock enrichment לראשי מחלקה
- `npm run openings:process-expired` - עיבוד תקנים פתוחים שעברו את הדדליין

## פריסה ל־Vercel

### מה צריך

- פרויקט Vercel
- בסיס נתונים PostgreSQL מאוחסן
- Environment Variables מוגדרים ב־Vercel

### משתני סביבה חובה

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `APP_URL`
- `MAX_UPLOAD_MB`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `OPENINGS_CRON_SECRET`

### משתני סביבה אופציונליים

- `OPENAI_MATCH_MODEL` - ברירת מחדל: `gpt-4o-mini`
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` - נדרשים רק אם רוצים להפעיל התחברות עם LinkedIn
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - נדרשים רק אם רוצים להפעיל התחברות עם Google
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` - נדרשים רק אם רוצים להפעיל התחברות עם Facebook

### תהליך פריסה מומלץ

1. לחבר את הריפו ל־Vercel
2. להגדיר את כל משתני הסביבה
3. להגדיר את build command ל־:

```bash
npm run vercel-build
```

### מה קורה בזמן build

`npm run vercel-build` מבצע:

1. `prisma generate`
2. `prisma migrate deploy`
3. `next build`

## הגדרת LinkedIn OAuth

הפרויקט משתמש במנגנון ה־session הקיים שלו, ולא ב־NextAuth. כדי להפעיל התחברות עם LinkedIn:

1. ליצור אפליקציה חדשה ב־[LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. להפעיל Sign In with LinkedIn באמצעות OpenID Connect
3. להוסיף Redirect URL לפיתוח:

```text
http://localhost:3000/api/auth/linkedin/callback
```

4. להוסיף Redirect URL לפרודקשן:

```text
https://your-domain.example/api/auth/linkedin/callback
```

5. להעתיק לקובץ `.env` את הערכים:

```bash
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
AUTH_SECRET="your-existing-session-secret"
```

6. להפעיל מחדש את שרת הפיתוח

חשוב:

- אדמין לא יכול להתחבר דרך LinkedIn
- סטודנטים ומתמחים יכולים להירשם ולהתחבר דרך LinkedIn
- נציגי מחלקות עדיין נוצרים רק על ידי אדמין, ואז יכולים לחבר LinkedIn מתוך עמוד הפרופיל שלהם

## הגדרת Google OAuth

כדי להפעיל התחברות עם Google:

1. ליצור פרויקט ב־[Google Cloud Console](https://console.cloud.google.com/)
2. להפעיל Google Identity / OAuth consent screen
3. ליצור OAuth Client מסוג Web application
4. להוסיף Authorized redirect URI לפיתוח:

```text
http://localhost:3000/api/auth/google/callback
```

5. להוסיף Redirect URI לפרודקשן:

```text
https://your-domain.example/api/auth/google/callback
```

6. להעתיק ל־`.env`:

```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
AUTH_SECRET="your-existing-session-secret"
```

חשוב:

- אדמין לא יכול להתחבר דרך Google
- סטודנטים ומתמחים יכולים להירשם ולהתחבר דרך Google
- נציגי מחלקות ממשיכים להתחבר עם אימייל/סיסמה, וחיבור social עבורם נשאר דרך LinkedIn מתוך הפרופיל

## הגדרת Facebook OAuth

כדי להפעיל התחברות עם Facebook:

1. ליצור אפליקציה ב־[Meta for Developers](https://developers.facebook.com/)
2. להוסיף את Facebook Login למוצר
3. להפעיל הרשאות `email` ו־`public_profile`
4. להוסיף Valid OAuth Redirect URI לפיתוח:

```text
http://localhost:3000/api/auth/facebook/callback
```

5. להוסיף Redirect URI לפרודקשן:

```text
https://your-domain.example/api/auth/facebook/callback
```

6. להעתיק ל־`.env`:

```bash
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"
AUTH_SECRET="your-existing-session-secret"
```

חשוב:

- אם Facebook לא מחזיר אימייל, המערכת לא תוכל להשלים הרשמה או התחברות
- אדמין לא יכול להתחבר דרך Facebook
- נציגי מחלקות ממשיכים להתחבר עם אימייל/סיסמה, וחיבור social עבורם נשאר דרך LinkedIn מתוך הפרופיל

## זרימות עיקריות

## איך המוסדות והמחלקות נוצרים

- מקור האמת נמצא ב־`src/server/department-catalog.ts`
- כל מוסד בקטלוג נוצר ב־seed
- בתי חולים מקבלים תחומי דיפולט כלליים
- תחומים אופציונליים נזרעים רק בבתי חולים נבחרים
- קופות חולים מקבלות רק `רפואת משפחה`
- כל צירוף מוסד + תחום יוצר עמוד מחלקה בסיסי עם placeholder
- גם סקריפט ה-import משתמש באותה לוגיקה כדי ליצור עמוד מחלקה חסר בזמן קליטה

## ייבוא ראשי מחלקה מקובץ

פורמט הקובץ:

- `בית חולים`
- `תחום`
- `מחלקה`
- `תפקיד`
- `תואר`
- `שם מלא`

שימוש:

```bash
npm run import:department-heads -- ./data/department-heads.csv
```

הערות:

- כרגע הסקריפט תומך ב־CSV או TSV שמיוצאים מאקסל
- אם `מחלקה` ריק, ייווצר או יעודכן עמוד כללי של התחום
- אם השורה מתייחסת לקופת חולים ותחום שאינו `רפואת משפחה`, השורה תידלג
- אם השורה מתייחסת לבית חולים עם תחום קהילתי כמו רפואת משפחה, השורה תידלג
- אם ראש המחלקה כבר קיים לאותו עמוד באותו שם/תואר/תפקיד, לא תיווצר כפילות

### שיתוף חוויה מהמחלקה

- כניסה דרך CTA: `רוצה לספר על החוויה שלך?`
- modal עם בחירת סוג מגיש:
  - מתמחה
  - סטאז'ר
  - סטודנט
- קודם בוחרים מוסד, ואז מחלקה מתוך אותו מוסד
- אפשר לאמת עם טלפון או עם מסמך הוכחה פרטי שנגיש רק לאדמין
- הטופס משנה את השדות לפי סוג המגיש/ה
- שדות הטקסט החופשי אופציונליים
- שנת ההתרחשות נבחרת כשנה קלנדרית, למשל `2024` / `2025` / `2026`
- לפני הטקסט החופשי מוצגת אזהרת פרטיות ולשון פוגענית
- אם נבחרת אנונימיות, הפרסום הציבורי נשאר אנונימי
- השיתוף נשמר לבדיקה לפני פרסום

### תקן פתוח רשמי

- גלוי לציבור רק אחרי אישור אדמין
- נוצר רק מתוך `/representative`
- זמין רק לנציג/ה משויך/ת למחלקה
- כולל:
  - מועד ועדה
  - דדליין להגשה
  - סוג תקן
  - מספר תקנים
  - notes
  - supporting info
  - קריטריוני קבלה מובנים
  - קובץ פנימי אופציונלי
  - בחירה של `Top 3 / Top 5 / Top 10` למשלוח מייל אחרי הדדליין

### שינוי עמוד מחלקה

- נשלח מתוך אזור נציגים בלבד
- נשמר כ־`DepartmentChangeRequest`
- כולל תקציר, תוכן עמוד, ראשי מחלקה, עדכונים רשמיים והזדמנויות מחקר
- עולה לציבור רק אחרי אישור אדמין

### דירוג מועמדויות אחרי דדליין

- אחרי ש־`applicationDeadline` עובר, אפשר לעבד תקנים דרך:
  - route cron-ready: `/api/jobs/process-expired-openings`
  - או ידנית עם `npm run openings:process-expired`
- ה־route מאובטח דרך `OPENINGS_CRON_SECRET`, או דרך session של אדמין
- לכל מועמדות המערכת שולחת ל־OpenAI:
  - העדפות מובנות של התקן
  - נתוני מועמדות מובנים
  - נוכחות קבצים ושמות קבצים
- OpenAI מחזיר JSON מובנה עם:
  - `match_score`
  - `strengths`
  - `concerns`
  - `short_summary`
- אם OpenAI לא זמין, יש fallback heuristic כדי לא לשבור את הזרימה
- לבעל/ת התקן נשלח מייל עם המועמדים המובילים בלבד

## פרטיות ואמון

- מספרי טלפון להגשות חוויה נשמרים רק לצורך אימות
- מועמדויות, קורות חיים ותמונות נשמרים כקבצים פרטיים ב־DB
- קבצים פרטיים נגישים רק לנציגים משויכים ולאדמינים דרך route מאובטח
- דירוג ההתאמה רץ רק בצד השרת, ולא חושף חומרי מועמדות לציבור
- יש `TODO` מפורש למדיניות retention למחיקת מסמכים פרטיים וחומרי מועמדות

## Enrichment עתידי

- `DepartmentEnrichmentService` הוא interface מוכן להרחבה
- `MockDepartmentEnrichmentService` מספק תוצאות דמה כרגע
- `src/server/jobs/run-department-enrichment.ts` מדגים job עתידי
