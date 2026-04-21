import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canUserPublishDepartment } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "יש להתחבר כדי לגשת לקבצים פרטיים." }, { status: 401 });
  }

  const { fileId } = await params;
  const file = await prisma.uploadedFile.findUnique({
    where: { id: fileId },
    include: {
      opening: {
        select: {
          departmentId: true
        }
      },
      application: {
        include: {
          opening: {
            select: {
              departmentId: true
            }
          }
        }
      }
    }
  });

  if (!file) {
    return NextResponse.json({ error: "הקובץ לא נמצא." }, { status: 404 });
  }

  const departmentId =
    file.departmentId ?? file.opening?.departmentId ?? file.application?.opening.departmentId ?? null;

  if (session.role !== "admin") {
    if (!departmentId || !session.isApprovedPublisher) {
      return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
    }

    const canAccess = await canUserPublishDepartment(session.userId, departmentId);

    if (!canAccess) {
      return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
    }
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
