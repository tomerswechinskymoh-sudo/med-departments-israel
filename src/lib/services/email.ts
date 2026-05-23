export type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type TransactionalEmailResult = {
  delivered: boolean;
  skipped: boolean;
};

export function getBaseUrl() {
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    (vercelUrl ? `https://${vercelUrl.replace(/^https?:\/\//, "")}` : undefined) ||
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
    const missing = [
      !resendApiKey ? "RESEND_API_KEY" : null,
      !emailFrom ? "EMAIL_FROM" : null
    ].filter(Boolean);
    const message = `[email] Missing ${missing.join(" and ")}.`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(`${message} Email delivery is required in production.`);
    }

    console.warn(`${message} Skipping delivery in development.`);
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
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    throw new Error(payload?.message ?? payload?.error ?? "שליחת האימייל נכשלה.");
  }

  return {
    delivered: true,
    skipped: false
  };
}
