import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionTokenEdge } from "@/lib/auth-edge";
import { getSessionCookieName } from "@/lib/session";

import { guardPlacementRequest } from "@/lib/placements/request-guard";

const authRequiredPrefixes = ["/dashboard", "/favorites"];
const representativePrefixes = ["/representative"];
const adminPrefixes = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const placementBlock = await guardPlacementRequest(request);
  if (placementBlock) return placementBlock;
  const requiresAuth = [...authRequiredPrefixes, ...representativePrefixes, ...adminPrefixes].some(
    (prefix) => pathname.startsWith(prefix)
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getSessionCookieName())?.value;
  const session = await parseSessionTokenEdge(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (representativePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (session.role !== "representative") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (adminPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/favorites/:path*", "/representative/:path*", "/admin/:path*"]
};
