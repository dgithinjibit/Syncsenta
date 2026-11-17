import type { ExamQuestion } from "../ExamRunner";

interface Props {
  questions: ExamQuestion[];
  grade: string;
  subject: string;
  term: string;
}

/**
 * Photocopy-ready exam paper. Hidden on screen; only visible in print.
 * Render this once alongside the screen UI; the @media print rules in
 * index.css unhide it and hide everything else.
 */
const ExamPaperPrint = ({ questions, grade, subject, term }: Props) => {
  let lastSection: ExamQuestion["type"] | null = null;
  const sectionTitle = (t: ExamQuestion["type"]) =>
    t === "mcq"
      ? "SECTION A — Multiple Choice (1 mark each)"
      : t === "short"
        ? "SECTION B — Short Answer (2 marks each)"
        : "SECTION C — Long Answer (5 marks each)";

  // Best-effort detect of expected number of items in short answers
  const detectExpectedCount = (q: string): number => {
    const wm: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
      moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5, sita: 6,
    };
    const re = new RegExp(
      `\\b(?:name|list|give|state|mention|identify|write|provide|taja|andika|orodhesha|toa)\\b[^.?!]*?\\b(\\d+|${Object.keys(wm).join("|")})\\b`,
      "i",
    );
    const m = q.match(re);
    if (!m) return 1;
    const t = m[1].toLowerCase();
    const n = /^\d+$/.test(t) ? parseInt(t, 10) : wm[t];
    return n >= 2 && n <= 6 ? n : 1;
  };

  const total = questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="exam-paper-print hidden print:block" aria-hidden>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          {grade} • {subject} • {term}
        </h1>
        <p style={{ fontSize: 11, marginTop: 4 }}>
          Name: ____________________________ &nbsp;&nbsp; Date: ______________
          &nbsp;&nbsp; Total marks: {total}
        </p>
        <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #444" }} />
      </div>

      {questions.map((q, i) => {
        const newSection = q.type !== lastSection;
        lastSection = q.type;
        const slots =
          q.type === "short" ? detectExpectedCount(q.question) : 1;
        return (
          <div key={i} style={{ marginBottom: 14, breakInside: "avoid" }}>
            {newSection && (
              <h2
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  margin: "14px 0 8px",
                  borderBottom: "1px solid #444",
                  paddingBottom: 3,
                }}
              >
                {sectionTitle(q.type)}
              </h2>
            )}
            <p
              style={{
                fontSize: 11,
                margin: "0 0 6px",
                fontWeight: 500,
              }}
            >
              {i + 1}. {q.question}{" "}
              <span style={{ color: "#555" }}>({q.marks} mk{q.marks === 1 ? "" : "s"})</span>
            </p>

            {q.type === "mcq" && q.options && (
              <div style={{ paddingLeft: 18, fontSize: 11 }}>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ marginBottom: 3 }}>
                    {String.fromCharCode(65 + oi)}. {opt}
                  </div>
                ))}
              </div>
            )}

            {q.type === "short" &&
              (slots > 1 ? (
                <div style={{ paddingLeft: 18 }}>
                  {Array.from({ length: slots }).map((_, s) => (
                    <div key={s} style={{ display: "flex", alignItems: "baseline" }}>
                      <span style={{ width: 18, fontSize: 11 }}>{s + 1}.</span>
                      <span className="answer-line" style={{ flex: 1 }} />
                    </div>
                  ))}
                </div>
              ) : (
                <span className="answer-line" />
              ))}

            {q.type === "long" && <div className="answer-box" />}
          </div>
        );
      })}
    </div>
  );
};

export default ExamPaperPrint;
