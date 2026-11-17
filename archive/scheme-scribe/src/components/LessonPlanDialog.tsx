import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Download, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { SchemeRow } from "@/data/curriculum";
import { kiswahiliSubjects } from "@/data/curriculum";

interface LessonPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: SchemeRow;
  grade: string;
  subject: string;
  term?: string;
}

interface LessonPlan {
  title: string;
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  duration: string;
  objectives: string[];
  keyInquiryQuestion: string;
  introduction: { duration: string; activities: string[] };
  development: { duration: string; activities: string[] };
  conclusion: { duration: string; activities: string[] };
  assessment: string[];
  differentiation: { advanced: string; struggling: string };
  resources: string[];
  teacherReflection: string;
}

const LessonPlanDialog = ({ open, onOpenChange, row, grade, subject, term }: LessonPlanDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [step, setStep] = useState<"input" | "preview">("input");
  const isSw = kiswahiliSubjects.includes(subject);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Use centralized AI agents backend instead of Supabase Edge Functions
      const { apiClient } = await import("@/lib/api-client");
      
      const { plan: generatedPlan } = await apiClient.generateLessonPlan({
        teacher_id: user?.id || "anonymous",
        week: row.week,
        lesson: row.lesson,
        row: {
          week: row.week,
          lesson: row.lesson,
          strand: row.strand,
          subStrand: row.subStrand,
          specificLearningOutcome: row.specificLearningOutcome,
          learningExperiences: row.learningExperiences,
          keyInquiryQuestion: row.keyInquiryQuestion,
          learningResources: row.learningResources,
          assessmentMethods: row.assessmentMethods || "",
          reflection: row.reflection || "",
        },
        grade,
        subject,
        term,
        additional_notes: additionalNotes,
        language: isSw ? "kiswahili" : "english",
      });

      setPlan(generatedPlan);
      setStep("preview");

      // Save to database if authenticated
      if (user) {
        await supabase.from("generated_resources" as any).insert({
          user_id: user.id,
          resource_type: "lesson_plan",
          grade,
          subject,
          strand: row.strand,
          sub_strand: row.subStrand,
          term,
          content: generatedPlan,
          input_params: { row, additionalNotes },
        } as any);
      }

      toast({ title: "Lesson Plan Generated!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate lesson plan.";
      toast({ title: "Generation Failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!plan) return;
    const printArea = document.getElementById("lesson-plan-print");
    if (!printArea) return;

    printArea.innerHTML = `
      <div style="font-family: serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align:center; font-size:18pt; margin-bottom:4px;">${plan.title}</h1>
        <p style="text-align:center; color:#666; font-size:10pt; margin-bottom:16px;">${grade} — ${subject} — ${plan.duration}</p>
        
        <table style="width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:16px;">
          <tr><td style="border:1px solid #ccc; padding:6px; font-weight:bold; width:30%;">Strand</td><td style="border:1px solid #ccc; padding:6px;">${plan.strand}</td></tr>
          <tr><td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Sub-Strand</td><td style="border:1px solid #ccc; padding:6px;">${plan.subStrand}</td></tr>
          <tr><td style="border:1px solid #ccc; padding:6px; font-weight:bold;">Key Inquiry Question</td><td style="border:1px solid #ccc; padding:6px;">${plan.keyInquiryQuestion}</td></tr>
        </table>

        <h3 style="font-size:12pt; margin:12px 0 6px;">Learning Objectives</h3>
        <ul style="margin:0; padding-left:20px; font-size:10pt;">${plan.objectives.map(o => `<li>${o}</li>`).join("")}</ul>

        <h3 style="font-size:12pt; margin:12px 0 6px;">Introduction (${plan.introduction.duration})</h3>
        <ul style="margin:0; padding-left:20px; font-size:10pt;">${plan.introduction.activities.map(a => `<li>${a}</li>`).join("")}</ul>

        <h3 style="font-size:12pt; margin:12px 0 6px;">Lesson Development (${plan.development.duration})</h3>
        <ul style="margin:0; padding-left:20px; font-size:10pt;">${plan.development.activities.map(a => `<li>${a}</li>`).join("")}</ul>

        <h3 style="font-size:12pt; margin:12px 0 6px;">Conclusion (${plan.conclusion.duration})</h3>
        <ul style="margin:0; padding-left:20px; font-size:10pt;">${plan.conclusion.activities.map(a => `<li>${a}</li>`).join("")}</ul>

        <h3 style="font-size:12pt; margin:12px 0 6px;">Assessment</h3>
        <ul style="margin:0; padding-left:20px; font-size:10pt;">${plan.assessment.map(a => `<li>${a}</li>`).join("")}</ul>

        <h3 style="font-size:12pt; margin:12px 0 6px;">Differentiation</h3>
        <p style="font-size:10pt;"><strong>Advanced learners:</strong> ${plan.differentiation.advanced}</p>
        <p style="font-size:10pt;"><strong>Struggling learners:</strong> ${plan.differentiation.struggling}</p>

        <h3 style="font-size:12pt; margin:12px 0 6px;">Resources</h3>
        <ul style="margin:0; padding-left:20px; font-size:10pt;">${plan.resources.map(r => `<li>${r}</li>`).join("")}</ul>

        <h3 style="font-size:12pt; margin:12px 0 6px;">Teacher's Reflection</h3>
        <p style="font-size:10pt; border:1px dashed #ccc; padding:12px; min-height:60px;">${plan.teacherReflection}</p>
      </div>
    `;
    window.print();
  };

  const resetDialog = () => {
    setPlan(null);
    setStep("input");
    setAdditionalNotes("");
  };

  return (
    <>
      <div id="lesson-plan-print" className="hidden print:block" />
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetDialog(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {step === "input" ? (isSw ? "Tengeneza Mpango wa Somo" : "Generate Lesson Plan") : (isSw ? "Mpango wa Somo" : "Lesson Plan")}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-2">
            {step === "input" && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p><span className="font-medium">Grade:</span> {grade}</p>
                  <p><span className="font-medium">Subject:</span> {subject}</p>
                  <p><span className="font-medium">Strand:</span> {row.strand}</p>
                  <p><span className="font-medium">Sub-Strand:</span> {row.subStrand}</p>
                  <p><span className="font-medium">Lesson {row.lesson}:</span> Week {row.week}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {isSw ? "Maelezo ya ziada (si lazima)" : "Additional notes for this lesson (optional)"}
                  </label>
                  <Textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder={isSw
                      ? "k.m., mahitaji maalum, muda wa somo, muktadha wa darasa..."
                      : "e.g., specific needs, lesson duration, class context, available materials..."}
                    rows={3}
                  />
                </div>

                <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {loading ? (isSw ? "Inatengeneza..." : "Generating...") : (isSw ? "Tengeneza Mpango wa Somo" : "Generate Lesson Plan")}
                </Button>
              </div>
            )}

            {step === "preview" && plan && (
              <div className="space-y-4 py-2">
                <div className="text-center space-y-1">
                  <h3 className="font-serif text-lg font-bold">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground">{grade} — {subject} — {plan.duration}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Strand</p>
                    <p className="text-sm">{plan.strand}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Sub-Strand</p>
                    <p className="text-sm">{plan.subStrand}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Key Inquiry Question</p>
                    <p className="text-sm">{plan.keyInquiryQuestion}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-sm font-semibold">Learning Objectives</h4>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {plan.objectives.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>

                {[
                  { label: "Introduction", data: plan.introduction, color: "bg-primary/5" },
                  { label: "Lesson Development", data: plan.development, color: "bg-secondary/50" },
                  { label: "Conclusion", data: plan.conclusion, color: "bg-muted/50" },
                ].map(({ label, data, color }) => (
                  <div key={label} className={`rounded-lg border p-3 space-y-2 ${color}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">{label}</h4>
                      <span className="text-xs text-muted-foreground">{data.duration}</span>
                    </div>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {data.activities.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                ))}

                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-sm font-semibold">Assessment</h4>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {plan.assessment.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-sm font-semibold">Differentiation</h4>
                  <p className="text-sm"><span className="font-medium">Advanced learners:</span> {plan.differentiation.advanced}</p>
                  <p className="text-sm"><span className="font-medium">Struggling learners:</span> {plan.differentiation.struggling}</p>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-sm font-semibold">Resources</h4>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {plan.resources.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>

                <div className="rounded-lg border border-dashed p-3 space-y-2">
                  <h4 className="text-sm font-semibold">Teacher's Reflection</h4>
                  <p className="text-sm text-muted-foreground italic">{plan.teacherReflection}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setPlan(null); setStep("input"); }} className="gap-2">
                    <Sparkles className="w-4 h-4" /> Regenerate
                  </Button>
                  <Button onClick={handlePrint} className="gap-2 ml-auto">
                    <Download className="w-4 h-4" /> Export PDF
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LessonPlanDialog;
