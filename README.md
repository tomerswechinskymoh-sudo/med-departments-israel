# הדרך להתמחות

אפליקציית Full-Stack בעברית וב־RTL לסטודנטים לרפואה ולסטאז'רים בישראל. המוצר עוזר להבין איך מחלקות באמת נראות לפני שבוחרים סבב, מחקר או כיוון עתידי להתמחות.

## מה יש במוצר

- `Next.js App Router` עם `TypeScript`
- `Tailwind CSS` עם עיצוב RTL-first
- `Prisma` + `PostgreSQL`
- session auth מאובטח עם תפקידים והרשאות
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

- 30 מוסדות
- 38 תחומים
- 14 מחלקות דמו
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

- `שיבא תל השומר · קרדיולוגיה`
- `כללית · רפואת משפחה בקהילה`
- `וולפסון · אורתופדיה`

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
- `APP_URL`
- `MAX_UPLOAD_MB`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `OPENINGS_CRON_SECRET`

### משתני סביבה אופציונליים

- `OPENAI_MATCH_MODEL` - ברירת מחדל: `gpt-4o-mini`

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

## זרימות עיקריות

### שיתוף חוויה מהמחלקה

- כניסה דרך CTA: `רוצה לספר על החוויה שלך?`
- modal עם בחירת סוג מגיש:
  - מתמחה
  - סטאז'ר/ית
  - סטודנט/ית
- הטלפון נשמר רק לאימות
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
