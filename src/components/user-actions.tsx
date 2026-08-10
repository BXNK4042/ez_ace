"use client";

import { useState } from "react";

export function UserActions({ userId, banned }: { userId: string; banned: boolean }) {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function run(action: "toggle" | "reset") {
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, action }) });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setMessage(result.error ?? "Action failed"); return; }
    if (result.temporaryPassword) { setMessage(`Temporary password: ${result.temporaryPassword}`); return; }
    window.location.reload();
  }
  return <div className="stack"><div className="row"><button className={`button small ${banned ? "secondary" : "danger-button"}`} disabled={busy} onClick={() => run("toggle")}>{banned ? "Reactivate" : "Deactivate"}</button><button className="button secondary small" disabled={busy} onClick={() => run("reset")}>Reset password</button></div>{message && <code>{message}</code>}</div>;
}
