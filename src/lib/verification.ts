import crypto from "crypto";
import { escapeHtml, getBaseUrl, sendTransactionalEmail } from "@/lib/services/email";

export function createVerificationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function createTokenExpiry(hours = 72) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function supportContact() {
  return process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || "support@example.com";
}

export async function sendUserVerificationEmail(input: {
  to: string;
  fullName: string;
  token: string;
}) {
  const verificationUrl = `${getBaseUrl()}/api/verification/email?token=${encodeURIComponent(input.token)}`;
  const safeName = escapeHtml(input.fullName);
  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;background:#f5f8fb;padding:32px;">
      <div style="max-width:640px;margin:auto;background:white;border:1px solid #d7e4f0;border-radius:26px;padding:30px;">
        <p style="margin:0;color:#0b5fb5;font-weight:700;">הדרך להתמחות</p>
        <h1 style="margin:12px 0 0;color:#0f172a;">אימות כתובת אימייל</h1>
        <p style="line-height:1.8;color:#334155;">${safeName}, תודה שנרשמת. לחצו על הכפתור כדי לאמת את כתובת האימייל ולשמור על חשבון מאובטח.</p>
        <a href="${verificationUrl}" style="display:inline-block;margin-top:18px;padding:13px 20px;border-radius:999px;background:#0b5fb5;color:white;text-decoration:none;font-weight:700;">אימות אימייל</a>
        <p style="margin-top:24px;color:#64748b;font-size:13px;line-height:1.7;">אם לא נרשמת לאתר, אפשר להתעלם מההודעה.</p>
      </div>
    </div>
  `;
  const text = [
    `${input.fullName}, תודה שנרשמת לדרך להתמחות.`,
    `לאימות האימייל: ${verificationUrl}`,
    "אם לא נרשמת לאתר, אפשר להתעלם מההודעה."
  ].join("\n");

  return sendTransactionalEmail({
    to: input.to,
    subject: "הדרך להתמחות | אימות כתובת אימייל",
    html,
    text
  });
}

export async function sendReviewProofRequestEmail(input: {
  to: string;
  fullName?: string | null;
  departmentLabel: string;
  token: string;
}) {
  const uploadUrl = `${getBaseUrl()}/reviews/verify/${encodeURIComponent(input.token)}`;
  const safeName = escapeHtml(input.fullName || "שלום");
  const safeDepartment = escapeHtml(input.departmentLabel);
  const safeSupport = escapeHtml(supportContact());
  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;background:#f5f8fb;padding:32px;">
      <div style="max-width:680px;margin:auto;background:white;border:1px solid #d7e4f0;border-radius:26px;padding:30px;">
        <p style="margin:0;color:#0b5fb5;font-weight:700;">הדרך להתמחות</p>
        <h1 style="margin:12px 0 0;color:#0f172a;">נדרש אימות לפני פרסום השיתוף</h1>
        <p style="line-height:1.8;color:#334155;">${safeName}, קיבלנו את השיתוף שלך על ${safeDepartment}. כדי שנוכל לבדוק אותו לפרסום, נדרש לצרף אסמכתא תומכת או תיעוד מתאים.</p>
        <div style="margin:18px 0;padding:16px;border-radius:18px;background:#eff6ff;color:#334155;line-height:1.8;">
          האסמכתא נשמרת בפרטיות, גלויה לאדמין בלבד, ומשמשת לאימות זהות/השתתפות במחלקה.
        </div>
        <a href="${uploadUrl}" style="display:inline-block;margin-top:8px;padding:13px 20px;border-radius:999px;background:#0b5fb5;color:white;text-decoration:none;font-weight:700;">העלאת אסמכתא לאימות</a>
        <p style="margin-top:24px;color:#64748b;font-size:13px;line-height:1.7;">לתמיכה או שאלות: ${safeSupport}</p>
      </div>
    </div>
  `;
  const text = [
    `${input.fullName || "שלום"}, קיבלנו את השיתוף שלך על ${input.departmentLabel}.`,
    "כדי שנוכל לבדוק אותו לפרסום, נדרש לצרף אסמכתא תומכת.",
    `להעלאת אסמכתא: ${uploadUrl}`,
    `תמיכה: ${supportContact()}`
  ].join("\n");

  return sendTransactionalEmail({
    to: input.to,
    subject: "הדרך להתמחות | השלמת אימות לשיתוף חוויה",
    html,
    text
  });
}
