export type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function getBaseUrl() {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();

  if (!resendApiKey || !emailFrom) {
    console.warn("[email] RESEND_API_KEY or EMAIL_FROM is missing. Skipping delivery.");
    return {
      delivered: false,
      skipped: true
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "שליחת האימייל נכשלה.");
  }

  return {
    delivered: true,
    skipped: false
  };
}
