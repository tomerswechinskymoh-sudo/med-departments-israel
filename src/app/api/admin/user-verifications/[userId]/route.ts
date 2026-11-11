import { NextResponse } from "next/server";
import { decideRegistration } from "@/lib/server/registration-decision";
import { hasValidSameOrigin } from "@/lib/security";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userVerificationModerationSchema } from "@/lib/validation";
import { sendUserVerificationRejectionEmail } from "@/lib/verification";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!hasValidSameOrigin(request)) return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 403 });
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = userVerificationModerationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "קלט לא תקין." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!user) {
    return NextResponse.json({ error: "המשתמש לא נמצא." }, { status: 404 });
  }

  const approved = parsed.data.status === "APPROVED";

  try {
    await decideRegistration({ userId, actorId: session.userId, approved, note: parsed.data.adminNote });
  } catch {
    await prisma.auditLog.create({ data: { actorUserId: session.userId, action: "signup.document_cleanup_failed", entityType: "User", entityId: userId, metadata: { decisionSaved: false, retryRequired: true } } }).catch(() => {
      console.error("signup.document_cleanup_failed", { userId, decisionSaved: false });
    });
    // Do not expose database errors, document content, names, or URLs.
    return NextResponse.json({ code: "DECISION_NOT_SAVED", error: "ההחלטה לא נשמרה והמחיקה לא אושרה. יש לנסות שוב; אם התקלה נמשכת, יש לברר את שיוך המסמכים. המשתמש נשאר במצבו הקודם." }, { status: 409 });
  }
  if (!approved) {
    try {
      await sendUserVerificationRejectionEmail({ to: user.email, fullName: user.fullName, reason: parsed.data.adminNote });
    } catch {
      return NextResponse.json({ message: "הבקשה נדחתה ומסמכי אימות ההרשמה נמחקו. שליחת הודעת השירות נכשלה; ניתן לנסות שוב את הפעולה לשליחה חוזרת.", notificationFailed: true });
    }
  }

  return NextResponse.json({
    message: approved ? "הסטטוס המקצועי אושר ומסמכי אימות ההרשמה נמחקו." : "בקשת האימות נדחתה ומסמכי אימות ההרשמה נמחקו."
  });
}
