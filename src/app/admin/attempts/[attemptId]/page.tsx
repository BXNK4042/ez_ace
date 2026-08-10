import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { answers, attempts, choices, exams, questions, user } from "@/db/schema";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/session";

export default async function AttemptDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  await requireAdmin(); const { attemptId } = await params;
  const [attempt] = await db.select({ attempt: attempts, username: user.username, exam: exams.title }).from(attempts).innerJoin(user, eq(attempts.userId, user.id)).innerJoin(exams, eq(attempts.examId, exams.id)).where(eq(attempts.id, attemptId)).limit(1);
  if (!attempt) notFound();
  const rows = await db.select({ question: questions, choice: choices }).from(questions).innerJoin(choices, eq(choices.questionId, questions.id)).where(eq(questions.examId, attempt.attempt.examId));
  const saved = await db.select().from(answers).where(eq(answers.attemptId, attemptId));
  const selected = new Map(saved.map((answer) => [answer.questionId, answer.choiceId]));
  const grouped = new Map<string, { question: typeof rows[number]["question"]; choices: typeof rows[number]["choice"][] }>();
  for (const row of rows) { const item = grouped.get(row.question.id) ?? { question: row.question, choices: [] }; item.choices.push(row.choice); grouped.set(row.question.id, item); }
  return <main className="shell stack"><div><Link className="muted" href="/admin">← Admin</Link><h1>{attempt.username} · {attempt.exam}</h1><p>Attempt {attempt.attempt.attemptNumber} · {attempt.attempt.score}/{attempt.attempt.questionOrder.length} · {attempt.attempt.percentage}%</p></div>{attempt.attempt.questionOrder.map((id, index) => { const item = grouped.get(id)!; const chosen = item.choices.find((choice) => choice.id === selected.get(id)); const correct = item.choices.find((choice) => choice.isCorrect)!; return <Card key={id}><h2>{index + 1}. {item.question.text}</h2><p className={chosen?.isCorrect ? "success" : "danger"}>Selected: {chosen?.text ?? "Unanswered"}</p><p className="success">Correct: {correct.text}</p></Card>; })}</main>;
}
