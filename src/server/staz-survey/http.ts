import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ModerationError } from './moderation';
export const noStore = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };
export async function adminRequest(request: Request, mutation = false) {
  const session = await getSession();
  if (session?.role !== 'admin') throw new ModerationError('FORBIDDEN', 403);
  if (mutation) {
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== request.headers.get('host') || request.headers.get('sec-fetch-site') === 'cross-site') throw new ModerationError('INVALID_ORIGIN', 403);
  }
  return session;
}
export function fail(error: unknown) {
  const known = error instanceof ModerationError;
  return NextResponse.json({ error: known ? error.code : 'REQUEST_FAILED' }, { status: known ? error.status : 400, headers: noStore });
}
export function invalidateSurvey() { revalidatePath('/', 'layout'); }

export async function limitedBody(request: Request, limit: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > limit) throw new ModerationError('TOO_LARGE', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ModerationError('BODY_REQUIRED');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > limit) { await reader.cancel(); throw new ModerationError('TOO_LARGE', 413); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
export async function limitedJson(request: Request) { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await limitedBody(request, 64000))); }
