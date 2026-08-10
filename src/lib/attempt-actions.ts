"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { attempts, choices, classes, exams, questions } from "@/db/schema";
import { requireUser } from "./session";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = crypto.getRandomValues(new Uint32Array(1))[0] % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export async function startAttempt(form: FormData) {
  const session = await requireUser();
  const examId = String(form.get("examId") ?? "");
  const [exam] = await db.select({ id: exams.id }).from(exams).innerJoin(classes, eq(exams.classId, classes.id)).where(and(eq(exams.id, examId), eq(exams.status, "published"), isNull(classes.archivedAt))).limit(1);
  if (!exam) throw new Error("Published exam not found");
  const [existing] = await db.select({ id: attempts.id }).from(attempts).where(and(eq(attempts.userId, session.user.id), eq(attempts.examId, examId), eq(attempts.status, "in_progress"))).limit(1);
  if (existing) redirect(`/attempts/${existing.id}`);
  const questionRows = await db.select({ id: questions.id }).from(questions).where(eq(questions.examId, examId));
  if (!questionRows.length) throw new Error("Exam has no questions");
  const choiceRows = await db.select({ id: choices.id, questionId: choices.questionId }).from(choices).innerJoin(questions, eq(choices.questionId, questions.id)).where(eq(questions.examId, examId));
  const questionOrder = shuffle(questionRows.map((row) => row.id));
  const choiceOrder = Object.fromEntries(questionOrder.map((questionId) => [questionId, shuffle(choiceRows.filter((row) => row.questionId === questionId).map((row) => row.id))]));
  const [totals] = await db.select({ value: count() }).from(attempts).where(and(eq(attempts.userId, session.user.id), eq(attempts.examId, examId)));
  const [created] = await db.insert(attempts).values({ userId: session.user.id, examId, attemptNumber: totals.value + 1, questionOrder, choiceOrder }).onConflictDoNothing().returning({ id: attempts.id });
  if (!created) {
    const [raced] = await db.select({ id: attempts.id }).from(attempts).where(and(eq(attempts.userId, session.user.id), eq(attempts.examId, examId), eq(attempts.status, "in_progress"))).limit(1);
    if (raced) redirect(`/attempts/${raced.id}`);
    throw new Error("Could not start attempt");
  }
  redirect(`/attempts/${created.id}`);
}
