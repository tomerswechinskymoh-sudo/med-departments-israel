import { departmentNewResidentsChartRows } from "@/lib/department-yearly-residents";

const assutaAshdodEntRows = [
  { year: 2024, value: 2 },
  { year: 2021, value: 0 },
  { year: 2023, value: 3 },
  { year: 2020, value: 1 },
  { year: 2022, value: 1 }
];

const expected = [
  { year: 2020, value: 1 },
  { year: 2021, value: 0 },
  { year: 2022, value: 1 },
  { year: 2023, value: 3 },
  { year: 2024, value: 2 }
];

function fail(message: string): never {
  throw new Error(message);
}

function main() {
  const chartRows = departmentNewResidentsChartRows(assutaAshdodEntRows);

  for (const [index, expectedRow] of expected.entries()) {
    const actual = chartRows[index];
    if (!actual) {
      fail(`Missing chart row at index ${index}`);
    }

    if (actual.year !== expectedRow.year || actual.value !== expectedRow.value) {
      fail(
        `Wrong year/value pair at index ${index}: expected ${expectedRow.year}=${expectedRow.value}, got ${actual.year}=${actual.value}`
      );
    }

    if (actual.label !== String(expectedRow.year)) {
      fail(`Wrong label at index ${index}: expected ${expectedRow.year}, got ${actual.label}`);
    }
  }

  const output = {
    ok: true,
    test: "Assuta Ashdod ENT department-card mini chart",
    expected: expected.map((row) => `${row.year}=${row.value}`).join(", "),
    actual: chartRows.map((row) => `${row.year}=${row.value}`).join(", "),
    heights: chartRows.map((row) => `${row.year}:${row.height}`).join(", ")
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
