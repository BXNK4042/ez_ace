export function scoreAnswers(correctChoiceIds: string[], selectedChoiceIds: string[]) {
  const correct = new Set(correctChoiceIds);
  const score = selectedChoiceIds.filter((id) => correct.has(id)).length;
  return { score, percentage: correct.size ? Math.round(score * 100 / correct.size) : 0 };
}
