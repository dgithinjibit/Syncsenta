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
import { useToast } from "@/hooks/use-toast";
import { getSubjectsForGrade } from "@/data/curriculum";
import { getTermAllocation } from "@/data/curriculum/term-mappings";
import ExamRunner from "./ExamRunner";
import type { ExamQuestion } from "./QuestionCard";

// CBC Grades
const CBC_GRADES = ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];

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
  const { toast } = useToast();

  const availableSubjects = grade ? getSubjectsForGrade(grade as any).map(s => s.name) : [];

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
      toast({
        title: "Pupil Name Required",
        description: "Enter the pupil's name first",
        variant: "destructive",
      });
      return;
    }
    if (!grade || !subject || !term) {
      toast({
        title: "Selection Required",
        description: "Pick grade, subject and term",
        variant: "destructive",
      });
      return;
    }

    let allocation = getTermAllocation(grade as any, subject, term);
    if (!allocation || allocation.length === 0) {
      toast({
        title: "No Curriculum Data",
        description: "No curriculum allocation available for this selection.",
        variant: "destructive",
      });
      return;
    }

    // For "practice weak areas": narrow allocation to only the weak strands
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
      const response = await fetch("/api/v1/exams/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grade,
          subject,
          term,
          allocation,
          counts: opts?.weakStrandsFilter?.length
            ? { mcq: 8, short: 4, long: 1 }
            : { mcq: 15, short: 8, long: 2 },
          forceRefresh: !!opts?.weakStrandsFilter?.length,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate exam");
      }

      const data = await response.json();
      const qs = (data?.questions ?? []) as ExamQuestion[];
      
      if (!qs.length) {
        toast({
          title: "No Questions",
          description: "No questions returned. Try again.",
          variant: "destructive",
        });
        return;
      }

      setQuestions(qs);
      setExamId(data?.examId ?? null);
      setCached(!!data?.cached);
      
      toast({
        title: "Exam Generated",
        description: opts?.weakStrandsFilter?.length
          ? `Practice set ready (${qs.length} questions)`
          : data?.cached
            ? `Loaded saved exam (${qs.length} questions)`
            : `Generated ${qs.length} questions`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Generation Failed",
        description: e instanceof Error ? e.message : "Failed to generate exam",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    // Keep the same questions, just reset answers in ExamRunner
  };

  const handlePracticeWeak = (weakStrands: string[]) => {
    if (!weakStrands.length) {
      toast({
        title: "No Weak Areas",
        description: "No weak strands detected — well done!",
      });
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
                  {CBC_GRADES.map((g) => (
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
