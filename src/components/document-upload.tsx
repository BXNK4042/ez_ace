"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function DocumentUpload({ classes }: { classes: { id: string; name: string }[] }) {
  const fileInput = useRef<HTMLInputElement>(null); const router = useRouter();
  const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const file = fileInput.current?.files?.[0]; if (!file) return;
    if (file.size > 25 * 1024 * 1024 || file.type !== "application/pdf" || new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-") { setStatus("Choose valid PDF no larger than 25 MB"); return; }
    setBusy(true); setStatus("Uploading…"); const data = new FormData(event.currentTarget); const classId = String(data.get("classId"));
    try {
      const payload = JSON.stringify({ classId, kind: data.get("kind"), filename: file.name });
      const blob = await upload(`classes/${classId}/${file.name.replace(/[^a-zA-Z0-9._ -]/g, "_")}`, file, { access: "private", handleUploadUrl: "/api/documents/upload", contentType: "application/pdf", clientPayload: payload });
      const finalized = await fetch("/api/documents/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "app.finalize", pathname: blob.pathname, clientPayload: payload }) });
      if (!finalized.ok) throw new Error((await finalized.json()).error ?? "Upload finalization failed");
      setStatus("Uploaded"); event.currentTarget.reset(); router.refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed"); }
    setBusy(false);
  }
  return <form className="grid" onSubmit={submit}><select className="input" name="classId" required>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="input" name="kind"><option value="lecture">Lecture</option><option value="summary">Summary slide</option></select><input className="input" ref={fileInput} name="file" type="file" accept="application/pdf,.pdf" required /><button className="button" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button><span aria-live="polite">{status}</span></form>;
}
