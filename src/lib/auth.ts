import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const safeEqual = (left: string, right: string) => timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());

if (!process.env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is required");
if (!process.env.SIGNUP_CODE) throw new Error("SIGNUP_CODE is required");

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  user: {
    additionalFields: {
      mustChangePassword: { type: "boolean", defaultValue: false, input: false },
      temporaryPasswordUsed: { type: "boolean", defaultValue: false, input: false },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 15, max: 5 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path === "/sign-in/username") {
        const [candidate] = await db.select({ mustChange: schema.user.mustChangePassword, used: schema.user.temporaryPasswordUsed }).from(schema.user).where(eq(schema.user.username, String(context.body?.username ?? "").toLowerCase())).limit(1);
        if (candidate?.mustChange && candidate.used) throw new APIError("UNAUTHORIZED", { message: "Temporary password expired. Ask admin for a new reset." });
      }
      if (context.path !== "/sign-up/email") return;
      const adminName = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
      const seedSecret = process.env.BETTER_AUTH_SECRET ?? "";
      if (String(context.body?.username ?? "").toLowerCase() === adminName && (!seedSecret || !safeEqual(context.headers?.get("x-admin-seed") ?? "", seedSecret))) {
        throw new APIError("BAD_REQUEST", { message: "Username unavailable" });
      }
      const supplied = context.headers?.get("x-signup-code") ?? "";
      const expected = process.env.SIGNUP_CODE ?? "";
      if (!expected || !safeEqual(supplied, expected)) {
        throw new APIError("BAD_REQUEST", { message: "Invalid signup code" });
      }
    }),
    after: createAuthMiddleware(async (context) => {
      const signedIn = context.path === "/sign-in/username" ? context.context.newSession?.user : null;
      if (signedIn?.mustChangePassword) await db.update(schema.user).set({ temporaryPasswordUsed: true, updatedAt: new Date() }).where(eq(schema.user.id, signedIn.id));
    }),
  },
  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    admin({ defaultRole: "student", adminRoles: ["admin"] }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
