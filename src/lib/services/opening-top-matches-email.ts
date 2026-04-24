type TopMatchEmailApplication = {
  id: string;
  fullName: string;
  matchScore: number | null;
  matchShortSummary: string | null;
};

type TopMatchEmailInput = {
  ownerEmail: string;
  ownerName?: string | null;
  opening: {
    id: string;
    title: string;
    applicationDeadline?: Date | string | null;
    department: {
      name: string;
      institution: {
        name: string;
      };
    };
  };
  totalApplicants: number;
  selectedApplicants: TopMatchEmailApplication[];
};

function getBaseUrl() {
  return process.env.APP_URL?.trim() || "http://localhost:3000";
}

function buildTopMatchRows(input: TopMatchEmailInput) {
  return input.selectedApplicants
    .map((application) => {
      const scoreLabel = application.matchScore ?? "ללא ציון";
      const reviewUrl = `${getBaseUrl()}/representative/openings/${input.opening.id}#application-${application.id}`;

      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #d7e4f0;font-weight:700;color:#0f172a;">${application.fullName}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #d7e4f0;color:#0f172a;">${scoreLabel}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #d7e4f0;color:#334155;line-height:1.8;">${application.matchShortSummary ?? "לא נוסף סיכום קצר."}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #d7e4f0;"><a href="${reviewUrl}" style="color:#0b5fb5;font-weight:700;text-decoration:none;">לצפייה במועמדות</a></td>
        </tr>
      `;
    })
    .join("");
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();

  if (!resendApiKey || !emailFrom) {
    console.warn(
      "[opening-top-matches-email] RESEND_API_KEY or EMAIL_FROM is missing. Skipping delivery."
    );
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

export async function sendOpeningTopMatchesEmail(input: TopMatchEmailInput) {
  const subject = `הדרך להתמחות | סיכום התאמות אחרי הדדליין עבור ${input.opening.title}`;
  const reviewUrl = `${getBaseUrl()}/representative/openings/${input.opening.id}`;
  const rows = buildTopMatchRows(input);
  const applicantLines = input.selectedApplicants
    .map((application) => {
      const score = application.matchScore ?? "ללא ציון";
      return `- ${application.fullName} | ציון התאמה: ${score} | ${application.matchShortSummary ?? "ללא סיכום"} | ${reviewUrl}#application-${application.id}`;
    })
    .join("\n");

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;background:#f5f8fb;padding:32px;">
      <div style="max-width:760px;margin:0 auto;background:white;border-radius:28px;padding:32px;border:1px solid #d7e4f0;box-shadow:0 20px 60px rgba(15,23,42,0.08);">
        <p style="margin:0;font-size:13px;font-weight:700;color:#0b5fb5;">הדרך להתמחות</p>
        <h1 style="margin:12px 0 0;font-size:30px;line-height:1.3;color:#0f172a;">סיכום התאמות אחרי הדדליין</h1>
        <p style="margin:16px 0 0;font-size:16px;line-height:1.8;color:#334155;">
          ${input.ownerName ? `${input.ownerName}, ` : ""}הדדליין לתקן <strong>${input.opening.title}</strong> הגיע.
          סיננו עבורך את המועמדים עם ההתאמה הגבוהה ביותר, כדי להתחיל מהאנשים שהכי שווה לבדוק לעומק.
        </p>

        <div style="margin-top:24px;padding:18px 20px;border-radius:20px;background:#eff6ff;">
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>מחלקה:</strong> ${input.opening.department.institution.name} · ${input.opening.department.name}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>דדליין:</strong> ${input.opening.applicationDeadline ? new Date(input.opening.applicationDeadline).toLocaleDateString("he-IL") : "לא הוגדר"}</p>
          <p style="margin:0;font-size:14px;color:#334155;"><strong>סה״כ מועמדים:</strong> ${input.totalApplicants}</p>
        </div>

        ${
          input.selectedApplicants.length > 0
            ? `
              <table style="width:100%;margin-top:28px;border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="padding:0 12px 12px;text-align:right;color:#64748b;font-size:12px;">מועמד/ת</th>
                    <th style="padding:0 12px 12px;text-align:right;color:#64748b;font-size:12px;">ציון התאמה</th>
                    <th style="padding:0 12px 12px;text-align:right;color:#64748b;font-size:12px;">סיכום קצר</th>
                    <th style="padding:0 12px 12px;text-align:right;color:#64748b;font-size:12px;">פעולה</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            `
            : `
              <div style="margin-top:28px;padding:18px 20px;border-radius:20px;background:#fff7ed;color:#7c2d12;line-height:1.8;">
                לא נקלטו מועמדויות מתאימות למשלוח בתקציר הזה. אפשר להיכנס לתקן ולבדוק אם נוספו חומרים ידנית.
              </div>
            `
        }

        <a href="${reviewUrl}" style="display:inline-block;margin-top:28px;padding:14px 20px;border-radius:999px;background:#0b5fb5;color:white;font-weight:700;text-decoration:none;">לניהול התקן המלא</a>
      </div>
    </div>
  `;

  const text = [
    `${input.ownerName ? `${input.ownerName}, ` : ""}הדדליין לתקן ${input.opening.title} הגיע.`,
    `מחלקה: ${input.opening.department.institution.name} · ${input.opening.department.name}`,
    `סה"כ מועמדים: ${input.totalApplicants}`,
    input.selectedApplicants.length > 0 ? "המועמדים המובילים:" : "לא נמצאו מועמדויות מתאימות למשלוח בתקציר הזה.",
    applicantLines,
    `לניהול מלא: ${reviewUrl}`
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to: input.ownerEmail,
    subject,
    html,
    text
  });
}
