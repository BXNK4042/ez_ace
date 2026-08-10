import { get } from "@vercel/blob";
import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { classes, documents } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.mustChangePassword) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const conditions = session.user.role === "admin" ? eq(documents.id, id) : and(eq(documents.id, id), isNull(classes.archivedAt));
  const [document] = await db.select({ pathname: documents.pathname, filename: documents.filename }).from(documents).innerJoin(classes, eq(documents.classId, classes.id)).where(conditions).limit(1);
  if (!document) return new NextResponse("Not found", { status: 404 });
  const range = request.headers.get("range");
  const result = await get(document.pathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") ?? undefined, headers: range ? { range } : undefined });
  if (!result) return new NextResponse("Not found", { status: 404 });
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" } });
  const download = request.nextUrl.searchParams.has("download");
  const safeName = document.filename.replace(/["\\\r\n]/g, "_");
  const headers = new Headers({
    "Content-Type": "application/pdf", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-cache",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
    "ETag": result.blob.etag,
  });
  for (const name of ["content-length", "content-range", "accept-ranges", "last-modified"]) {
    const value = result.headers.get(name); if (value) headers.set(name, value);
  }
  return new NextResponse(result.stream, { status: result.headers.has("content-range") ? 206 : 200, headers });
}
