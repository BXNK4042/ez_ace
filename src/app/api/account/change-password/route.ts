import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string" || body.newPassword.length < 10) return NextResponse.json({ error: "New password needs at least 10 characters" }, { status: 400 });
  try {
    await auth.api.changePassword({ body: { currentPassword: body.currentPassword, newPassword: body.newPassword, revokeOtherSessions: true }, headers: await headers() });
    await db.update(user).set({ mustChangePassword: false, temporaryPasswordUsed: false, updatedAt: new Date() }).where(eq(user.id, session.user.id));
    return NextResponse.json({ changed: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Password change failed" }, { status: 400 }); }
}
