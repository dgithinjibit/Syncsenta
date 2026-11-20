import { ClipboardList, PencilLine, BookOpenCheck } from "lucide-react";
import type { ExamQuestion } from "../ExamRunner";

const META: Record<
  ExamQuestion["type"],
  { label: string; Icon: typeof ClipboardList; varName: string }
> = {
  mcq: {
    label: "Section A — Multiple Choice (1 mark each)",
    Icon: ClipboardList,
    varName: "--section-mcq",
  },
  short: {
    label: "Section B — Short Answer (2 marks each)",
    Icon: PencilLine,
    varName: "--section-short",
  },
  long: {
    label: "Section C — Long Answer (5 marks each)",
    Icon: BookOpenCheck,
    varName: "--section-long",
  },
};

const SectionHeader = ({ type }: { type: ExamQuestion["type"] }) => {
  const m = META[type];
  return (
    <div
      className="section-strip mt-8 mb-4 px-4 py-3 flex items-center gap-2 border"
      style={{ ["--section-color" as never]: `var(${m.varName})` }}
    >
      <m.Icon
        className="w-4 h-4 shrink-0"
        style={{ color: `hsl(var(${m.varName}))` }}
      />
      <h4 className="font-semibold text-sm uppercase tracking-wide">
        {m.label}
      </h4>
    </div>
  );
};

export default SectionHeader;
