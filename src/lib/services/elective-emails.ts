import { escapeHtml, getBaseUrl, sendTransactionalEmail } from "@/lib/services/email";
import { formatDate } from "@/lib/utils";

type DepartmentEmailInfo = {
  id: string;
  name: string;
  institution: { name: string };
  specialty: { name: string };
};

type ApplicationEmailInfo = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  requestedStartDate: Date | null;
  requestedEndDate: Date | null;
  studentNotes?: string | null;
  representativeNotes?: string | null;
  proposedStartDate?: Date | null;
  proposedEndDate?: Date | null;
  status: string;
  department: DepartmentEmailInfo;
};

function dateRange(application: Pick<ApplicationEmailInfo, "requestedStartDate" | "requestedEndDate">) {
  const start = application.requestedStartDate ? formatDate(application.requestedStartDate) : "לא צוין";
  const end = application.requestedEndDate ? formatDate(application.requestedEndDate) : "לא צוין";
  return `${start} - ${end}`;
}

function proposedDateRange(application: Pick<ApplicationEmailInfo, "proposedStartDate" | "proposedEndDate">) {
  if (!application.proposedStartDate || !application.proposedEndDate) {
    return null;
  }

  return `${formatDate(application.proposedStartDate)} - ${formatDate(application.proposedEndDate)}`;
}

export async function sendElectiveApplicationSubmittedEmails(input: {
  application: ApplicationEmailInfo;
  representativeRecipients: Array<{ email: string; name: string }>;
}) {
  const baseUrl = getBaseUrl();
  const representativeLink = `${baseUrl}/electives/department/applications/${input.application.id}`;
  const adminLink = `${baseUrl}/admin/electives/applications`;
  const recipients = Array.from(new Map(input.representativeRecipients.map((recipient) => [recipient.email, recipient])).values());
  const results = [];

  for (const recipient of recipients) {
    results.push(await sendTransactionalEmail({
      to: recipient.email,
      subject: `בקשת אלקטיב חדשה - ${input.application.department.institution.name}`,
      text: [
        `שלום ${recipient.name},`,
        `התקבלה בקשת אלקטיב חדשה.`,
        `סטודנט/ית: ${input.application.applicantName}`,
        `אימייל: ${input.application.applicantEmail}`,
        `מחלקה: ${input.application.department.institution.name} · ${input.application.department.specialty.name} · ${input.application.department.name}`,
        `תאריכים: ${dateRange(input.application)}`,
        input.application.studentNotes ? `הערות: ${input.application.studentNotes}` : null,
        `לניהול הבקשה: ${representativeLink}`,
        `אדמין: ${adminLink}`
      ].filter(Boolean).join("\n"),
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">
          <p>שלום ${escapeHtml(recipient.name)},</p>
          <p>התקבלה בקשת אלקטיב חדשה.</p>
          <ul>
            <li><strong>סטודנט/ית:</strong> ${escapeHtml(input.application.applicantName)}</li>
            <li><strong>אימייל:</strong> ${escapeHtml(input.application.applicantEmail)}</li>
            <li><strong>מחלקה:</strong> ${escapeHtml(input.application.department.institution.name)} · ${escapeHtml(input.application.department.specialty.name)} · ${escapeHtml(input.application.department.name)}</li>
            <li><strong>תאריכים:</strong> ${escapeHtml(dateRange(input.application))}</li>
          </ul>
          ${input.application.studentNotes ? `<p><strong>הערות:</strong> ${escapeHtml(input.application.studentNotes)}</p>` : ""}
          <p><a href="${representativeLink}">פתיחת הבקשה בפורטל המחלקה</a></p>
          <p><a href="${adminLink}">פתיחה באדמין</a></p>
        </div>
      `
    }));
  }

  return results;
}

export async function sendElectiveDecisionEmail(input: { application: ApplicationEmailInfo }) {
  const baseUrl = getBaseUrl();
  const myApplicationsLink = `${baseUrl}/student/electives/my-applications`;
  const proposed = proposedDateRange(input.application);
  const statusText: Record<string, string> = {
    APPROVED: "אושרה",
    REJECTED: "נדחתה",
    WAITLISTED: "הועברה לרשימת המתנה",
    ALTERNATIVE_OFFERED: "קיבלה הצעת תאריכים חלופית"
  };

  return sendTransactionalEmail({
    to: input.application.applicantEmail,
    subject: `עדכון בקשת אלקטיב - ${input.application.department.institution.name}`,
    text: [
      `שלום ${input.application.applicantName},`,
      `בקשת האלקטיב שלך ${statusText[input.application.status] ?? input.application.status}.`,
      `מחלקה: ${input.application.department.institution.name} · ${input.application.department.specialty.name} · ${input.application.department.name}`,
      `תאריכים מבוקשים: ${dateRange(input.application)}`,
      proposed ? `תאריכים חלופיים: ${proposed}` : null,
      input.application.representativeNotes ? `הערות המחלקה: ${input.application.representativeNotes}` : null,
      `צפייה בבקשות שלי: ${myApplicationsLink}`
    ].filter(Boolean).join("\n"),
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">
        <p>שלום ${escapeHtml(input.application.applicantName)},</p>
        <p>בקשת האלקטיב שלך ${escapeHtml(statusText[input.application.status] ?? input.application.status)}.</p>
        <ul>
          <li><strong>מחלקה:</strong> ${escapeHtml(input.application.department.institution.name)} · ${escapeHtml(input.application.department.specialty.name)} · ${escapeHtml(input.application.department.name)}</li>
          <li><strong>תאריכים מבוקשים:</strong> ${escapeHtml(dateRange(input.application))}</li>
          ${proposed ? `<li><strong>תאריכים חלופיים:</strong> ${escapeHtml(proposed)}</li>` : ""}
        </ul>
        ${input.application.representativeNotes ? `<p><strong>הערות המחלקה:</strong> ${escapeHtml(input.application.representativeNotes)}</p>` : ""}
        <p><a href="${myApplicationsLink}">צפייה בבקשות שלי</a></p>
      </div>
    `
  });
}
