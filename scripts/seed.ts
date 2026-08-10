import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { auth } from "../src/lib/auth";

const username = process.env.ADMIN_USERNAME?.trim() ?? "admin";
const password = process.env.ADMIN_PASSWORD ?? "";
if (password.length < 10) throw new Error("ADMIN_PASSWORD must have at least 10 characters");

const [existing] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.username, username)).limit(1);
if (existing && existing.role !== "admin") throw new Error("ADMIN_USERNAME already belongs to a non-admin account");
if (!existing) {
  await auth.api.signUpEmail({
    body: { username, name: username, email: `${username.toLowerCase()}@exam-prep.local`, password },
    headers: new Headers({ "x-signup-code": process.env.SIGNUP_CODE ?? "", "x-admin-seed": process.env.BETTER_AUTH_SECRET ?? "" }),
  });
}
await db.update(user).set({ role: "admin", banned: false, updatedAt: new Date() }).where(eq(user.username, username));
console.log(`Admin ready: ${username}`);
