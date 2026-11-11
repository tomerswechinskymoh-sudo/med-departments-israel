import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MARKETING_CONSENT_VERSION, hasDocumentedMarketingConsent } from '@/lib/marketing-consent';
import { escapeHtml, getBaseUrl, sendTransactionalEmail } from '@/lib/services/email';
function tokenKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Unsubscribe token configuration missing');
  return createHash('sha256').update(`marketing-unsubscribe:${secret}`).digest();
}
export function unsubscribeToken(userId: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', tokenKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify({ purpose: 'marketing-unsubscribe', userId }), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function readUnsubscribeToken(token: string): string | null {
  try {
    if (!/^[\w-]{40,1024}$/.test(token)) return null;
    const bytes = Buffer.from(token, 'base64url'), decipher = createDecipheriv('aes-256-gcm', tokenKey(), bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    return payload.purpose === 'marketing-unsubscribe' && typeof payload.userId === 'string' ? payload.userId : null;
  } catch { return null; }
}
export async function recordMarketingConsent(tx: Prisma.TransactionClient, userId: string, consent: boolean, source: 'signup' | 'account' | 'email-unsubscribe') {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  await tx.user.update({where:{id:userId},data:{
    marketingConsent: consent, marketingConsentAt: consent ? new Date() : null,
    marketingConsentSource: source, marketingConsentVersion: MARKETING_CONSENT_VERSION,
    marketingRevokedAt: consent ? null : new Date()
  }});
  await tx.marketingConsentEvent.create({data:{userId,consent,source,version:MARKETING_CONSENT_VERSION}});
}
export async function changeMarketingConsent(userId: string, consent: boolean, source: 'account' | 'email-unsubscribe') {
  await prisma.$transaction(tx => recordMarketingConsent(tx, userId, consent, source));
}
// The ONLY entry point for marketing (including future queue workers). Eligibility
// is checked under the same user lock as unsubscribe immediately before dispatch.
export async function sendMarketingEmail(input: { userId: string; subject: string; html: string; text: string }) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${input.userId} FOR UPDATE`;
    const user = await tx.user.findUnique({where:{id:input.userId}});
    if (!user || !hasDocumentedMarketingConsent(user)) return { delivered:false, skipped:true };
    const address = process.env.MARKETING_ADVERTISER_ADDRESS?.trim();
    const contact = process.env.MARKETING_REPLY_TO?.trim();
    if (!address || !contact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) throw new Error('Verified advertiser address and refusal mailbox are required');
    const link = `${getBaseUrl().replace(/\/$/,'')}/unsubscribe?token=${unsubscribeToken(user.id)}`;
    const footer = `משרד הבריאות — Hitmachut.org\n${address}\nיצירת קשר וסירוב לקבלת פרסומות: ${contact}\nאפשר לבטל את ההסכמה בכל עת, ללא התחברות: ${link}`;
    return sendTransactionalEmail({to:user.email, subject:`פרסומת | ${input.subject}`, text:`${input.text}\n\n${footer}`,
      html:`${input.html}<footer dir="rtl"><p>${escapeHtml('משרד הבריאות — Hitmachut.org')}</p><p>${escapeHtml(address)}</p><p>יצירת קשר וסירוב: <a href="mailto:${escapeHtml(contact)}">${escapeHtml(contact)}</a></p><a href="${escapeHtml(link)}">ביטול הסכמה לדיוור שיווקי ללא התחברות</a></footer>`,
      replyTo:contact, headers:{'List-Unsubscribe':`<${link}>`, 'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}
    });
  }, { timeout: 20000 });
}
