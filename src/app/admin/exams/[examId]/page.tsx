import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { choices, exams, questions } from "@/db/schema";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/session";

export default async function ExamPreviewPage({ params }: { params: Promise<{ examId: string }> }) {
  await requireAdmin(); const { examId } = await params;
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1); if (!exam) notFound();
  const rows = await db.select().from(questions).leftJoin(choices, eq(choices.questionId, questions.id)).where(eq(questions.examId, examId)).orderBy(asc(questions.ordinal), asc(choices.key));
  const grouped = new Map<string, { question: typeof rows[number]["questions"]; choices: NonNullable<typeof rows[number]["choices"]>[] }>();
  for (const row of rows) { const item = grouped.get(row.questions.id) ?? { question: row.questions, choices: [] }; if (row.choices) item.choices.push(row.choices); grouped.set(row.questions.id, item); }
  return <main className="shell stack"><div><Link className="muted" href="/admin">← Admin</Link><h1>{exam.title}</h1><p className="muted">Import preview · {exam.status}</p></div>{[...grouped.values()].map(({ question, choices: options }, index) => <Card key={question.id}><h2>{index + 1}. {question.text}</h2><ol type="A">{options.map((choice) => <li className={choice.isCorrect ? "success" : ""} key={choice.id}>{choice.text}{choice.isCorrect && " ✓"}</li>)}</ol><p><strong>Explanation:</strong> {question.explanation}</p></Card>)}</main>;
}
