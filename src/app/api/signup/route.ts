import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.set("x-signup-code", typeof body.signupCode === "string" ? body.signupCode : "");
  return auth.handler(new Request(new URL("/api/auth/sign-up/email", request.url), {
    method: "POST",
    headers,
    body: JSON.stringify({ username, name: username, email: `${username.toLowerCase()}@exam-prep.local`, password: body.password }),
  }));
}
