import assert from "node:assert/strict";
import test from "node:test";
import { parseExamCsv } from "./exam-csv";

const header = "question,option_a,option_b,option_c,option_d,correct_answer,explanation";

test("accepts quoted valid rows", () => {
  const result = parseExamCsv(`${header}\n"2, plus 2?",3,4,5,6,b,Because 2 + 2 = 4`);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[0].correct_answer, "B");
});

test("reports row validation and duplicates", () => {
  const row = "Question,A,B,C,D,E,Why";
  const result = parseExamCsv(`${header}\n${row}\n${row}`);
  assert(result.errors.some((error) => error.includes("must be A")));
  assert(result.errors.some((error) => error.includes("duplicate")));
});

test("rejects wrong headers, blanks, and more than 100 rows", () => {
  assert(parseExamCsv("question,option_a\nQ,A").errors.some((error) => error.includes("Header")));
  assert(parseExamCsv(`${header}\nQ,A,B,C,,A,Why`).errors.some((error) => error.includes("option_d")));
  const rows = Array.from({ length: 101 }, (_, index) => `Q${index},A,B,C,D,A,Why`).join("\n");
  assert(parseExamCsv(`${header}\n${rows}`).errors.some((error) => error.includes("100-question")));
});
