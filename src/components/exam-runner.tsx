"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ExamData = { id: string; title: string; questions: { id: string; text: string; choices: { id: string; text: string }[] }[]; answers: Record<string, string> };

export function ExamRunner({ attemptId }: { attemptId: string }) {
  const router = useRouter(); const [data, setData] = useState<ExamData>(); const [index, setIndex] = useState(0); const [saving, setSaving] = useState(""); const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/attempts/${attemptId}`).then(async (response) => { if (!response.ok) throw new Error("Could not load attempt"); return response.json(); }).then(setData).catch((reason) => setError(reason.message)); }, [attemptId]);
  async function answer(questionId: string, choiceId: string) {
    if (!data) return; setData({ ...data, answers: { ...data.answers, [questionId]: choiceId } }); setSaving("Saving…");
    const response = await fetch(`/api/attempts/${attemptId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, choiceId }) });
    setSaving(response.ok ? "Saved" : "Save failed");
  }
  async function submit() {
    if (!data) return; const unanswered = data.questions.length - Object.keys(data.answers).length;
    if (unanswered && !confirm(`${unanswered} unanswered question${unanswered === 1 ? "" : "s"} will count as wrong. Submit?`)) return;
    const response = await fetch(`/api/attempts/${attemptId}`, { method: "POST" });
    if (!response.ok) { setError("Submission failed"); return; }
    router.push(`/results/${attemptId}`); router.refresh();
  }
  if (error) return <p className="danger">{error}</p>; if (!data) return <p>Loading attempt…</p>;
  const question = data.questions[index];
  return <div className="stack"><div className="row between"><div><h1>{data.title}</h1><p className="muted">Question {index + 1} of {data.questions.length}</p></div><span className="muted" aria-live="polite">{saving}</span></div>
    <nav className="question-nav" aria-label="Questions">{data.questions.map((item, itemIndex) => <button key={item.id} className={`${data.answers[item.id] ? "answered" : ""} ${itemIndex === index ? "current" : ""}`} onClick={() => setIndex(itemIndex)} aria-label={`Question ${itemIndex + 1}${data.answers[item.id] ? ", answered" : ""}`}>{itemIndex + 1}</button>)}</nav>
    <section className="card stack"><h2>{question.text}</h2>{question.choices.map((choice) => <label className="choice" key={choice.id}><input type="radio" name={question.id} checked={data.answers[question.id] === choice.id} onChange={() => answer(question.id, choice.id)} /> <span>{choice.text}</span></label>)}</section>
    <div className="row between"><button className="button secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>{index < data.questions.length - 1 ? <button className="button" onClick={() => setIndex(index + 1)}>Next</button> : <button className="button" onClick={submit}>Submit exam</button>}</div>
  </div>;
}
