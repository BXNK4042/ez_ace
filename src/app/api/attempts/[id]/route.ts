import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { answers, attempts, choices, exams, questions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { scoreAnswers } from "@/lib/scoring";

async function owned(id: string, userId: string) {
  const [attempt] = await db.select().from(attempts).where(and(eq(attempts.id, id), eq(attempts.userId, userId))).limit(1);
  return attempt;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session || session.user.mustChangePassword) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const attempt = await owned(id, session.user.id);
  if (!attempt || attempt.status !== "in_progress") return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  const [exam] = await db.select({ title: exams.title }).from(exams).where(eq(exams.id, attempt.examId)).limit(1);
  const questionRows = await db.select({ id: questions.id, text: questions.text }).from(questions).where(inArray(questions.id, attempt.questionOrder));
  const choiceIds = Object.values(attempt.choiceOrder).flat();
  const choiceRows = await db.select({ id: choices.id, questionId: choices.questionId, text: choices.text }).from(choices).where(inArray(choices.id, choiceIds));
  const saved = await db.select({ questionId: answers.questionId, choiceId: answers.choiceId }).from(answers).where(eq(answers.attemptId, id));
  const questionMap = new Map(questionRows.map((row) => [row.id, row]));
  const choiceMap = new Map(choiceRows.map((row) => [row.id, row]));
  return NextResponse.json({ id, title: exam.title, questions: attempt.questionOrder.map((questionId) => ({ ...questionMap.get(questionId)!, choices: attempt.choiceOrder[questionId].map((choiceId) => choiceMap.get(choiceId)!) })), answers: Object.fromEntries(saved.map((row) => [row.questionId, row.choiceId])) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session || session.user.mustChangePassword) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const attempt = await owned(id, session.user.id);
  if (!attempt || attempt.status !== "in_progress") return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (!attempt.questionOrder.includes(body.questionId) || !attempt.choiceOrder[body.questionId]?.includes(body.choiceId)) return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  await db.insert(answers).values({ attemptId: id, questionId: body.questionId, choiceId: body.choiceId }).onConflictDoUpdate({ target: [answers.attemptId, answers.questionId], set: { choiceId: body.choiceId, updatedAt: new Date() } });
  return NextResponse.json({ saved: true });
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); if (!session || session.user.mustChangePassword) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const attempt = await owned(id, session.user.id);
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status === "submitted") return NextResponse.json({ id });
  const correct = await db.select({ id: choices.id }).from(choices).innerJoin(questions, eq(choices.questionId, questions.id)).where(and(eq(questions.examId, attempt.examId), eq(choices.isCorrect, true)));
  const selected = await db.select({ id: answers.choiceId }).from(answers).where(eq(answers.attemptId, id));
  const result = scoreAnswers(correct.map((row) => row.id), selected.map((row) => row.id));
  await db.update(attempts).set({ status: "submitted", ...result, submittedAt: new Date() }).where(and(eq(attempts.id, id), eq(attempts.status, "in_progress")));
  return NextResponse.json({ id, ...result });
}
