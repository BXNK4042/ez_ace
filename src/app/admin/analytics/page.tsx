import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, exams, user } from "@/db/schema";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/session";

export default async function AnalyticsPage() {
  await requireAdmin();
  const rows = await db.select({ userId: user.id, username: user.username, examId: exams.id, exam: exams.title, attemptNumber: attempts.attemptNumber, percentage: attempts.percentage }).from(attempts).innerJoin(user, eq(attempts.userId, user.id)).innerJoin(exams, eq(attempts.examId, exams.id)).where(eq(attempts.status, "submitted")).orderBy(asc(attempts.attemptNumber));
  const byStudentExam = new Map<string, typeof rows>();
  for (const row of rows) { const key = `${row.userId}:${row.examId}`; const list = byStudentExam.get(key) ?? []; list.push(row); byStudentExam.set(key, list); }
  const comparisons = [...byStudentExam.values()].map((list) => ({ username: list[0].username ?? "Unknown", exam: list[0].exam, first: list[0].percentage ?? 0, latest: list.at(-1)?.percentage ?? 0 }));
  const byStudent = new Map<string, typeof comparisons>();
  for (const row of comparisons) { const list = byStudent.get(row.username) ?? []; list.push(row); byStudent.set(row.username, list); }
  const ranking = [...byStudent].map(([username, list]) => ({ username, first: Math.round(list.reduce((sum, item) => sum + item.first, 0) / list.length), latest: Math.round(list.reduce((sum, item) => sum + item.latest, 0) / list.length) })).sort((a, b) => b.first - a.first);
  return <main className="shell stack"><div><Link className="muted" href="/admin">← Admin</Link><h1>First-attempt ranking</h1><p className="muted">Rank uses average first-attempt percentage across exams. Bars compare first and latest averages.</p></div><Card><div className="table-wrap"><table><thead><tr><th>Rank</th><th>Student</th><th>First</th><th>Latest</th></tr></thead><tbody>{ranking.map((item, index) => <tr key={item.username}><td>{index + 1}</td><td>{item.username}</td><td><div className="row"><div className="bar"><span style={{ width: `${item.first}%` }} /></div>{item.first}%</div></td><td><div className="row"><div className="bar latest"><span style={{ width: `${item.latest}%` }} /></div>{item.latest}%</div></td></tr>)}</tbody></table></div>{!ranking.length && <p className="muted">No submitted attempts yet.</p>}</Card></main>;
}
