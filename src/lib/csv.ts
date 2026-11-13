// Parser CSV sederhana untuk kebutuhan impor LaundryOS.
// Mendukung: BOM, pemisah koma atau titik koma (umum pada Excel Indonesia),
// kolom berkutip dengan koma/baris baru di dalamnya, dan escape "" untuk kutip.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  function endCell() {
    row.push(cell);
    cell = "";
  }
  function endRow() {
    endCell();
    rows.push(row);
    row = [];
  }

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      endCell();
    } else if (char === "\n") {
      endRow();
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

export function parseCsv(text: string): ParsedCsv {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const rawRows = splitCsv(text, delimiter).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rawRows.length === 0) return { headers: [], rows: [] };
  const headers = rawRows[0].map((header) => header.trim().toLowerCase());
  const rows = rawRows.slice(1).map((row) => row.map((cell) => cell.trim()));
  return { headers, rows };
}

/**
 * Satu sel CSV untuk ekspor. Teks yang diawali = + - @ (setelah spasi/tab)
 * diberi awalan ' agar tidak dijalankan sebagai formula di Excel/Sheets.
 * Angka dibiarkan apa adanya supaya nilai negatif tetap numerik.
 */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = typeof value !== "number" && /^[\t\r\n ]*[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
