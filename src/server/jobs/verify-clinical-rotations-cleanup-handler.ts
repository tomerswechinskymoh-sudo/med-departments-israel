import { GET } from "@/app/api/internal/clinical-rotations/cleanup/route";

type CleanupResponse = {
  ok?: boolean;
  result?: {
    identityDocuments?: { deleted?: number };
    eligibilitySources?: { deleted?: number; failed?: number };
  };
};

function assertCheck(name: string, condition: unknown) {
  if (!condition) {
    throw new Error(`FAIL ${name}`);
  }
}

async function main() {
  const secret = process.env.CLINICAL_ROTATIONS_CLEANUP_SECRET?.trim() || "local-cleanup-handler-test-secret";
  process.env.CLINICAL_ROTATIONS_CLEANUP_SECRET = secret;

  const unauthorized = await GET(new Request("http://localhost/api/internal/clinical-rotations/cleanup", {
    headers: { authorization: "Bearer wrong-secret" }
  }));
  assertCheck("cleanup handler rejects bad secret", unauthorized.status === 403);

  const authorized = await GET(new Request("http://localhost/api/internal/clinical-rotations/cleanup", {
    headers: { authorization: `Bearer ${secret}` }
  }));
  const body = await authorized.json() as CleanupResponse;

  assertCheck("cleanup handler accepts valid secret", authorized.status === 200);
  assertCheck("cleanup handler returns ok", body.ok === true);
  assertCheck("cleanup handler returns identity count", typeof body.result?.identityDocuments?.deleted === "number");
  assertCheck("cleanup handler returns source counts", typeof body.result?.eligibilitySources?.deleted === "number" && typeof body.result?.eligibilitySources?.failed === "number");

  console.log(JSON.stringify({
    status: "ok",
    unauthorizedStatus: unauthorized.status,
    authorizedStatus: authorized.status,
    identityDocumentsDeleted: body.result?.identityDocuments?.deleted ?? 0,
    eligibilitySourcesDeleted: body.result?.eligibilitySources?.deleted ?? 0,
    eligibilitySourcesFailed: body.result?.eligibilitySources?.failed ?? 0
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

export {};
