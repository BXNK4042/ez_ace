import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession(); if (!session || session.user.mustChangePassword || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.userId !== "string" || body.userId === session.user.id) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  const [target] = await db.select({ banned: user.banned, role: user.role }).from(user).where(eq(user.id, body.userId)).limit(1);
  if (!target || target.role === "admin") return NextResponse.json({ error: "Student not found" }, { status: 404 });
  try {
    const requestHeaders = await headers();
    if (body.action === "toggle") {
      if (target.banned) await auth.api.unbanUser({ body: { userId: body.userId }, headers: requestHeaders });
      else await auth.api.banUser({ body: { userId: body.userId, banReason: "Deactivated by admin" }, headers: requestHeaders });
      return NextResponse.json({ updated: true });
    }
    if (body.action === "reset") {
      const temporaryPassword = randomBytes(15).toString("base64url");
      await auth.api.setUserPassword({ body: { userId: body.userId, newPassword: temporaryPassword }, headers: requestHeaders });
      await db.update(user).set({ mustChangePassword: true, temporaryPasswordUsed: false, updatedAt: new Date() }).where(eq(user.id, body.userId));
      return NextResponse.json({ temporaryPassword });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Action failed" }, { status: 400 }); }
}
