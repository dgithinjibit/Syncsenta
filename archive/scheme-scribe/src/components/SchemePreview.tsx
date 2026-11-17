import { SchemeRow, columnHeaders, kiswahiliSubjects } from "@/data/curriculum";

interface SchemePreviewProps {
  rows: SchemeRow[];
  subject: string;
  grade: string;
  strand: string;
}

const SchemePreview = ({ rows, subject, grade, strand }: SchemePreviewProps) => {
  const isSw = kiswahiliSubjects.includes(subject);
  const headers = isSw ? columnHeaders.sw : columnHeaders.en;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="font-serif text-lg font-bold text-foreground">
          {isSw ? "Mpango wa Kazi" : "Scheme of Work"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {grade} — {subject} — {strand}
        </p>
        <p className="text-xs text-muted-foreground">
          {isSw ? "Mtaala wa CBC - KICD Kenya" : "CBC Curriculum — KICD Kenya"}
        </p>
      </div>

      <div className="w-full rounded-lg border border-border">
        <div className="overflow-x-auto overflow-y-hidden pb-2 scheme-table-scroll">
          <table className="min-w-[1400px] w-full text-sm">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="bg-primary text-primary-foreground px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/50"}>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[40px] font-medium">{row.week}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[40px]">{row.lesson}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[120px] font-medium">{row.strand}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[130px]">{row.subStrand}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line min-w-[220px]">{row.specificLearningOutcome}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line min-w-[220px]">{row.learningExperiences}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border whitespace-pre-line min-w-[150px]">{row.keyInquiryQuestion}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[150px]">{row.learningResources}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[120px]">{row.assessmentMethods}</td>
                  <td className="px-3 py-2 text-xs align-top border-b border-border min-w-[60px]">{row.reflection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SchemePreview;
