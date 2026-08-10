import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { answers, attempts, choices, exams, questions } from "@/db/schema";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/session";

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await requireUser(); const { attemptId } = await params;
  const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, attemptId), eq(attempts.userId, session.user.id), eq(attempts.status, "submitted"))).limit(1);
  if (!attempt) notFound();
  const [latest] = await db.select({ id: attempts.id }).from(attempts).where(and(eq(attempts.userId, session.user.id), eq(attempts.examId, attempt.examId), eq(attempts.status, "submitted"))).orderBy(desc(attempts.submittedAt)).limit(1);
  if (latest.id !== attempt.id) notFound();
  const [exam] = await db.select({ title: exams.title, classId: exams.classId }).from(exams).where(eq(exams.id, attempt.examId)).limit(1);
  const questionRows = await db.select().from(questions).where(inArray(questions.id, attempt.questionOrder));
  const choiceRows = await db.select().from(choices).innerJoin(questions, eq(choices.questionId, questions.id)).where(eq(questions.examId, attempt.examId));
  const answerRows = await db.select().from(answers).where(eq(answers.attemptId, attempt.id));
  const questionMap = new Map(questionRows.map((row) => [row.id, row]));
  const selected = new Map(answerRows.map((row) => [row.questionId, row.choiceId]));
  const choicesByQuestion = new Map<string, typeof choiceRows[number]["choices"][]>();
  for (const row of choiceRows) choicesByQuestion.set(row.choices.questionId, [...(choicesByQuestion.get(row.choices.questionId) ?? []), row.choices]);
  return <main className="shell stack"><div><Link className="muted" href={`/classes/${exam.classId}`}>← Back to class</Link><h1>{exam.title}</h1><p><strong>{attempt.score}/{attempt.questionOrder.length}</strong> · {attempt.percentage}% · Attempt {attempt.attemptNumber}</p></div>
    {attempt.questionOrder.map((questionId, index) => { const question = questionMap.get(questionId)!; const options = choicesByQuestion.get(questionId) ?? []; const chosen = options.find((choice) => choice.id === selected.get(questionId)); const correct = options.find((choice) => choice.isCorrect)!; return <Card key={questionId}><h2>{index + 1}. {question.text}</h2><p className={chosen?.isCorrect ? "success" : "danger"}>Your answer: {chosen?.text ?? "Unanswered"}</p><p className="success">Correct answer: {correct.text}</p><p><strong>Explanation:</strong> {question.explanation}</p></Card>; })}
  </main>;
}
