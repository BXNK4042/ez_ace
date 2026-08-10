import assert from "node:assert/strict";
import test from "node:test";
import { scoreAnswers } from "./scoring";

test("scores known fixture and counts unanswered wrong", () => {
  assert.deepEqual(scoreAnswers(["q1-a", "q2-b", "q3-c"], ["q1-a", "q2-a"]), { score: 1, percentage: 33 });
});
