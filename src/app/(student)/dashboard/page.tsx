import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { BookOpen, Trophy } from "lucide-react";
import { db } from "@/db";
import { attempts, classes, exams } from "@/db/schema";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireUser();
  const activeClasses = await db.select().from(classes).where(isNull(classes.archivedAt)).orderBy(classes.name);
  const latest = await db.select({ id: attempts.id, title: exams.title, percentage: attempts.percentage, submittedAt: attempts.submittedAt })
    .from(attempts).innerJoin(exams, eq(attempts.examId, exams.id))
    .where(and(eq(attempts.userId, session.user.id), eq(attempts.status, "submitted"))).orderBy(desc(attempts.submittedAt)).limit(1);
  return <main className="shell stack"><div><h1>Your classes</h1><p className="muted">PDF notes and unlimited practice exams.</p></div>
    {latest[0] && <Card><div className="row"><Trophy size={20} /><strong>Latest result</strong></div><p>{latest[0].title}: {latest[0].percentage}%</p><Link className="button secondary small" href={`/results/${latest[0].id}`}>Review result</Link></Card>}
    <div className="grid">{activeClasses.map((item) => <Link key={item.id} href={`/classes/${item.id}`}><Card><BookOpen /><h2>{item.name}</h2><span className="success">Open class</span></Card></Link>)}</div>
    {!activeClasses.length && <Card><p className="muted">No active classes yet.</p></Card>}
  </main>;
}
