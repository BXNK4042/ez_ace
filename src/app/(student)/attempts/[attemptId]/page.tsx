import { ExamRunner } from "@/components/exam-runner";
import { requireUser } from "@/lib/session";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  await requireUser(); const { attemptId } = await params;
  return <main className="shell"><ExamRunner attemptId={attemptId} /></main>;
}
