import assert from "node:assert/strict";
import { matchEntFellowships } from "@/lib/server/fellowshipMatcher";
import {
  runShebaEntFellowshipCrawler,
  shebaEntCrawlerInternals
} from "@/lib/server/shebaEntCrawler";

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

async function assertMissingFirecrawlKeyMessage() {
  const originalFirecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  delete process.env.FIRECRAWL_API_KEY;
  await assert.rejects(
    () =>
      runShebaEntFellowshipCrawler({
        departmentUrl: "https://www.shebaonline.org/department/otolaryngology-head-and-neck-surgery/"
      }),
    /סריקה חיה דורשת FIRECRAWL_API_KEY/
  );
  if (originalFirecrawlApiKey) {
    process.env.FIRECRAWL_API_KEY = originalFirecrawlApiKey;
  }
}

assertMissingFirecrawlKeyMessage()
  .then(() => {
    console.log("PASS sheba ENT fellowship POC tests");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
