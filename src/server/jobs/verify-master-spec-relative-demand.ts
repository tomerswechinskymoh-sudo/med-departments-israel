import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  matchExistingSpecialty,
  parseSpecialtyRelativeDemandRows,
  previewMasterCsvUpload,
  upsertSpecialtyMetric
} from "@/lib/server/master-csv-importer";
import { calculateSpecialtyMetrics } from "@/lib/specialty-metrics";

async function main() {
  const currentCsv = await fs.readFile("MASTER_Spec.csv", "utf8");
  const currentPreview = await previewMasterCsvUpload({
    kind: "spec",
    csvText: currentCsv,
    referenceCsvText: currentCsv,
    fileName: "MASTER_Spec.csv"
  });
  const currentMetric = parseSpecialtyRelativeDemandRows(currentCsv);

  assert.equal(currentPreview.headerMatches, true, "current MASTER_Spec headers must parse");
  assert.ok(currentPreview.rowCount > 0, "current MASTER_Spec must contain data rows");
  assert.equal(currentMetric.hasColumn, true, "current MASTER_Spec must contain relative demand header");
  assert.equal(currentPreview.duplicateHeaders.length, 0, "known duplicate neighbors must not block preview");
  assert.ok(
    currentPreview.allowedDuplicateHeaders.some(
      (item) => item.header === "אחוז המתמחים מסך המתמחים" && item.count === 2
    ),
    "known duplicate neighboring header must be represented unambiguously"
  );

  const fixture = [
    "קרטריון,תחום_התמחות,אחוז המתמחים מסך המתמחים,מדד ביקוש יחסי,אחוז המתמחים מסך המתמחים",
    "מקור הנתונים + פירוט,,,,",
    ",רפואת ילדים,10,1.13,20",
    ",פסיכיאטריה,11,0.89,21",
    ",מחלות עיניים,12,1.45,22",
    ",הרדמה,13,,23",
    ",תחום שגוי,14,not-a-number,24"
  ].join("\n");
  const parsedFixture = parseSpecialtyRelativeDemandRows(fixture);
  const fixturePreview = await previewMasterCsvUpload({
    kind: "spec",
    csvText: fixture,
    referenceCsvText: fixture,
    knownSpecialties: [
      { id: "pediatrics", name: "רפואת ילדים", slug: "pediatrics" },
      { id: "psychiatry", name: "פסיכיאטריה", slug: "psychiatry" },
      { id: "eyes", name: "מחלות עיניים", slug: "ophthalmology" },
      { id: "anesthesiology", name: "הרדמה", slug: "anesthesiology" }
    ]
  });

  assert.deepEqual(
    parsedFixture.rows.slice(0, 3).map((row) => row.value),
    [1.13, 0.89, 1.45],
    "decimal values must map from the exact relative-demand column"
  );
  assert.equal(parsedFixture.rows[3]?.value, null, "blank relative demand must remain missing");
  assert.equal(parsedFixture.rows[3]?.shouldUpdate, false, "blank must not erase an existing value");
  assert.equal(parsedFixture.rows[4]?.value, null, "invalid relative demand must not become zero");
  assert.equal(parsedFixture.rows[4]?.shouldUpdate, false, "invalid relative demand must not update storage");
  assert.ok(parsedFixture.rows[4]?.warning, "invalid relative demand must create a warning");
  assert.equal(fixturePreview.metricValidationIssuesCount, 1, "preview must report invalid relative demand");
  assert.deepEqual(
    fixturePreview.unmatchedSpecialties.map((item) => item.specialtyName),
    ["תחום שגוי"],
    "preview must report unmatched specialties"
  );

  const newReference = [
    "קרטריון,תחום_התמחות,מספר מיטות בתחום,מדד ביקוש יחסי,עודכן_אחרון",
    "מקור הנתונים + פירוט,,,,",
    ",רפואת ילדים,,1.13,"
  ].join("\n");
  const oldCompatible = [
    "קרטריון,תחום_התמחות,עודכן_אחרון",
    "מקור הנתונים + פירוט,,",
    ",רפואת ילדים,"
  ].join("\n");
  const oldPreview = await previewMasterCsvUpload({
    kind: "spec",
    csvText: oldCompatible,
    referenceCsvText: newReference
  });
  assert.equal(oldPreview.headerMatches, true, "older compatible CSV must not require new optional columns");
  assert.equal(
    parseSpecialtyRelativeDemandRows(oldCompatible).rows[0]?.shouldUpdate,
    false,
    "CSV without the optional column must preserve stored relative demand"
  );

  assert.equal(
    matchExistingSpecialty(
      [{ id: "family", name: "רפואת משפחה", slug: "family-medicine" }],
      "רפואת המשפחה"
    )?.id,
    "family",
    "existing specialty alias normalization must be reused"
  );
  assert.equal(
    matchExistingSpecialty(
      [{ id: "family", name: "רפואת משפחה", slug: "family-medicine" }],
      "תחום לא מוכר"
    ),
    null,
    "unknown specialty must not create a new entity"
  );

  const stored = new Map<string, number | null>();
  let upsertCalls = 0;
  const fakeDb = {
    specialtyMetric: {
      async upsert(input: {
        where: { specialtyId_metricKey: { specialtyId: string; metricKey: string } };
        create: { value: number | null };
        update: { value: number | null };
      }) {
        upsertCalls += 1;
        const key = `${input.where.specialtyId_metricKey.specialtyId}:${input.where.specialtyId_metricKey.metricKey}`;
        stored.set(key, stored.has(key) ? input.update.value : input.create.value);
        return {};
      }
    }
  } as unknown as Parameters<typeof upsertSpecialtyMetric>[0];
  const metric = {
    key: "relativeDemandIndex",
    label: "מדד ביקוש יחסי",
    header: "מדד ביקוש יחסי",
    unit: "ratio"
  };
  const upsertInput = {
    specialtyId: "eyes",
    metric,
    value: 1.13,
    rawValue: "1.13"
  };
  await upsertSpecialtyMetric(fakeDb, upsertInput);
  await upsertSpecialtyMetric(fakeDb, upsertInput);
  assert.equal(stored.size, 1, "repeat import must retain one canonical specialty metric row");
  assert.equal(stored.get("eyes:relativeDemandIndex"), 1.13, "repeat import must retain the same value");
  await upsertSpecialtyMetric(fakeDb, {
    specialtyId: "eyes",
    metric,
    value: null,
    rawValue: null
  });
  assert.equal(upsertCalls, 2, "missing optional value must not issue a clearing upsert");

  const dashboardMetric = calculateSpecialtyMetrics(
    [],
    ["relativeDemandIndex"],
    ["relativeDemandIndex"],
    {
      specialtyMetrics: [{ metricKey: "relativeDemandIndex", value: 1.13, rawValue: "1.13", unit: "ratio" }]
    }
  ).find((item) => item.key === "relativeDemandIndex");
  assert.equal(dashboardMetric?.value, "1.13", "public display must use two decimals without a percent sign");

  console.log(JSON.stringify({
    status: "PASS",
    currentRows: currentPreview.rowCount,
    currentSpecialties: currentPreview.specialtyCount,
    relativeDemandValues: currentMetric.rows.filter((row) => row.shouldUpdate).length,
    checks: 11
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
