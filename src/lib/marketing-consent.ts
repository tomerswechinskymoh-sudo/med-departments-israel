export const MARKETING_CONSENT_VERSION = '2026-11-10.1';
export const MARKETING_CONSENT_COPY = 'אני מעוניין/ת לקבל בדוא״ל עדכונים, הצעות ותוכן שיווקי של האתר. אפשר לבטל את ההסכמה בכל עת.';
export const SERVICE_EMAIL_COPY = 'הודעות שירות הנחוצות להפעלת החשבון יישלחו לפי הצורך גם ללא הסכמה לדיוור שיווקי.';
export function hasDocumentedMarketingConsent(user: { marketingConsent: boolean; marketingConsentAt: Date | null; marketingConsentSource: string | null; marketingConsentVersion: string | null; marketingRevokedAt: Date | null }) {
  return Boolean(user.marketingConsent && user.marketingConsentAt && user.marketingConsentSource && user.marketingConsentVersion && !user.marketingRevokedAt);
}
