# הדרך להתמחות

אפליקציית Full-Stack בעברית וב־RTL לסטודנטים לרפואה ולסטאז'רים בישראל, שמאפשרת להבין מחלקות, פתיחות, מחקר וחוויות מהשטח לפני בחירת רוטציה, סטאז', מחקר או כיוון עתידי להתמחות.

## מה יש במוצר

- `Next.js App Router` עם `TypeScript`
- `Tailwind CSS` עם עיצוב RTL-first
- `Prisma` + `PostgreSQL`
- session auth מאובטח עם תפקידים
- חוויות ציבוריות בלי הרשמה, עם moderation לפני פרסום
- פתיחות רשמיות רק לנציגים מאושרים
- הגשת מועמדות פרטית לפתיחות, כולל קבצים
- דירוג מועמדויות אחרי דדליין בעזרת OpenAI API ושליחת Top matches במייל לבעל/ת הפתיחה
- דשבורד נציגים לניהול עמוד מחלקה, פתיחות ומועמדויות
- דשבורד אדמין לניהול מוסדות, תחומים, מחלקות, חוויות, הרשאות ולוגים
- `DepartmentEnrichmentService` מוכן להרחבה עתידית עם mock implementation

## עקרונות מוצר

- קהל היעד הראשי הוא `סטודנטים` ו־`סטאז'רים`
- Residents ונציגי מחלקות הם שחקנים משניים שתורמים תוכן
- ה־homepage והניווט נשארים student-first
- חוויות ציבוריות:
  - לא דורשות הרשמה
  - נשמרות כ־`ReviewSubmission`
  - מתפרסמות רק אחרי אישור אדמין כ־`Review`
- פרסום רשמי:
  - דורש הרשמה
  - דורש התחברות
  - דורש הרשאת פרסום מאושרת
  - מתבצע רק מתוך `/representative`

## מודל נתונים

הסכמה כוללת בין היתר:

- `Role`
- `User`
- `Institution`
- `Specialty`
- `Department`
- `DepartmentHead`
- `ResearchOpportunity`
- `OfficialDepartmentUpdate`
- `ReviewSubmission`
- `Review`
- `ReviewReport`
- `PublisherRequest`
- `ResidencyOpening`
- `OpeningAcceptanceCriteria`
- `OpeningApplication`
- `UploadedFile`
- `FavoriteDepartment`
- `AuditLog`

בנוסף:

- `ResidencyOpening` שומר גם כמה מועמדים מובילים לשלוח במייל אחרי הדדליין
- `OpeningApplication` שומר ציון התאמה, סיכום קצר, חוזקות, חששות ומנוע הדירוג

## Seed ודמו

ה־seed כולל:

- 30 מוסדות
- 38 תחומים
- 14 מחלקות דמו
- ראשי מחלקה
- פתיחות רשמיות
- הזדמנויות מחקר
- מועמדויות פרטיות לדוגמה
- חוויות שפורסמו וחוויות ממתינות
- בקשות הרשאת פרסום
- לוג פעילות

### חשבונות דמו קבועים

- `admin@example.com` / `Admin123!`
- `student@example.com` / `Student123!`
- `resident@example.com` / `Resident123!`
- `representative@example.com` / `Rep123!`

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

4. איפוס הדאטהבייס, החלת migrations וטעינת seed

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
- `npm run vercel-build` - generate + migrate deploy + build
- `npm run enrichment:mock` - הרצת mock enrichment לראשי מחלקה

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

### ערכים מומלצים בפרודקשן

- `APP_URL=https://your-domain.vercel.app`
- `MAX_UPLOAD_MB=4`

הערה:
ב־Vercel יש מגבלות request body, לכן ברירת המחדל באפליקציה הוגדרה ל־`4MB` לקובץ.

### תהליך פריסה מומלץ

1. לחבר את הריפו ל־Vercel
2. להגדיר את כל משתני הסביבה
3. להגדיר את build command ל־:

```bash
npm run vercel-build
```

4. להשאיר start command ריק, או להשתמש בברירת המחדל של Next.js ב־Vercel

### מה קורה בזמן build

`npm run vercel-build` מבצע:

1. `prisma generate`
2. `prisma migrate deploy`
3. `next build`

ה־migration הראשונית כבר קיימת תחת:

- [prisma/migrations/202604210001_public_experience_openings_refactor/migration.sql](/Users/tomerswechinsky/Documents/CODEX/med-departments-israel/prisma/migrations/202604210001_public_experience_openings_refactor/migration.sql)

## זרימות עיקריות

### חוויה ציבורית

- כניסה דרך CTA: `רוצה לספר על החוויה שלך?`
- modal עם בחירת סוג מגיש:
  - מתמחה
  - סטאז'ר/ית
  - סטודנט/ית
- טלפון נאסף לאימות בלבד
- אם נבחרת אנונימיות, הפרסום הציבורי נשאר אנונימי
- ההגשה נשמרת פרטית ועוברת moderation

### פתיחה רשמית

- גלויה לציבור
- נוצרת רק מתוך `/representative`
- דורשת התחברות והרשאת פרסום מאושרת
- כוללת:
  - תאריך ועדה
  - דדליין להגשה
  - סוג פתיחה
  - תקנים
  - notes
  - supporting info
  - קריטריוני קבלה מובנים
  - קובץ פנימי אופציונלי
  - בחירה של Top 3 / Top 5 / Top 10 לשליחת מייל אחרי הדדליין

### דירוג מועמדויות אחרי דדליין

- אחרי שה־`applicationDeadline` עובר, אפשר לעבד את הפתיחות דרך:
  - route cron-ready: `/api/jobs/process-expired-openings`
  - או ידנית עם `npm run openings:process-expired`
- ה־route מאובטח דרך `OPENINGS_CRON_SECRET`, או דרך session של אדמין
- לכל מועמדות המערכת שולחת ל־OpenAI:
  - העדפות מובנות של הפתיחה
  - נתוני מועמדות מובנים
  - נוכחות קבצים ושמות קבצים
- OpenAI מחזיר JSON מובנה עם:
  - `match_score`
  - `strengths`
  - `concerns`
  - `short_summary`
- אם OpenAI לא זמין, יש fallback heuristic כדי לא לשבור את הזרימה
- נשמרים:
  - ציון התאמה
  - סיכום קצר
  - חוזקות
  - חששות
  - מנוע הדירוג (`OPENAI` או `FALLBACK`)
- לבעל/ת הפתיחה נשלח מייל עם המועמדים המובילים בלבד, ולא עם כל המועמדים

### מועמדות לפתיחה

- מוגשת באופן פרטי דרך `/openings/[openingId]/apply`
- כוללת:
  - קורות חיים
  - תמונת פרופיל אופציונלית
  - קובץ נוסף אופציונלי
  - תשובות מובנות על אלקטיב, סטאז', מחקר, מוסד לימודים, היכרות עם המחלקה, המלצות ומוטיבציה
- הקבצים והחומרים אינם ציבוריים

## פרטיות ואמון

- מספרי טלפון להגשות חוויה נשמרים רק לצורך אימות
- מועמדויות, קורות חיים ותמונות נשמרים כקבצים פרטיים ב־DB
- קבצים פרטיים נגישים רק לנציגים מורשים ולאדמינים דרך route מאובטח
- דירוג ההתאמה רץ רק בצד השרת, ולא חושף חומרי מועמדות לציבור
- יש `TODO` מפורש להוספת חילוץ טקסט מאובטח מ־CV בעתיד, אם וכאשר יהיה צורך עסקי ותפעולי
- יש `TODO` מפורש למדיניות retention למחיקת מסמכים פרטיים וחומרי מועמדות

## Enrichment עתידי

- `DepartmentEnrichmentService` הוא interface מוכן להרחבה
- `MockDepartmentEnrichmentService` מספק תוצאות דמה כרגע
- `src/server/jobs/run-department-enrichment.ts` מדגים job עתידי
- יש `TODO` מפורש לשילוב scraping או enrichment אמיתי
- כל scraping עתידי חייב לעמוד בתנאי שימוש, robots, זכויות ותנאי פרטיות של המקור

## מבנה כללי

- `src/app` - דפים ו־API routes
- `src/components` - רכיבי UI, טפסים, דשבורדים ו־flows
- `src/lib` - auth, queries, validation, uploads, audit ושירותים
- `src/server` - seed ו־jobs
- `prisma/schema.prisma` - הסכמה
- `prisma/migrations` - migrations לפריסה
- `prisma/seed.ts` - entrypoint ל־seed

## לפני פרודקשן אמיתי

- להחליף מסמכי legal בנוסח מאושר משפטית
- להגדיר retention policy לחומרים רגישים
- להוסיף rate limiting והקשחת abuse controls
- לשקול העברת קבצים פרטיים ל־object storage מאובטח אם נפח הקבצים יגדל
