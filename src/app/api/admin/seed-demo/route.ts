import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "טעינת נתוני דמו אינה זמינה דרך האתר." }, {
    status: 410, headers: { "Cache-Control": "no-store" }
  });
}
