import assert from "node:assert/strict";
import { matchEntFellowships } from "@/lib/server/fellowshipMatcher";
import {
  runShebaEntFellowshipCrawler,
  shebaEntCrawlerInternals
} from "@/lib/server/shebaEntCrawler";
import { extractTraining } from "@/lib/server/trainingExtractor";

function assertTopFellowship(text: string, expectedFellowshipId: string) {
  const matches = matchEntFellowships(text);
  assert.ok(matches.length > 0, `Expected ${expectedFellowshipId} to match`);
  assert.equal(matches[0].fellowshipId, expectedFellowshipId);
  assert.ok(matches[0].totalScore >= 10, `Expected ${expectedFellowshipId} score >= 10`);
}

assertTopFellowship(
  "Dr. A completed a clinical fellowship in laryngology and treats voice disorders and swallowing problems.",
  "ENT_LARYNGOLOGY"
);

assertTopFellowship(
  "Dr. B completed fellowship in neurotology with focus on otology, cochlear implant surgery and vestibular disorders.",
  "ENT_NEUROTOLOGY"
);

assertTopFellowship(
  "Dr. C completed a fellowship in rhinology and endoscopic sinus surgery at a university hospital.",
  "ENT_RHINOLOGY"
);

assertTopFellowship(
  "Dr. D completed clinical fellowship in pediatric otolaryngology and pediatric ENT airway procedures.",
  "ENT_PEDIATRIC"
);

assertTopFellowship(
  "Dr. E completed fellowship in head and neck oncology and head and neck surgery, including thyroid surgery.",
  "ENT_HEAD_NECK"
);

const migsMatches = matchEntFellowships(
  "Dr. F completed a fellowship in MIGS and minimally invasive gynecologic surgery."
);
assert.equal(migsMatches.length, 0, "MIGS must not match ENT fellowship dictionary");

const eranTraining = extractTraining(`
השכלה
2009–2010, התמחות-על בניתוחים אונקולוגיים ושחזורים פלסטיים מורכבים, בית ישראל, ניו יורק, ארה"ב
2004–2009, התמחות במחלות אא"ג וכירורגיה של ראש-צוואר, מאיו קליניק, מינסוטה, ארה"ב
`);
assert.ok(
  eranTraining.fellowships.some((line) =>
    line.rawText.includes("2009-2010, התמחות-על בניתוחים אונקולוגיים ושחזורים פלסטיים מורכבים")
  ),
  "Eran Alon fellowship line must be extracted"
);
assert.ok(
  eranTraining.fellowships.some((line) =>
    line.rawText.includes("2004-2009, התמחות במחלות אא\"ג וכירורגיה של ראש-צוואר")
  ),
  "Eran Alon Mayo residency line must be extracted"
);

const eranMatches = matchEntFellowships(eranTraining.fellowships.map((line) => line.rawText).join("\n"));
assert.ok(
  eranMatches.some((match) => match.fellowshipId === "ENT_HEAD_NECK"),
  "Eran Alon oncology/reconstruction training must match ENT head and neck"
);

const galitTraining = extractTraining(`
השכלה
2018-2017 השתלמות עמיתים ברינולוגיה וניתוחי סינוסים אנדוסקופיים
2019 קורס מתקדם בניתוחי בסיס גולגולת
`);
assert.ok(galitTraining.fellowships.length >= 2, "Galit Avior training lines must still be extracted");
assert.ok(
  matchEntFellowships(galitTraining.fellowships.map((line) => line.rawText).join("\n")).some(
    (match) => match.fellowshipId === "ENT_RHINOLOGY"
  ),
  "Galit Avior rhinology training must still match"
);

const mockedDepartmentHtml = `
  <main>
    <article class="doctor-card">
      <h3>Dr. Senior ENT</h3>
      <p>Senior Physician, Otolaryngology - Head and Neck Surgery</p>
      <a href="/doctor/senior-ent/">Read More</a>
    </article>
    <article class="doctor-card">
      <h3>Dr. Resident ENT</h3>
      <p>Resident, Otolaryngology</p>
      <a href="/doctor/resident-ent/">Read More</a>
    </article>
    <article class="doctor-card">
      <h3>Nurse Example</h3>
      <p>Nurse coordinator</p>
      <a href="/team/nurse/">Read More</a>
    </article>
  </main>
`;
const candidates = shebaEntCrawlerInternals.extractPhysicianCandidates(
  mockedDepartmentHtml,
  "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/"
);

assert.equal(candidates.length, 1);
assert.equal(candidates[0]?.physicianName, "Dr. Senior ENT");

const mockedShebaTeamHtml = `
  <main>
    <section class="team-section">
      <h2>הצוות שלנו</h2>
      <div class="team-grid">
        <article class="team-card">
          <h3>ד"ר עומרי פריד</h3>
          <p>רופא בכיר, אף אוזן גרון</p>
          <a href="/doctor/omri-fried/">לפרופיל</a>
        </article>
        <article class="team-card">
          <h3>ד"ר עדית גבאי-נטלה</h3>
          <p>מנהלת שירות</p>
          <a href="/doctor/idit-gabay-netela/">לפרופיל</a>
        </article>
        <article class="team-card">
          <h3>פרופ' ערן אלון</h3>
          <p>מנהל מחלקה</p>
          <a href="/doctor/eran-alon/">לפרופיל</a>
        </article>
        <article class="team-card">
          <h3>ד"ר מתמחה לדוגמה</h3>
          <p>מתמחה</p>
          <a href="/doctor/resident-example/">לפרופיל</a>
        </article>
        <article class="team-card">
          <h3>Dr. Fellow Example</h3>
          <p>Fellow</p>
          <a href="/doctor/fellow-example/">Profile</a>
        </article>
        <article class="team-card">
          <h3>סוזן מולכו ניסוק</h3>
          <p>קלינאית תקשורת</p>
          <a href="/team/suzan-molcho/">לפרופיל</a>
        </article>
      </div>
    </section>
  </main>
`;
const shebaTeamReport = shebaEntCrawlerInternals.extractPhysicianCandidateReport(
  mockedShebaTeamHtml,
  "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/"
);
assert.equal(shebaTeamReport.debug.teamCardsFound, 6);
assert.equal(shebaTeamReport.debug.seniorPhysiciansFound, 3);
assert.equal(shebaTeamReport.debug.residentsFiltered, 2);
assert.equal(shebaTeamReport.debug.nonPhysiciansFiltered, 1);
assert.equal(shebaTeamReport.debug.profileUrlsFound, 3);
assert.deepEqual(
  shebaTeamReport.candidates.map((candidate) => candidate.physicianName),
  ["ד\"ר עומרי פריד", "ד\"ר עדית גבאי-נטלה", "פרופ' ערן אלון"]
);

const blockedClassification = shebaEntCrawlerInternals.classifyPage(
  "אנחנו בטיפול. לא מתאפשרת גישה לאתר שיבא",
  "<main>אנחנו בטיפול. לא מתאפשרת גישה לאתר שיבא</main>",
  [],
  403
);
assert.equal(blockedClassification.pageType, "blocked_or_empty");

const profileClassification = shebaEntCrawlerInternals.classifyPage(
  `ד"ר דוגמה
מנהל שירות מומחה אף אוזן גרון.
השלים fellowship in laryngology ומטפל בהפרעות קול.
${"פרופיל ביוגרפי הכולל ניסיון קליני, הכשרה, תחומי מומחיות ופעילות אקדמית. ".repeat(8)}`,
  "<main><img src=\"/doctor.jpg\" /><h1>ד\"ר דוגמה</h1><p>מנהל שירות מומחה אף אוזן גרון</p></main>",
  []
);
assert.equal(profileClassification.pageType, "senior_physician_profile");

const teamCandidateLinks = shebaEntCrawlerInternals.findTeamCandidateLinks([
  { text: "הצוות שלנו", href: "https://www.shebaonline.org/team/" },
  { text: "תרומות", href: "https://www.shebaonline.org/donate/" }
]);
assert.deepEqual(teamCandidateLinks, ["https://www.shebaonline.org/team/"]);

const personCards = shebaEntCrawlerInternals.extractPersonCards(
  "",
  mockedShebaTeamHtml,
  [],
  "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/"
);
assert.equal(personCards.filter((card) => card.filterReason === "kept: senior physician").length, 3);

const metadataOnlyHtml = `
  <main>
    <meta name="description" content="באתר תוכלו לחפש רופאים ורופאות">
    <section><h1>עמוד לא נמצא</h1><p>לא נמצאו תוצאות.</p></section>
  </main>
`;
const metadataReport = shebaEntCrawlerInternals.extractPhysicianCandidateReport(
  metadataOnlyHtml,
  "https://www.sheba.co.il/page-not-found"
);
assert.equal(metadataReport.debug.seniorPhysiciansFound, 0);

async function assertBlockedManualHtmlMessage() {
  const result = await runShebaEntFellowshipCrawler({
    pastedHtml: "<main>אנחנו בטיפול. לא מתאפשרת גישה לאתר שיבא</main>",
    debug: true
  });
  assert.equal(result.physiciansProcessed, 0);
  assert.equal(result.debug?.pageType, "blocked_or_empty");
  assert.equal(result.debug?.liveCrawlBlocked, true);
  assert.equal(result.debug?.teamCardsFound, 0);
  assert.ok(result.warnings.some((warning) => warning.includes("עמוד חסימה/תחזוקה")));
}

async function assertManualHtmlTeamExtraction() {
  const result = await runShebaEntFellowshipCrawler({
    pastedHtml: mockedShebaTeamHtml,
    departmentUrl: "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/",
    debug: true
  });
  assert.equal(result.physiciansProcessed, 3);
  assert.equal(result.debug?.teamCardsFound, 6);
  assert.equal(result.debug?.seniorPhysiciansFound, 3);
}

async function assertNoTeamClearRootCause() {
  const result = await runShebaEntFellowshipCrawler({
    pastedHtml: "<main><h1>מחלקת אף אוזן גרון</h1><p>אין בעמוד כרטיסי צוות או קישורי פרופיל.</p></main>",
    debug: true
  });
  assert.equal(result.physiciansProcessed, 0);
  assert.ok(result.warnings.some((warning) => warning.includes("לא נמצאו כרטיסי רופאים בכירים")));
}

Promise.all([assertBlockedManualHtmlMessage(), assertManualHtmlTeamExtraction(), assertNoTeamClearRootCause()])
  .then(() => {
    console.log("PASS sheba ENT fellowship POC tests");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
