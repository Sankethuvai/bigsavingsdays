/**
 * CSV serialisation with spreadsheet formula-injection protection.
 *
 * Cells that begin with =, +, -, @, tab or carriage return are prefixed with an
 * apostrophe so Excel/Sheets treat them as text. Ordinary negative numbers are therefore
 * exported as text; exports here are identifiers, dates and counts, never arithmetic.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  }
  return lines.join("\n");
}
