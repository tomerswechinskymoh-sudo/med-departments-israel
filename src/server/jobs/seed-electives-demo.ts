import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnvFile(fileName: string) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvFile(".env.local");
loadLocalEnvFile(".env");

async function main() {
  const { seedElectivesDemo } = await import("@/lib/server/electives-demo-seed");
  const summary = await seedElectivesDemo();

  console.log(JSON.stringify({
    status: "ok",
    representative: {
      username: summary.representativeUsername,
      email: summary.representativeEmail,
      temporaryPassword: summary.representativeTemporaryPassword
    },
    selectedDepartments: summary.selectedDepartments,
    applicationsByStatus: summary.applicationsByStatus,
    links: summary.links
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
