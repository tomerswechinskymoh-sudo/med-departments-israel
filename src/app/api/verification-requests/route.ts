import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "פתיחת גישת נציג/ת מחלקה נעשית רק על ידי אדמין. אין מסלול בקשה עצמי מתוך האתר."
    },
    { status: 403 }
  );
}
