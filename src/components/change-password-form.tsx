"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "./ui";

export function ChangePasswordForm() {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget);
    const response = await fetch("/api/account/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Password change failed"); setBusy(false); return; }
    router.push("/"); router.refresh();
  }
  return <form className="stack" onSubmit={submit}><div className="field"><label htmlFor="currentPassword">Temporary/current password</label><Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" /></div><div className="field"><label htmlFor="newPassword">New password</label><Input id="newPassword" name="newPassword" type="password" minLength={10} required autoComplete="new-password" /></div>{error && <p className="danger">{error}</p>}<Button disabled={busy}>{busy ? "Changing…" : "Change password"}</Button></form>;
}
