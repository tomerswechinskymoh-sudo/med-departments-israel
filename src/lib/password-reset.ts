import crypto from "crypto";
import { escapeHtml, getBaseUrl, sendTransactionalEmail } from "@/lib/services/email";

export function createPasswordResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function createPasswordResetExpiry() {
  return new Date(Date.now() + 60 * 60 * 1000);
}

export function getPasswordResetUrl(token: string, baseUrl = getBaseUrl()) {
  return `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(input: {
  to: string;
  fullName: string;
  token: string;
  baseUrl?: string;
}) {
  const resetUrl = getPasswordResetUrl(input.token, input.baseUrl);
  const safeName = escapeHtml(input.fullName);
  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;background:#f5f8fb;padding:32px;">
      <div style="max-width:640px;margin:auto;background:white;border:1px solid #d7e4f0;border-radius:26px;padding:30px;">
        <p style="margin:0;color:#0b5fb5;font-weight:700;">הדרך להתמחות</p>
        <h1 style="margin:12px 0 0;color:#0f172a;">איפוס סיסמה</h1>
        <p style="line-height:1.8;color:#334155;">${safeName}, התקבלה בקשה לאיפוס הסיסמה שלך. הקישור תקף לשעה אחת.</p>
        <a href="${resetUrl}" style="display:inline-block;margin-top:18px;padding:13px 20px;border-radius:999px;background:#0b5fb5;color:white;text-decoration:none;font-weight:700;">איפוס סיסמה</a>
        <p style="margin-top:24px;color:#64748b;font-size:13px;line-height:1.7;">אם לא ביקשת לאפס סיסמה, אפשר להתעלם מההודעה.</p>
      </div>
    </div>
  `;
  const text = [
    `${input.fullName}, התקבלה בקשה לאיפוס הסיסמה שלך.`,
    "הקישור תקף לשעה אחת:",
    resetUrl,
    "אם לא ביקשת לאפס סיסמה, אפשר להתעלם מההודעה."
  ].join("\n");

  return sendTransactionalEmail({
    to: input.to,
    subject: "איפוס סיסמה | הדרך להתמחות",
    html,
    text
  });
}
