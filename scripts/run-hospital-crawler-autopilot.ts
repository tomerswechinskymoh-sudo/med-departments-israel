import { parseArgs } from "@/crawler/clalit/utils";
import { runHospitalAutopilot, summarizeAutopilotResult } from "@/crawler/hospitals/autopilot";
import type { AutopilotMode } from "@/crawler/hospitals/types";

const modes = new Set(["plan", "pilot", "evaluate", "full"]);

async function main() {
  const args = parseArgs();
  const hospital = args.get("hospital");
  const mode = (args.get("mode") ?? "plan") as AutopilotMode;
  if (!hospital) throw new Error("Missing --hospital <slug>.");
  if (!modes.has(mode)) throw new Error(`Invalid --mode "${mode}". Use plan, pilot, evaluate, or full.`);

  const result = await runHospitalAutopilot(hospital, mode, args.has("confirm"));
  console.log(JSON.stringify(summarizeAutopilotResult(mode, result), null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
