import { NextResponse } from 'next/server';
import { guardedPlacementMessage, isGuardedPlacementMutation, isPreservedPlacementOperation } from './pilot-release';
/** Also called by route handlers: the boundary does not rely on middleware execution. */
export async function guardPlacementRequest(request: Request) {
  const path = new URL(request.url).pathname;
  if (!isGuardedPlacementMutation(path, request.method)) return null;
  let action: unknown;
  if (['/api/clinical-rotations/hospital/applications', '/api/admin/clinical-rotations/applications'].includes(path)) {
    const reader = request.clone().body?.getReader();
    let text = ''; let size = 0;
    if (reader) try {
      const decoder = new TextDecoder();
      for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8192) break; text += decoder.decode(value, { stream: true }); }
      if (size <= 8192) action = JSON.parse(text).action;
    } catch { /* Invalid requests remain blocked. Never log request bodies. */ }
    finally { void reader.cancel().catch(() => undefined); }
  }
  if (isPreservedPlacementOperation(path, action)) return null;
  return NextResponse.json({ error: guardedPlacementMessage, code: 'PILOT_NOT_ENABLED' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}
