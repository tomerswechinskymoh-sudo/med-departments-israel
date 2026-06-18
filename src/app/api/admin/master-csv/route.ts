import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  importMasterCsvFiles,
  previewMasterCsvUpload,
  type MasterCsvUploadKind
} from "@/lib/server/master-csv-importer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

async function readCsvFile(formData: FormData, fieldName: string, kind: MasterCsvUploadKind) {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;

  const fileName = file.name || fieldName;
  if (!/\.csv$/i.test(fileName)) {
    throw new Error(`יש להעלות קובץ CSV עבור ${kind === "spec" ? "MASTER_Spec" : "MASTER_Dept"}.`);
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("קובץ CSV גדול מדי. המגבלה היא 8MB.");
  }

  return {
    kind,
    fileName,
    text: await file.text()
  };
}

async function writeTemporaryCsv(input: { kind: MasterCsvUploadKind; text: string }) {
  const tempPath = path.join(os.tmpdir(), `master-${input.kind}-${crypto.randomUUID()}.csv`);
  await fs.writeFile(tempPath, input.text, "utf8");
  return tempPath;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const formData = await request.formData();
  const action = formData.get("action") === "apply" ? "apply" : "preview";

  try {
    const uploads = (
      await Promise.all([
        readCsvFile(formData, "specFile", "spec"),
        readCsvFile(formData, "deptFile", "dept")
      ])
    ).filter((upload): upload is { kind: MasterCsvUploadKind; fileName: string; text: string } => Boolean(upload));

    if (uploads.length === 0) {
      return NextResponse.json({ error: "לא נבחר קובץ CSV." }, { status: 400 });
    }

    const previews = await Promise.all(
      uploads.map((upload) =>
        previewMasterCsvUpload({
          kind: upload.kind,
          csvText: upload.text,
          fileName: upload.fileName
        })
      )
    );

    if (action === "preview") {
      return NextResponse.json({ action, previews });
    }

    const invalidPreview = previews.find((preview) => !preview.headerMatches);
    if (invalidPreview) {
      return NextResponse.json(
        {
          error: "אי אפשר להחיל ייבוא לפני תיקון כותרות הקובץ.",
          previews
        },
        { status: 400 }
      );
    }

    const tempPaths: Partial<Record<MasterCsvUploadKind, string>> = {};

    try {
      for (const upload of uploads) {
        tempPaths[upload.kind] = await writeTemporaryCsv(upload);
      }

      const result: Record<string, unknown> = {};
      if (tempPaths.spec) {
        result.spec = await importMasterCsvFiles(prisma, {
          only: "spec",
          specialtyCsvPath: tempPaths.spec
        });
      }
      if (tempPaths.dept) {
        result.dept = await importMasterCsvFiles(prisma, {
          only: "dept",
          departmentCsvPath: tempPaths.dept
        });
      }

      return NextResponse.json({ action, previews, result });
    } finally {
      await Promise.all(
        Object.values(tempPaths).map((tempPath) =>
          tempPath ? fs.unlink(tempPath).catch(() => undefined) : Promise.resolve()
        )
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "פעולת CSV נכשלה."
      },
      { status: 400 }
    );
  }
}
