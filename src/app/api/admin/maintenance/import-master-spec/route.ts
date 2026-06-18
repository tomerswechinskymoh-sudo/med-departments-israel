import crypto from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importMasterCsvFiles } from "@/lib/server/master-csv-importer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeTokenEquals(actual: string | null, expected: string | undefined) {
  if (!actual || !expected) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function isSkippedResult(value: object) {
  return "skipped" in value && Boolean(value.skipped);
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.MAINTENANCE_IMPORT_TOKEN;
  const actualToken = request.headers.get("x-maintenance-token");

  if (!safeTokenEquals(actualToken, expectedToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await importMasterCsvFiles(prisma, {
    only: "spec",
    specialtyCsvPath: path.join(process.cwd(), "MASTER_Spec.csv")
  });
  const specialtyImport = result.specialty;

  if ("skipped" in specialtyImport) {
    return NextResponse.json(
      {
        ok: false,
        error: "Spec import was skipped unexpectedly"
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: specialtyImport.failed === 0,
    import: {
      batchId: specialtyImport.batchId,
      imported: specialtyImport.imported,
      failed: specialtyImport.failed,
      rows: specialtyImport.rows
    },
    skipped: {
      dataExp: isSkippedResult(result.dataExp),
      department: isSkippedResult(result.department),
      staleDepartmentRepair: isSkippedResult(result.staleDepartmentRepair)
    },
    warnings: []
  });
}
