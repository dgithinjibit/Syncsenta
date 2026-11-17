import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileQuestion, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSubjectsForGrade, grades } from "@/data/curriculum";
import { getTermAllocation } from "@/data/curriculum/term-mappings";
import ExamRunner, { type ExamQuestion } from "./ExamRunner";

const ExamGeneratorDialog = () => {
  const [open, setOpen] = useState(false);
  const [pupilName, setPupilName] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [term, setTerm] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const availableSubjects = grade ? getSubjectsForGrade(grade) : [];

  const reset = () => {
    setPupilName("");
    setGrade("");
    setSubject("");
    setTerm("");
    setQuestions(null);
    setExamId(null);
    setCached(false);
  };

  const handleGenerate = async (opts?: { weakStrandsFilter?: string[] }) => {
    if (!pupilName.trim()) {
      toast.error("Enter the pupil's name first");
      return;
    }
    if (!grade || !subject || !term) {
      toast.error("Pick grade, subject and term");
      return;
    }
    let allocation = getTermAllocation(grade, subject, term);
    if (!allocation || allocation.length === 0) {
      toast.error("No curriculum allocation available for this selection.");
      return;
    }

    // For "practice weak areas": narrow allocation to only the weak strands.
    if (opts?.weakStrandsFilter?.length) {
      const weak = new Set(opts.weakStrandsFilter.map((s) => s.toLowerCase()));
      const filtered = allocation.filter((a) =>
        weak.has((a.strandName || "").toLowerCase()),
      );
      if (filtered.length > 0) allocation = filtered;
    }

    setLoading(true);
    setQuestions(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-exam", {
        body: {
          grade,
          subject,
          term,
          allocation,
          counts: opts?.weakStrandsFilter?.length
            ? { mcq: 8, short: 4, long: 1 }
            : { mcq: 15, short: 8, long: 2 },
          // Skip cache when targeting weak strands so pupil gets fresh practice
          forceRefresh: !!opts?.weakStrandsFilter?.length,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const qs = (data?.questions ?? []) as ExamQuestion[];
      if (!qs.length) {
        toast.error("No questions returned. Try again.");
        return;
      }
      setQuestions(qs);
      setExamId(data?.examId ?? null);
      setCached(!!data?.cached);
      toast.success(
        opts?.weakStrandsFilter?.length
          ? `Practice set ready (${qs.length} questions)`
          : data?.cached
            ? `Loaded saved exam (${qs.length} questions)`
            : `Generated ${qs.length} questions`,
      );
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to generate exam");
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    // Keep the same questions, just reset answers in ExamRunner (it already does).
    // Nothing to do at this layer.
  };

  const handlePracticeWeak = (weakStrands: string[]) => {
    if (!weakStrands.length) {
      toast.info("No weak strands detected — well done!");
      return;
    }
    handleGenerate({ weakStrandsFilter: weakStrands });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="gap-2">
          <FileQuestion className="w-4 h-4" /> Generate Term Exam
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {questions
              ? `${pupilName} — ${grade} ${subject} ${term}`
              : "Start Term Exam"}
          </DialogTitle>
        </DialogHeader>

        {!questions ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Each pupil enters their name, picks the exam, and gets a
              personalised score saved to your dashboard.
            </p>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Pupil name
              </Label>
              <Input
                value={pupilName}
                onChange={(e) => setPupilName(e.target.value)}
                placeholder="e.g. Mary Wanjiku"
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label>Grade</Label>
              <Select
                value={grade}
                onValueChange={(g) => {
                  setGrade(g);
                  setSubject("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject} disabled={!grade}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={grade ? "Pick subject" : "Pick grade first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => handleGenerate()}
              disabled={
                loading || !pupilName.trim() || !grade || !subject || !term
              }
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading exam...
                </>
              ) : (
                "Start Exam"
              )}
            </Button>
          </div>
        ) : (
          <div className="py-2">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Total marks: {questions.reduce((s, q) => s + q.marks, 0)} •{" "}
                {questions.length} questions
                {cached && " • shared exam"}
              </p>
              <Button variant="ghost" size="sm" onClick={reset}>
                New exam
              </Button>
            </div>
            <ExamRunner
              questions={questions}
              grade={grade}
              subject={subject}
              term={term}
              pupilName={pupilName}
              examId={examId}
              onRetake={handleRetake}
              onPracticeWeak={handlePracticeWeak}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExamGeneratorDialog;
