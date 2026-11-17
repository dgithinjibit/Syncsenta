interface ExportRow {
  id: string;
  pupil_name: string;
  grade: string;
  subject: string;
  term: string;
  awarded: number;
  total: number;
  percent: number;
  created_at: string;
}

const csvEscape = (v: unknown): string => {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const downloadAttemptsCsv = (rows: ExportRow[], filename = "attempts.csv") => {
  const header = [
    "Pupil",
    "Grade",
    "Subject",
    "Term",
    "Score",
    "Total",
    "Percent",
    "Date",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.pupil_name,
        r.grade,
        r.subject,
        r.term,
        r.awarded,
        r.total,
        r.percent,
        new Date(r.created_at).toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Initials (e.g. "Mary Wanjiku" → "M.W.") for anonymised leaderboard */
export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).slice(0, 3);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join(".") + ".";
};
