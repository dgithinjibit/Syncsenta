import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export interface ExamQuestion {
  type: "mcq" | "short" | "long";
  strand: string;
  subStrand: string;
  question: string;
  options?: string[];
  answerIndex?: number;
  expectedAnswer?: string;
  acceptableKeywords?: string[];
  rubric?: string;
  marks: number;
}

interface MarkResult {
  awarded: number;
  max: number;
  correct: boolean;
  feedback?: string;
}

interface Props {
  index: number;
  question: ExamQuestion;
  answer: string;
  result?: MarkResult;
  expectedSlots: number;
  onChange: (value: string) => void;
  onChangeSlot: (slot: number, value: string, total: number) => void;
  flagged?: boolean;
}

const QuestionCard = forwardRef<HTMLDivElement, Props>(function QuestionCard(
  {
    index,
    question,
    answer,
    result,
    expectedSlots,
    onChange,
    onChangeSlot,
    flagged,
  },
  ref,
) {
  const disabled = !!result;
  const partial =
    result && !result.correct && result.awarded > 0 && result.awarded < result.max;

  const tone = result
    ? result.correct
      ? "text-green-600"
      : partial
        ? "text-yellow-600"
        : "text-red-600"
    : "";

  const borderTone = result
    ? result.correct
      ? "border-green-500/40"
      : partial
        ? "border-yellow-500/40"
        : "border-red-500/40"
    : flagged
      ? "border-yellow-500 ring-1 ring-yellow-500/40"
      : "";

  const slotValues = (answer ?? "").split("\n");
  const getSlot = (i: number) => slotValues[i] ?? "";

  return (
    <Card
      ref={ref}
      data-question-index={index}
      className={`p-5 space-y-3 transition-all ${borderTone}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium">
            <span className="text-muted-foreground mr-2">{index + 1}.</span>
            {question.question}
          </p>
          <Badge variant="outline" className="mt-2 text-xs">
            {question.subStrand}
          </Badge>
        </div>
        {result ? (
          <div className={`flex items-center gap-1.5 text-sm font-semibold ${tone}`}>
            {result.correct ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : partial ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            {result.awarded}/{result.max}
          </div>
        ) : flagged ? (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-600 gap-1 text-xs"
          >
            <AlertCircle className="w-3 h-3" /> Unanswered
          </Badge>
        ) : null}
      </div>

      {question.type === "mcq" && question.options && (
        <RadioGroup
          value={answer ?? ""}
          onValueChange={onChange}
          disabled={disabled}
        >
          {question.options.map((opt, oi) => {
            const isCorrect = result && oi === question.answerIndex;
            const isPicked = parseInt(answer ?? "-1") === oi;
            return (
              <div
                key={oi}
                className={`flex items-center space-x-2 p-2 rounded transition-colors ${
                  isCorrect
                    ? "bg-green-50 dark:bg-green-950"
                    : isPicked && result && !isCorrect
                      ? "bg-red-50 dark:bg-red-950"
                      : ""
                }`}
              >
                <RadioGroupItem value={String(oi)} id={`q${index}-o${oi}`} />
                <Label htmlFor={`q${index}-o${oi}`} className="cursor-pointer flex-1">
                  <span className="text-muted-foreground mr-2">
                    {String.fromCharCode(65 + oi)}.
                  </span>
                  {opt}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      )}

      {question.type === "short" &&
        (expectedSlots <= 1 ? (
          <Input
            value={answer ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer..."
            disabled={disabled}
          />
        ) : (
          <div className="space-y-2">
            {Array.from({ length: expectedSlots }).map((_, slot) => (
              <div key={slot} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-6 shrink-0">
                  {slot + 1}.
                </span>
                <Input
                  value={getSlot(slot)}
                  onChange={(e) => onChangeSlot(slot, e.target.value, expectedSlots)}
                  placeholder={`Answer ${slot + 1}...`}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        ))}

      {question.type === "long" && (
        <Textarea
          value={answer ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your answer here..."
          rows={5}
          disabled={disabled}
        />
      )}

      {result && (
        <div className="text-xs pt-2 border-t space-y-1.5">
          {question.type === "mcq" &&
            question.options &&
            question.answerIndex !== undefined && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Correct answer:</strong>{" "}
                {question.options[question.answerIndex]}
              </p>
            )}
          {question.type === "short" && question.expectedAnswer && (
            <p className="text-muted-foreground">
              <strong className="text-foreground">Expected:</strong>{" "}
              {question.expectedAnswer}
            </p>
          )}
          {result.feedback && (
            <p className="bg-muted/50 rounded px-2 py-1.5 border-l-2 border-yellow-500">
              <strong className="text-foreground">Feedback:</strong>{" "}
              {result.feedback}
            </p>
          )}
        </div>
      )}
    </Card>
  );
});

export default QuestionCard;
