import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { classes, documents, exams } from "@/db/schema";
import { Card } from "@/components/ui";
import { PdfCover } from "@/components/pdf-cover";
import { requireUser } from "@/lib/session";
import { startAttempt } from "@/lib/attempt-actions";

export default async function ClassPage({ params }: { params: Promise<{ classId: string }> }) {
  await requireUser(); const { classId } = await params;
  const [classroom] = await db.select().from(classes).where(and(eq(classes.id, classId), isNull(classes.archivedAt))).limit(1);
  if (!classroom) notFound();
  const docs = await db.select().from(documents).where(eq(documents.classId, classId)).orderBy(desc(documents.createdAt));
  const published = await db.select().from(exams).where(and(eq(exams.classId, classId), eq(exams.status, "published"))).orderBy(desc(exams.publishedAt));
  const section = (kind: "lecture" | "summary", title: string) => <section className="stack"><h2>{title}</h2><div className="document-grid">{docs.filter((doc) => doc.kind === kind).map((doc) => <Card key={doc.id}><PdfCover documentId={doc.id} filename={doc.filename} /><h3>{doc.filename}</h3><div className="row"><a className="button secondary small" target="_blank" rel="noreferrer" href={`/api/documents/${doc.id}`}><ExternalLink size={14} /> Preview</a><a className="button secondary small" href={`/api/documents/${doc.id}?download`}><Download size={14} /> Download</a></div></Card>)}</div>{!docs.some((doc) => doc.kind === kind) && <p className="muted">Nothing uploaded yet.</p>}</section>;
  return <main className="shell stack"><div><Link className="muted" href="/dashboard">← Classes</Link><h1>{classroom.name}</h1></div>{section("lecture", "Lectures")}
    <section className="stack"><h2>Exams</h2><div className="grid">{published.map((exam) => <Card key={exam.id}><h3>{exam.title}</h3><form action={startAttempt}><input type="hidden" name="examId" value={exam.id} /><button className="button">Start or resume</button></form></Card>)}</div>{!published.length && <p className="muted">No published exams yet.</p>}</section>
    {section("summary", "Summary slides")}
  </main>;
}
