import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { exams } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session || session.user.mustChangePassword || session.user.role !== "admin") return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params; const [exam] = await db.select({ title: exams.title, source: exams.sourceCsv }).from(exams).where(eq(exams.id, id)).limit(1);
  if (!exam) return new NextResponse("Not found", { status: 404 });
  const name = exam.title.replace(/[^a-zA-Z0-9_-]/g, "_");
  return new NextResponse(exam.source, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
