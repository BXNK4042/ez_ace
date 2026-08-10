import { parse } from "csv-parse/sync";

export const EXAM_HEADERS = ["question", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation"] as const;
export type ExamRow = Record<(typeof EXAM_HEADERS)[number], string>;
export type CsvResult = { rows: ExamRow[]; errors: string[] };

export function parseExamCsv(source: string): CsvResult {
  const errors: string[] = [];
  let records: Record<string, string>[];
  try {
    records = parse(source, { columns: true, bom: true, skip_empty_lines: true, trim: true, relax_column_count: false });
  } catch (error) {
    return { rows: [], errors: [`CSV syntax: ${error instanceof Error ? error.message : "invalid CSV"}`] };
  }
  let rawHeaders: string[] = [];
  try { rawHeaders = parse(source, { to_line: 1, bom: true, relax_column_count: true })[0] ?? []; } catch {}
  if (rawHeaders.join(",") !== EXAM_HEADERS.join(",")) errors.push(`Header must be exactly: ${EXAM_HEADERS.join(",")}`);
  if (!records.length) errors.push("CSV has no question rows");
  if (records.length > 100) errors.push("CSV exceeds 100-question limit");
  const seen = new Set<string>();
  const rows = records.slice(0, 100).map((record, index) => {
    const row = Object.fromEntries(EXAM_HEADERS.map((header) => [header, String(record[header] ?? "").trim()])) as ExamRow;
    const line = index + 2;
    for (const header of EXAM_HEADERS) if (!row[header]) errors.push(`Row ${line}: ${header} is required`);
    row.correct_answer = row.correct_answer.toUpperCase();
    if (!/^[ABCD]$/.test(row.correct_answer)) errors.push(`Row ${line}: correct_answer must be A, B, C, or D`);
    const key = EXAM_HEADERS.map((header) => row[header].toLowerCase()).join("\u0000");
    if (seen.has(key)) errors.push(`Row ${line}: duplicate row`); else seen.add(key);
    return row;
  });
  return { rows, errors };
}
