"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const signup = mode === "signup";
    const response = await fetch(signup ? "/api/signup" : "/api/auth/sign-in/username", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(signup ? { username, password, signupCode: String(data.get("signupCode") ?? "") } : { username, password }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.message ?? "Request failed"); setBusy(false); return; }
    router.push("/"); router.refresh();
  }

  return <form className="stack" onSubmit={submit}>
    <div className="field"><label htmlFor="username">Username</label><Input id="username" name="username" required minLength={3} maxLength={30} autoComplete="username" /></div>
    <div className="field"><label htmlFor="password">Password</label><Input id="password" name="password" type="password" required minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
    {mode === "signup" && <div className="field"><label htmlFor="signupCode">Signup code</label><Input id="signupCode" name="signupCode" type="password" required autoComplete="off" /></div>}
    {error && <p className="danger" role="alert">{error}</p>}
    <Button disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</Button>
  </form>;
}
