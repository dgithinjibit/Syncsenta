import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { grades, getSubjectsForGrade, getHardcodedStrands, getSubStrandsForStrand, getLessonsPerWeek, type SchemeRow, type StrandInfo } from "@/data/curriculum";
import { getTermAllocation, getTermLessonCount, isLowerPrimaryKiswahili } from "@/data/curriculum/term-mappings";
import SchemePreview from "./SchemePreview";
import LessonPlanDialog from "./LessonPlanDialog";
import { FileText, Download, Save, Loader2, Sparkles, FileDown, BookOpen, ThumbsUp, ThumbsDown, MessageSquare, RefreshCw } from "lucide-react";
import { exportSchemeToDocx } from "@/utils/exportDocx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { columnHeaders, kiswahiliSubjects } from "@/data/curriculum";
import { useAuth } from "@/hooks/useAuth";
import type { SubStrandInfo } from "@/data/curriculum/types";

const INDIGENOUS_LANGUAGES = [
  "Kikuyu (Gĩkũyũ)", "Dholuo", "Kalenjin", "Luhya (Luyia)", "Kamba",
  "Kisii (Ekegusii)", "Meru (Kĩmĩĩrũ)", "Mijikenda", "Maasai (Maa)",
  "Turkana", "Somali", "Embu", "Tharaka", "Pokot", "Samburu",
  "Taita", "Taveta", "Borana", "Rendille", "Swahili (Coastal dialects)",
  "Teso", "Sabaot", "Nandi", "Kipsigis", "Tugen", "Elgeyo", "Marakwet",
  "Bukusu", "Maragoli", "Isukha", "Idakho", "Wanga", "Nyala", "Tiriki",
  "Suba", "Kuria", "Tachoni", "Kabras",
];

const LANGUAGE_SUBJECTS = ["English", "English Activities", "Kiswahili", "Indigenous Language"];

// Weekly lesson distribution per strand for language subjects (1 lesson per strand per week)
const LANGUAGE_WEEKLY_DISTRIBUTION: Record<string, Record<string, number>> = {
  "English": {
    "Listening and Speaking": 1,
    "Reading": 1,
    "Language Use": 1,
    "Grammar in Use": 1,
    "Writing": 1,
  },
  "English Activities": {
    "Listening and Speaking": 1,
    "Reading": 1,
    "Language Use": 1,
    "Writing": 1,
  },
  "Kiswahili": {
    "Kusikiliza na Kuzungumza": 1,
    "Kusoma": 1,
    "Kuandika": 1,
    "Sarufi": 1,
  },
  "Indigenous Language": {
    "Listening and Speaking": 1,
    "Reading": 1,
  },
};

function isLanguageSubject(subject: string): boolean {
  return LANGUAGE_SUBJECTS.includes(subject);
}

function getWeeklyDistribution(subject: string, strands: StrandInfo[]): { strandName: string; lessonsThisWeek: number }[] {
  const dist = LANGUAGE_WEEKLY_DISTRIBUTION[subject];
  if (!dist) {
    const lessonsPerWeek = getLessonsPerWeek("Grade 4", subject);
    const perStrand = Math.max(1, Math.floor(lessonsPerWeek / strands.length));
    return strands.map(s => ({ strandName: s.name, lessonsThisWeek: perStrand }));
  }

  return strands.map(s => {
    const matchKey = Object.keys(dist).find(k => s.name.includes(k) || k.includes(s.name));
    return {
      strandName: s.name,
      lessonsThisWeek: matchKey ? dist[matchKey] : 1,
    };
  }).filter(d => d.lessonsThisWeek > 0);
}

const SchemeGeneratorDialog = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [indigenousLanguage, setIndigenousLanguage] = useState("");
  const [strand, setStrand] = useState("");
  const [subStrand, setSubStrand] = useState("");
  const [context, setContext] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedRows, setGeneratedRows] = useState<SchemeRow[] | null>(null);
  const [availableStrands, setAvailableStrands] = useState<string[]>([]);
  const [availableSubStrands, setAvailableSubStrands] = useState<string[]>([]);
  const [loadingStrands, setLoadingStrands] = useState(false);
  const [lessonPlanRow, setLessonPlanRow] = useState<SchemeRow | null>(null);
  const [lessonPlanOpen, setLessonPlanOpen] = useState(false);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState<"positive" | "negative" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  // Language-specific state
  const [term, setTerm] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [strandSubStrandSelections, setStrandSubStrandSelections] = useState<Record<string, string>>({});
  const [fullStrandData, setFullStrandData] = useState<StrandInfo[]>([]);

  // Term-based state for non-language subjects
  const [termAllocation, setTermAllocation] = useState<{ strandName: string; subStrands: SubStrandInfo[] }[] | null>(null);

  const subjects = getSubjectsForGrade(grade);
  const isLPKiswahili = isLowerPrimaryKiswahili(grade, subject);
  const isLanguage = isLanguageSubject(subject) && !isLPKiswahili;

  // Fetch strands dynamically when grade + subject are selected
  useEffect(() => {
    if (!grade || !subject) {
      setAvailableStrands([]);
      setFullStrandData([]);
      return;
    }

    const fetchStrands = async () => {
      setLoadingStrands(true);
      try {
        const hardcoded = getHardcodedStrands(grade, subject);
        if (hardcoded) {
          setAvailableStrands(hardcoded.map(s => s.name));
          setFullStrandData(hardcoded);
          setLoadingStrands(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("fetch-strands", {
          body: { grade, subject },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setAvailableStrands(data.strands || []);
        setFullStrandData([]);
      } catch (err) {
        console.error("Failed to fetch strands:", err);
        toast({
          title: "Could not load strands",
          description: "Please try selecting the subject again.",
          variant: "destructive",
        });
        setAvailableStrands([]);
        setFullStrandData([]);
      } finally {
        setLoadingStrands(false);
      }
    };

    fetchStrands();
  }, [grade, subject]);

  // Update term allocation when term changes (non-language OR LP Kiswahili)
  useEffect(() => {
    if (!grade || !subject || !term || (isLanguage && !isLPKiswahili)) {
      setTermAllocation(null);
      return;
    }
    const allocation = getTermAllocation(grade, subject, term);
    setTermAllocation(allocation);
  }, [grade, subject, term, isLanguage, isLPKiswahili]);

  const resetForm = () => {
    setStep(1);
    setGrade("");
    setSubject("");
    setIndigenousLanguage("");
    setStrand("");
    setSubStrand("");
    setContext("");
    setGeneratedRows(null);
    setLoading(false);
    setAvailableStrands([]);
    setAvailableSubStrands([]);
    setTerm("");
    setWeekNumber("");
    setStrandSubStrandSelections({});
    setFullStrandData([]);
    setTermAllocation(null);
    setFeedbackRating(null);
    setFeedbackText("");
    setFeedbackSubmitted(false);
    setShowFeedbackInput(false);
  };

  const handleSubmitFeedback = async (rating: "positive" | "negative") => {
    setFeedbackRating(rating);
    if (rating === "negative") {
      setShowFeedbackInput(true);
      return; // Wait for user to type feedback before submitting
    }
    // Positive feedback — submit immediately
    await saveFeedback(rating, "");
  };

  const handleSubmitNegativeFeedback = async () => {
    if (!feedbackText.trim()) {
      toast({ title: "Please describe the issue", description: "Tell us what needs to be improved so we can regenerate better.", variant: "destructive" });
      return;
    }
    await saveFeedback("negative", feedbackText);
  };

  const saveFeedback = async (rating: "positive" | "negative", text: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to submit feedback.", variant: "destructive" });
      return;
    }
    try {
      await supabase.from("scheme_feedback" as any).insert({
        user_id: user.id,
        grade,
        subject,
        term: term || undefined,
        strand: isLanguage ? "Weekly Plan" : (term || strand),
        rating,
        feedback_text: text || undefined,
        generated_content: generatedRows,
      } as any);
      setFeedbackSubmitted(true);
      toast({ title: rating === "positive" ? "Thank you! 👍" : "Feedback received", description: rating === "positive" ? "Your positive feedback helps improve future generations." : "We'll use your feedback to improve. You can regenerate now." });
    } catch (err) {
      console.error("Failed to save feedback:", err);
      toast({ title: "Failed to save feedback", variant: "destructive" });
    }
  };

  const handleRegenerateWithFeedback = async () => {
    if (!feedbackText.trim()) {
      toast({ title: "Please describe what to improve", description: "Type your feedback so the AI knows what to fix.", variant: "destructive" });
      return;
    }
    setRegenerating(true);
    // Save feedback first
    await saveFeedback("negative", feedbackText);
    // Regenerate with feedback as additional context
    const feedbackContext = `TEACHER FEEDBACK ON PREVIOUS GENERATION (MUST ADDRESS): ${feedbackText}`;
    const originalAdditionalInfo = additionalInfo;
    setAdditionalInfo(prev => prev ? `${prev}\n\n${feedbackContext}` : feedbackContext);
    
    // Trigger regeneration
    try {
      if (isLanguage) {
        await handleGenerateWeekly();
      } else {
        await handleGenerateTerm();
      }
      setFeedbackRating(null);
      setFeedbackText("");
      setFeedbackSubmitted(false);
      setShowFeedbackInput(false);
    } catch {
      // Error handled inside generation functions
    } finally {
      setAdditionalInfo(originalAdditionalInfo);
      setRegenerating(false);
    }
  };

  // Populate sub-strands when strand is selected (non-language flow - kept for fallback)
  useEffect(() => {
    if (!grade || !subject || !strand || isLanguage) {
      setAvailableSubStrands([]);
      return;
    }
    const subs = getSubStrandsForStrand(grade, subject, strand);
    if (subs) {
      setAvailableSubStrands(subs.map(s => s.name));
    } else {
      setAvailableSubStrands([]);
    }
  }, [grade, subject, strand, isLanguage]);

  // ── Language weekly generation ──
  const handleGenerateWeekly = async () => {
    if (!grade || !subject || !term) {
      toast({ title: "Missing fields", description: "Please select all required fields.", variant: "destructive" });
      return;
    }

    const weeklyPlan: { strandName: string; subStrandName: string; lessons: number; learningOutcomes?: string[]; suggestedExperiences?: string[]; keyInquiryQuestion?: string }[] = [];
    const distribution = getWeeklyDistribution(subject, fullStrandData);

    for (const dist of distribution) {
      const selectedSubStrand = strandSubStrandSelections[dist.strandName];
      if (!selectedSubStrand) {
        toast({ title: "Missing selection", description: `Please select a sub-strand for "${dist.strandName}".`, variant: "destructive" });
        return;
      }
      const strandData = fullStrandData.find(s => s.name === dist.strandName);
      const subStrandData = strandData?.subStrands.find(ss => ss.name === selectedSubStrand);
      weeklyPlan.push({
        strandName: dist.strandName,
        subStrandName: selectedSubStrand,
        lessons: dist.lessonsThisWeek,
        learningOutcomes: subStrandData?.learningOutcomes,
        suggestedExperiences: subStrandData?.suggestedExperiences,
        keyInquiryQuestion: subStrandData?.keyInquiryQuestion,
      });
    }

    setLoading(true);
    try {
      const lessonsPerWeek = getLessonsPerWeek(grade, subject);
      const { data, error } = await supabase.functions.invoke("generate-scheme", {
        body: {
          grade,
          subject,
          strand: "Weekly Plan",
          context,
          additionalInfo: additionalInfo || undefined,
          weeklyMode: true,
          weekNumber: parseInt(weekNumber),
          term,
          weeklyPlan,
          lessonsPerWeek,
          indigenousLanguage: indigenousLanguage || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedRows(data.rows);
      setStep(6);
      toast({ title: "Weekly Scheme Generated!", description: `Week ${weekNumber} generated with all skill strands.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred. Please try again.";
      toast({ title: "Generation Failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Term-based generation for non-language subjects ──
  const handleGenerateTerm = async () => {
    if (!grade || !subject || !term || !termAllocation || termAllocation.length === 0) {
      toast({ title: "Missing fields", description: "Please select all required fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const lessonsPerWeek = getLessonsPerWeek(grade, subject);

      // Build the term plan: all strands with their sub-strands
      const termPlan = termAllocation.map(a => ({
        strandName: a.strandName,
        subStrands: a.subStrands.map(ss => ({
          name: ss.name,
          lessons: ss.lessons,
          learningOutcomes: ss.learningOutcomes,
          suggestedExperiences: ss.suggestedExperiences,
          keyInquiryQuestion: ss.keyInquiryQuestion,
        })),
      }));

      const { data, error } = await supabase.functions.invoke("generate-scheme", {
        body: {
          grade,
          subject,
          context,
          additionalInfo: additionalInfo || undefined,
          termMode: true,
          term,
          termPlan,
          lessonsPerWeek,
          indigenousLanguage: indigenousLanguage || undefined,
          madaCycleMode: isLPKiswahili, // Interleave sub-strands per Mada for LP Kiswahili
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedRows(data.rows);
      setStep(6);
      const totalLessons = data.rows?.length || 0;
      toast({ title: "Term Scheme Generated!", description: `${term} scheme with ${totalLessons} lessons generated successfully.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred. Please try again.";
      toast({ title: "Generation Failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!generatedRows) return;
    const isSw = kiswahiliSubjects.includes(subject);
    const headers = isSw ? columnHeaders.sw : columnHeaders.en;

    const printArea = document.getElementById("scheme-print-area");
    if (!printArea) return;

    const tableHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <h2 style="margin:0;font-size:16pt;">${isSw ? "Mpango wa Kazi" : "Scheme of Work"}</h2>
        <p style="margin:4px 0;font-size:11pt;">${grade} — ${subject}${term ? ` — ${term}` : ""}${weekNumber ? ` — Week ${weekNumber}` : ""}</p>
        <p style="margin:0;font-size:9pt;color:#666;">${isSw ? "Mtaala wa CBC - KICD Kenya" : "CBC Curriculum — KICD Kenya"}</p>
      </div>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${generatedRows.map((row) => `<tr>
          <td>${row.week}</td>
          <td>${row.lesson}</td>
          <td>${row.strand}</td>
          <td>${row.subStrand}</td>
          <td>${row.specificLearningOutcome.replace(/\n/g, "<br/>")}</td>
          <td>${row.learningExperiences.replace(/\n/g, "<br/>")}</td>
          <td>${row.keyInquiryQuestion}</td>
          <td>${row.learningResources}</td>
          <td>${row.assessmentMethods}</td>
          <td>${row.reflection}</td>
        </tr>`).join("")}</tbody>
      </table>`;

    printArea.innerHTML = tableHTML;
    window.print();
    toast({ title: "PDF Export", description: "Print dialog opened. Select 'Save as PDF' to export." });
  };

  const handleSave = async () => {
    if (!generatedRows) return;
    if (user) {
      await supabase.from("generated_resources" as any).insert({
        user_id: user.id,
        resource_type: "scheme",
        grade,
        subject,
        strand: isLanguage ? "Weekly Plan" : (term || strand),
        sub_strand: isLanguage ? undefined : undefined,
        term: term || undefined,
        content: generatedRows,
        input_params: { context, additionalInfo, strandSubStrandSelections, termAllocation },
      } as any);
      toast({ title: "Saved!", description: "Your scheme has been saved to your library." });
    } else {
      toast({ title: "Sign in required", description: "Sign in with Google to save schemes to your library.", variant: "destructive" });
    }
  };

  const weeklyDistribution = isLanguage && fullStrandData.length > 0
    ? getWeeklyDistribution(subject, fullStrandData)
    : [];

  const termTotalLessons = termAllocation ? getTermLessonCount(termAllocation) : 0;
  const termTotalWeeks = termAllocation ? Math.ceil(termTotalLessons / getLessonsPerWeek(grade, subject)) : 0;

  return (
    <>
      <div id="scheme-print-area" className="hidden print:block" />
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2 font-semibold text-base px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <Sparkles className="w-5 h-5" />
            Generate Scheme of Work
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {step < 6 ? "Create Scheme of Work" : "Preview Scheme of Work"}
            </DialogTitle>
          </DialogHeader>

          {step < 6 && (
            <div className="flex gap-1 mb-4">
              {(isLanguage ? [1, 2, 3, 4, 5] : isLPKiswahili ? [1, 2, 3, 4] : [1, 2, 3, 4]).map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          )}

          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {/* Step 1: Grade */}
            {step === 1 && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Select the grade level for this scheme.</p>
                <Select value={grade} onValueChange={(v) => { setGrade(v); setSubject(""); setStrand(""); setStep(2); }}>
                  <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 2: Subject */}
            {step === 2 && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">Select the subject for {grade}.</p>
                <Select value={subject} onValueChange={(v) => {
                  setSubject(v);
                  setIndigenousLanguage("");
                  setStrand("");
                  setStrandSubStrandSelections({});
                  setTermAllocation(null);
                  if (v === "Indigenous Language") {
                    /* stay to pick language */
                  } else {
                    setStep(3);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {subject === "Indigenous Language" && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Which indigenous language does your school teach?</p>
                    <Select value={indigenousLanguage} onValueChange={(v) => { setIndigenousLanguage(v); setStep(3); }}>
                      <SelectTrigger><SelectValue placeholder="Select your language" /></SelectTrigger>
                      <SelectContent>
                        {INDIGENOUS_LANGUAGES.map((lang) => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setStep(1); setGrade(""); }}>← Back</Button>
              </div>
            )}

            {/* ── LANGUAGE FLOW: Step 3 = Term ── */}
            {step === 3 && isLanguage && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {kiswahiliSubjects.includes(subject) ? "Chagua muhula." : "Select the term to generate."}
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{kiswahiliSubjects.includes(subject) ? "Muhula" : "Term"}</label>
                  <Select value={term} onValueChange={(v) => { setTerm(v); setStep(4); }}>
                    <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setStep(2); setSubject(""); setTerm(""); }}>← Back</Button>
              </div>
            )}

            {/* ── LANGUAGE FLOW: Step 4 = Select sub-strand per skill strand ── */}
            {step === 4 && isLanguage && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {kiswahiliSubjects.includes(subject)
                    ? `Chagua mada ndogo kwa kila ujuzi kwa Wiki ${weekNumber}.`
                    : `Select which sub-strand to teach for each skill area in Week ${weekNumber}.`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {kiswahiliSubjects.includes(subject)
                    ? "Kila wiki ina masomo kutoka ujuzi wote wa lugha."
                    : "Each week includes lessons from all language skill strands."}
                </p>

                {loadingStrands ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {kiswahiliSubjects.includes(subject) ? "Inapakia..." : "Loading strands..."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {weeklyDistribution.map(({ strandName, lessonsThisWeek }) => {
                      const strandData = fullStrandData.find(s => s.name === strandName);
                      if (!strandData) return null;
                      return (
                        <div key={strandName} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{strandName}</span>
                            <span className="text-xs text-muted-foreground">
                              {lessonsThisWeek} {lessonsThisWeek === 1 ? "lesson" : "lessons"}
                            </span>
                          </div>
                          <Select
                            value={strandSubStrandSelections[strandName] || ""}
                            onValueChange={(v) => setStrandSubStrandSelections(prev => ({ ...prev, [strandName]: v }))}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder={kiswahiliSubjects.includes(subject) ? "Chagua mada ndogo" : "Select sub-strand"} />
                            </SelectTrigger>
                            <SelectContent>
                              {strandData.subStrands.map(ss => (
                                <SelectItem key={ss.name} value={ss.name}>{ss.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!loadingStrands && weeklyDistribution.every(d => strandSubStrandSelections[d.strandName]) && (
                  <Button onClick={() => setStep(5)} className="mt-2">
                    {kiswahiliSubjects.includes(subject) ? "Endelea" : "Continue"} →
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setStep(3); setStrandSubStrandSelections({}); }}>← Back</Button>
              </div>
            )}

            {/* ── LANGUAGE FLOW: Step 5 = Confirm & Generate ── */}
            {step === 5 && isLanguage && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p><span className="font-medium">Grade:</span> {grade}</p>
                  <p><span className="font-medium">Subject:</span> {subject}{indigenousLanguage ? ` (${indigenousLanguage})` : ""}</p>
                  <p><span className="font-medium">{kiswahiliSubjects.includes(subject) ? "Muhula" : "Term"}:</span> {term}</p>
                  <div className="mt-2 pt-2 border-t">
                    <p className="font-medium mb-1">{kiswahiliSubjects.includes(subject) ? "Mpango wa Wiki:" : "Weekly Plan:"}</p>
                    {weeklyDistribution.map(({ strandName, lessonsThisWeek }) => (
                      <p key={strandName} className="text-xs ml-2">
                        • {strandName}: <span className="font-medium">{strandSubStrandSelections[strandName]}</span> ({lessonsThisWeek} {lessonsThisWeek === 1 ? "lesson" : "lessons"})
                      </p>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {kiswahiliSubjects.includes(subject)
                      ? "Unapanga kutumia rasilimali gani za kujifunza?"
                      : "What learning resources do you plan on using?"}
                  </label>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={
                      kiswahiliSubjects.includes(subject)
                        ? "k.m., vitabu vya kiada, video, vifaa vya sanaa..."
                        : "e.g., textbooks, videos, art supplies, musical instruments, outdoor space..."
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {kiswahiliSubjects.includes(subject)
                      ? "Taarifa nyingine muhimu (si lazima)"
                      : "Any other relevant information (optional)"}
                  </label>
                  <Textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder={
                      kiswahiliSubjects.includes(subject)
                        ? "k.m., mahitaji maalum ya wanafunzi, muktadha wa shule, malengo ya ziada..."
                        : "e.g., special needs considerations, school context, specific teaching goals..."
                    }
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(4)}>← Back</Button>
                  <Button onClick={handleGenerateWeekly} disabled={loading} className="ml-auto gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading
                      ? (kiswahiliSubjects.includes(subject) ? "Inatengeneza..." : "Generating...")
                      : (kiswahiliSubjects.includes(subject) ? "Tengeneza Mpango wa Wiki" : "Generate Weekly Scheme")}
                  </Button>
                </div>
              </div>
            )}

            {/* ── NON-LANGUAGE FLOW (+ LP Kiswahili): Step 3 = Term ── */}
            {step === 3 && !isLanguage && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {isLPKiswahili
                    ? "Chagua muhula wa kutengeneza mpango wa kazi."
                    : `Select the term to generate a full scheme of work for ${subject}.`}
                </p>
                <Select value={term} onValueChange={(v) => { setTerm(v); setStep(4); }}>
                  <SelectTrigger><SelectValue placeholder={isLPKiswahili ? "Chagua Muhula" : "Select Term"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">{isLPKiswahili ? "Muhula wa 1" : "Term 1"}</SelectItem>
                    <SelectItem value="Term 2">{isLPKiswahili ? "Muhula wa 2" : "Term 2"}</SelectItem>
                    <SelectItem value="Term 3">{isLPKiswahili ? "Muhula wa 3" : "Term 3"}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => { setStep(2); setSubject(""); setTerm(""); }}>← Back</Button>
              </div>
            )}

            {/* ── NON-LANGUAGE FLOW (+ LP Kiswahili): Step 4 = Review & Generate ── */}
            {step === 4 && !isLanguage && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p><span className="font-medium">{isLPKiswahili ? "Gredi:" : "Grade:"}</span> {grade}</p>
                  <p><span className="font-medium">{isLPKiswahili ? "Somo:" : "Subject:"}</span> {subject}</p>
                  <p><span className="font-medium">{isLPKiswahili ? "Muhula:" : "Term:"}</span> {term}</p>
                </div>

                {termAllocation && termAllocation.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {isLPKiswahili ? "Mada na mada ndogo za muhula huu:" : "Strands & sub-strands for this term:"}
                    </p>
                    {termAllocation.map(({ strandName, subStrands }) => (
                      <div key={strandName} className="rounded-lg border p-3 space-y-1">
                        <p className="text-sm font-semibold">{strandName}</p>
                        {subStrands.map(ss => (
                          <p key={ss.name} className="text-xs text-muted-foreground ml-2">
                            • {ss.name} <span className="text-xs opacity-60">({ss.lessons} {isLPKiswahili ? "vipindi" : "lessons"})</span>
                          </p>
                        ))}
                      </div>
                    ))}
                    {isLPKiswahili && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg p-2">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>Kila Mada inachukua wiki 3: vipindi 4 kwa wiki (moja kwa kila mada ndogo)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg p-2">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>{isLPKiswahili ? "Jumla" : "Total"}: <strong>{termTotalLessons} {isLPKiswahili ? "vipindi" : "lessons"}</strong> {isLPKiswahili ? "katika wiki" : "across"} ~{termTotalWeeks} {isLPKiswahili ? "" : "weeks"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4">
                    {loadingStrands ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isLPKiswahili ? "Inapakia data ya mtaala..." : "Loading curriculum data..."}
                      </div>
                    ) : (
                      <p>{isLPKiswahili
                        ? `Hakuna data ya mtaala kwa ${grade} ${subject} ${term}.`
                        : `No curriculum data available for ${grade} ${subject} ${term}. The scheme will be generated using AI curriculum knowledge.`}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isLPKiswahili ? "Unapanga kutumia rasilimali gani za kujifunza?" : "What learning resources do you plan on using?"}
                  </label>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={isLPKiswahili
                      ? "k.m., vitabu vya kiada, video, vifaa vya sanaa..."
                      : "e.g., textbooks, videos, art supplies, musical instruments, outdoor space..."}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {isLPKiswahili ? "Taarifa nyingine muhimu (si lazima)" : "Any other relevant information (optional)"}
                  </label>
                  <Textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder={isLPKiswahili
                      ? "k.m., mahitaji maalum ya wanafunzi, muktadha wa shule..."
                      : "e.g., special needs considerations, school context, specific teaching goals..."}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setStep(3); setTerm(""); setTermAllocation(null); }}>← Back</Button>
                  <Button onClick={handleGenerateTerm} disabled={loading} className="ml-auto gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading
                      ? (isLPKiswahili ? "Inatengeneza mpango wa muhula..." : "Generating term scheme...")
                      : (isLPKiswahili ? `Tengeneza Mpango wa ${term}` : `Generate ${term} Scheme`)}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 6: Preview (both flows) ── */}
            {step === 6 && generatedRows && (
              <div className="space-y-4 py-2">
                <SchemePreview rows={generatedRows} subject={subject} grade={grade} strand={term || strand} />
                
                {/* Per-lesson "Generate Lesson Plan" buttons */}
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Generate Lesson Plans
                  </h4>
                  <p className="text-xs text-muted-foreground">Click on any lesson to generate a detailed lesson plan for it.</p>
                  <div className="flex flex-wrap gap-2">
                    {generatedRows.map((row, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => { setLessonPlanRow(row); setLessonPlanOpen(true); }}
                      >
                        <Sparkles className="w-3 h-3" />
                        Wk {row.week} L{row.lesson}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Feedback Section */}
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    How is this scheme?
                  </h4>

                  {!feedbackSubmitted && !showFeedbackInput && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant={feedbackRating === "positive" ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleSubmitFeedback("positive")}
                      >
                        <ThumbsUp className="w-4 h-4" /> Good
                      </Button>
                      <Button
                        variant={feedbackRating === "negative" ? "destructive" : "outline"}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleSubmitFeedback("negative")}
                      >
                        <ThumbsDown className="w-4 h-4" /> Needs Improvement
                      </Button>
                    </div>
                  )}

                  {showFeedbackInput && !feedbackSubmitted && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        What should be improved? Be specific — e.g. "SLOs should focus on identifying weather, not handling it"
                      </p>
                      <Textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Describe what needs to change..."
                        rows={3}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSubmitNegativeFeedback}
                          className="gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" /> Save Feedback
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleRegenerateWithFeedback}
                          disabled={regenerating || loading}
                          className="gap-1.5"
                        >
                          {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          {regenerating ? "Regenerating..." : "Regenerate with Feedback"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {feedbackSubmitted && feedbackRating === "positive" && (
                    <p className="text-xs text-primary flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" /> Thank you! Your feedback helps us improve.
                    </p>
                  )}

                  {feedbackSubmitted && feedbackRating === "negative" && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        ✓ Feedback saved. Want to regenerate with your suggestions?
                      </p>
                      <Button
                        size="sm"
                        onClick={() => { setFeedbackSubmitted(false); setShowFeedbackInput(true); }}
                        className="gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate with Feedback
                      </Button>
                    </div>
                  )}
                </div>

                {/* Export buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="secondary" onClick={handleSave} className="gap-2">
                    <Save className="w-4 h-4" /> Save to Library
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportSchemeToDocx(generatedRows!, grade, subject, term || strand)}
                    className="gap-2"
                  >
                    <FileDown className="w-4 h-4" /> Export DOCX
                  </Button>
                  <Button onClick={handleExportPDF} className="gap-2 ml-auto">
                    <Download className="w-4 h-4" /> Export PDF
                  </Button>
                </div>
              </div>
            )}

            {/* Lesson Plan Dialog */}
            {lessonPlanRow && (
              <LessonPlanDialog
                open={lessonPlanOpen}
                onOpenChange={setLessonPlanOpen}
                row={lessonPlanRow}
                grade={grade}
                subject={subject}
                term={term || undefined}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SchemeGeneratorDialog;
