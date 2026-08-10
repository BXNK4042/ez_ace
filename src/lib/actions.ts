"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { choices, classes, exams, questions } from "@/db/schema";
import { parseExamCsv } from "./exam-csv";
import { requireAdmin } from "./session";

const clean = (value: FormDataEntryValue | null, max = 120) => String(value ?? "").trim().slice(0, max);

export async function createClass(form: FormData) {
  await requireAdmin();
  const name = clean(form.get("name"));
  if (name.length < 2) throw new Error("Class name must have at least 2 characters");
  await db.insert(classes).values({ name });
  revalidatePath("/admin");
}

export async function renameClass(form: FormData) {
  await requireAdmin();
  const id = clean(form.get("id"), 40), name = clean(form.get("name"));
  if (name.length < 2) throw new Error("Class name must have at least 2 characters");
  await db.update(classes).set({ name, updatedAt: new Date() }).where(eq(classes.id, id));
  revalidatePath("/admin"); revalidatePath(`/classes/${id}`);
}

export async function toggleClassArchive(form: FormData) {
  await requireAdmin();
  const id = clean(form.get("id"), 40);
  const [row] = await db.select({ archivedAt: classes.archivedAt }).from(classes).where(eq(classes.id, id)).limit(1);
  if (!row) throw new Error("Class not found");
  await db.update(classes).set({ archivedAt: row.archivedAt ? null : new Date(), updatedAt: new Date() }).where(eq(classes.id, id));
  revalidatePath("/admin"); revalidatePath("/dashboard");
}

export async function importExam(form: FormData) {
  await requireAdmin();
  const classId = clean(form.get("classId"), 40), title = clean(form.get("title"));
  const file = form.get("file");
  if (title.length < 2) throw new Error("Exam title must have at least 2 characters");
  if (!(file instanceof File) || !file.size || file.size > 1024 * 1024) throw new Error("Choose a CSV under 1 MB");
  const source = await file.text();
  const parsed = parseExamCsv(source);
  if (parsed.errors.length) {
    const shown = parsed.errors.slice(0, 20);
    if (parsed.errors.length > shown.length) shown.push(`${parsed.errors.length - shown.length} more errors`);
    redirect(`/admin?csvErrors=${encodeURIComponent(shown.join("|"))}`);
  }
  const [activeClass] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), isNull(classes.archivedAt))).limit(1);
  if (!activeClass) throw new Error("Active class not found");
  const examId = crypto.randomUUID();
  const questionRows = parsed.rows.map((row, ordinal) => ({ id: crypto.randomUUID(), examId, ordinal, text: row.question, explanation: row.explanation }));
  const choiceRows = questionRows.flatMap((question, index) => (["A", "B", "C", "D"] as const).map((key) => ({
    questionId: question.id, key, text: parsed.rows[index][`option_${key.toLowerCase()}` as keyof typeof parsed.rows[number]], isCorrect: parsed.rows[index].correct_answer === key,
  })));
  await db.batch([
    db.insert(exams).values({ id: examId, classId, title, sourceCsv: source }),
    db.insert(questions).values(questionRows),
    db.insert(choices).values(choiceRows),
  ]);
  revalidatePath("/admin"); revalidatePath(`/classes/${classId}`);
  redirect(`/admin/exams/${examId}`);
}

export async function setExamStatus(form: FormData) {
  await requireAdmin();
  const id = clean(form.get("id"), 40), status = clean(form.get("status")) as "draft" | "published" | "archived";
  if (!(["draft", "published", "archived"] as const).includes(status)) throw new Error("Invalid status");
  const [exam] = await db.select({ status: exams.status, classId: exams.classId }).from(exams).where(eq(exams.id, id)).limit(1);
  if (!exam) throw new Error("Exam not found");
  if (exam.status === "archived") throw new Error("Archived exams cannot change");
  await db.update(exams).set({ status, publishedAt: status === "published" ? new Date() : null, archivedAt: status === "archived" ? new Date() : null, updatedAt: new Date() }).where(eq(exams.id, id));
  revalidatePath("/admin"); revalidatePath(`/classes/${exam.classId}`);
}
