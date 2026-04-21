import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/server/seed-data";

export async function POST() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "גישה נדחתה." }, { status: 403 });
  }

  await seedDatabase(prisma);
  return NextResponse.json({ message: "נתוני הדמו נטענו מחדש." });
}
