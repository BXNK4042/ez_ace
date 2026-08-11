import { del, get, head } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, documents } from "@/db/schema";
import { auth } from "@/lib/auth";

type Payload = { classId: string; kind: "lecture" | "summary"; filename: string };
const CAP = 750 * 1024 * 1024, MAX_FILE = 25 * 1024 * 1024;

function parsePayload(value: string | null): Payload {
  const data = JSON.parse(value ?? "{}");
  if (typeof data.classId !== "string" || !["lecture", "summary"].includes(data.kind) || typeof data.filename !== "string") throw new Error("Invalid upload metadata");
  return { classId: data.classId, kind: data.kind, filename: data.filename.replace(/[\\/\r\n]/g, "_").slice(0, 180) };
}

async function usage() {
  const [row] = await db.select({ bytes: sql<number>`coalesce(sum(${documents.size}), 0)` }).from(documents);
  return Number(row.bytes);
}

async function verifyPdf(pathname: string) {
  const blob = await get(pathname, { access: "private" }); if (!blob || blob.statusCode !== 200) return false;
  const reader = blob.stream.getReader(); const bytes: number[] = [];
  while (bytes.length < 5) { const chunk = await reader.read(); if (chunk.done) break; bytes.push(...chunk.value.slice(0, 5 - bytes.length)); }
  await reader.cancel(); return new TextDecoder().decode(new Uint8Array(bytes)) === "%PDF-";
}

async function finalize(pathname: string, tokenPayload: string | null) {
  const data = parsePayload(tokenPayload);
  if (!pathname.startsWith(`classes/${data.classId}/`)) throw new Error("Invalid pathname");
  const [existing] = await db.select({ id: documents.id }).from(documents).where(eq(documents.pathname, pathname)).limit(1);
  if (existing) return;
  const metadata = await head(pathname);
  if (metadata.size > MAX_FILE || metadata.contentType !== "application/pdf" || await usage() + metadata.size > CAP || !(await verifyPdf(pathname))) { await del(pathname); throw new Error("Rejected invalid PDF"); }
  // ponytail: one global upload lock; split by store only if admin upload throughput matters.
  const [, inserted] = await db.batch([
    db.execute(sql`select pg_advisory_xact_lock(750000000)`),
    db.execute(sql`insert into ${documents} (${sql.identifier(documents.classId.name)}, ${sql.identifier(documents.kind.name)}, ${sql.identifier(documents.filename.name)}, ${sql.identifier(documents.pathname.name)}, ${sql.identifier(documents.size.name)}) select ${data.classId}, ${data.kind}, ${data.filename}, ${pathname}, ${metadata.size} where (select coalesce(sum(${documents.size}), 0) from ${documents}) + ${metadata.size} <= ${CAP} on conflict (${sql.identifier(documents.pathname.name)}) do nothing returning ${sql.identifier(documents.id.name)}`),
  ]);
  if (!inserted.rows.length) {
    const [raced] = await db.select({ id: documents.id }).from(documents).where(eq(documents.pathname, pathname)).limit(1);
    if (!raced) { await del(pathname); throw new Error("750 MB storage cap reached"); }
  }
}

export async function POST(request: Request) {
  const body = await request.json() as HandleUploadBody | { type: "app.finalize"; pathname: string; clientPayload: string };
  try {
    if (body.type === "app.finalize") {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session || session.user.mustChangePassword || session.user.role !== "admin") throw new Error("Forbidden");
      await finalize(body.pathname, body.clientPayload);
      return NextResponse.json({ completed: true });
    }
    const response = await handleUpload({ request, body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session || session.user.mustChangePassword || session.user.role !== "admin") throw new Error("Forbidden");
        const data = parsePayload(clientPayload);
        if (!pathname.startsWith(`classes/${data.classId}/`) || !pathname.toLowerCase().endsWith(".pdf")) throw new Error("Invalid pathname");
        const [activeClass] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, data.classId), isNull(classes.archivedAt))).limit(1);
        if (!activeClass || await usage() >= CAP) throw new Error("Storage unavailable");
        return { allowedContentTypes: ["application/pdf"], maximumSizeInBytes: MAX_FILE, addRandomSuffix: true, tokenPayload: JSON.stringify(data) };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        await finalize(blob.pathname, tokenPayload ?? null);
      },
    });
    return NextResponse.json(response);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 }); }
}
