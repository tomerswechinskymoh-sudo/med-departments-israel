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
