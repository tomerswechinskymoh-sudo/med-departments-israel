import Link from "next/link";
import { CliniciansIllustration } from "./clinicians-illustration";
import { ProductIcon } from "@/components/ui/product-icon";
export function AuthAside({
  variant = "signup",
}: {
  variant?: "signup" | "login";
}) {
  return (
    <aside className={`auth-aside auth-aside--${variant}`}>
      <CliniciansIllustration priority sizes="(max-width: 639px) 120vw, (max-width: 1023px) 100vw, 80vw" />
      <div className="auth-aside-copy">
        <h2>
          {variant === "login" ? (
            <>
              קהילה מקצועית
              <br />
              בדרך להתמחות
            </>
          ) : (
            <>
              מצטרפים לקהילה
              <br />
              של הרופאות והרופאים
              <br />
              של מחר
            </>
          )}
        </h2>
        <p>
          שומרים מחלקות מעניינות, חוזרים לנתונים ומשווים בין האפשרויות באותו
          תחום.
        </p>
        <ul>
          <li><ProductIcon name="database"/><div><strong>גישה למידע מפורט</strong>מידע נוסף על מחלקות ותוכניות התמחות, בהתאם להרשאות החשבון.</div></li>
          <li><ProductIcon name="people"/><div><strong>חוויות מהקהילה הרפואית</strong>ניסיון וחוויות ששותפו ואושרו לפרסום בתהליך האתר.</div></li>
          <li><ProductIcon name="compare"/><div><strong>כלים לקבלת החלטה מושכלת</strong>שמרו מחלקות והשוו בין האפשרויות שמעניינות אתכם.</div></li>
          {variant === "signup" && <li><ProductIcon name="document"/><div><strong>חלק מקהילה מקצועית</strong>שתפו מידע וניסיון שעשויים לסייע לרופאים נוספים.</div></li>}
        </ul>
        <Link className="text-link" href="/privacy">
          איך נשמר המידע שלכם ←
        </Link>
      </div>
    </aside>
  );
}
