const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SchemeRow {
  week: number;
  lesson: number;
  strand: string;
  subStrand: string;
  specificLearningOutcome: string;
  keyInquiryQuestion: string;
  learningExperiences: string;
  learningResources: string;
  assessmentMethods: string;
  reflection: string;
}

interface SubStrandInfo {
  name: string;
  lessons: number;
  learningOutcomes?: string[];
  suggestedExperiences?: string[];
  keyInquiryQuestion?: string;
}

const kiswahiliSubjects = ["Kiswahili"];

function extractJsonArray(raw: string): SchemeRow[] {
  let cleaned = raw.trim();
  // Remove markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  cleaned = cleaned.trim();

  // Find the JSON array boundaries
  const start = cleaned.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in response");

  const end = cleaned.lastIndexOf("]");

  // If we have a complete array, parse directly
  if (end > start) {
    try {
      return JSON.parse(cleaned.substring(start, end + 1));
    } catch {
      // Fall through to recovery
    }
  }

  // Truncated response — try to recover partial array
  console.warn("Response appears truncated, attempting recovery...");
  let partial = cleaned.substring(start);

  // Remove trailing commas and incomplete objects
  // Find the last complete object (ending with })
  const lastBrace = partial.lastIndexOf("}");
  if (lastBrace > 0) {
    let repaired = partial.substring(0, lastBrace + 1);
    // Remove any trailing comma after the last }
    repaired = repaired.replace(/,\s*$/, "");
    // Close the array
    repaired += "]";
    // Fix common issues
    repaired = repaired
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");

    try {
      const items = JSON.parse(repaired);
      console.warn(`Recovered ${items.length} items from truncated response`);
      return items;
    } catch (e) {
      throw new Error(`Cannot recover truncated JSON: ${e}`);
    }
  }

  throw new Error("No parseable JSON found in response");
}

// ============================================================
// GUARDRAILS: Post-processing validation & sanitization
// These ensure production-quality output regardless of AI quirks
// ============================================================

/** Get the official KLB Visionary Learner's Book title for a subject+grade. */
function getKLBBookTitle(subject: string, grade: string): string {
  const gradeNum = parseInt(grade.replace("Grade ", ""));
  const isSw = kiswahiliSubjects.includes(subject);
  if (gradeNum >= 1 && gradeNum <= 3) {
    const titles: Record<string, string> = {
      "English Activities": `KLB Visionary English Literacy Activities ${grade}`,
      "Kiswahili": `KLB Visionary Kiswahili Gredi ${gradeNum}`,
      "Mathematics": `KLB Visionary Mathematical Activities ${grade}`,
      "Environmental Activities": `KLB Visionary Environmental Activities ${grade}`,
      "Creative Activities": `KLB Visionary Creative Activities ${grade}`,
      "CRE": `KLB Visionary CRE Activities ${grade}`,
      "IRE": `KLB Visionary IRE Activities ${grade}`,
      "HRE": `KLB Visionary HRE Activities ${grade}`,
      "Indigenous Language": `KLB Visionary Indigenous Language Activities ${grade}`,
    };
    return titles[subject] || `KLB Visionary ${subject} ${grade}`;
  }
  if (isSw) return `KLB Visionary Kiswahili Gredi ${gradeNum}`;
  return `KLB Visionary ${subject} ${grade}`;
}

/** GUARDRAIL 1: Fix week/lesson numbering deterministically. */
function enforceWeekLessonNumbering(rows: SchemeRow[], weekStart: number, lessonsPerWeek: number): SchemeRow[] {
  let currentWeek = weekStart;
  let currentLesson = 1;
  return rows.map((row) => {
    const fixed = { ...row, week: currentWeek, lesson: currentLesson };
    currentLesson++;
    if (currentLesson > lessonsPerWeek) {
      currentLesson = 1;
      currentWeek++;
    }
    return fixed;
  });
}

/** GUARDRAIL 2: Override strand/subStrand with exact requested values. */
function enforceStrandNames(rows: SchemeRow[], strand: string, subStrandName: string): SchemeRow[] {
  return rows.map((row) => ({ ...row, strand, subStrand: subStrandName }));
}

/** GUARDRAIL 3: Validate & fix Specific Learning Outcomes (must have a, b, c for English; dashes for Kiswahili). */
function validateAndFixSLO(slo: string, isSw: boolean): string {
  if (!slo || slo.trim().length === 0) {
    return isSw 
      ? "**Kufikia mwisho wa somo mwanafunzi aweze:**\n-kutambua [maarifa]\n-kutekeleza [ujuzi]\n-kufurahia [mitazamo]"
      : "By the end of the lesson, the learner should be able to:\na) [Knowledge outcome]\nb) [Skills outcome]\nc) [Attitudes/Values outcome]";
  }
  
  if (isSw) {
    // Kiswahili format: should start with **Kufikia mwisho... and use dashes
    const hasHeader = /kufikia mwisho wa somo/i.test(slo);
    const hasDashes = /-ku/.test(slo);
    
    if (hasHeader && hasDashes) {
      return slo.trim();
    }
    
    // Try to fix it
    let fixed = slo;
    if (!hasHeader) {
      fixed = "**Kufikia mwisho wa somo mwanafunzi aweze:**\n" + fixed.trim();
    }
    // Convert a), b), c) to dashes if present
    fixed = fixed.replace(/\n\s*[a-c]\)\s*/gi, '\n-');
    return fixed;
  }
  
  // English format: a), b), c)
  const hasA = /a\)/.test(slo);
  const hasB = /b\)/.test(slo);
  const hasC = /c\)/.test(slo);

  let fixed = slo;
  if (hasA && hasB && hasC) {
    if (!fixed.toLowerCase().includes("by the end of the lesson")) {
      fixed = "By the end of the lesson, the learner should be able to:\n" + fixed.trim();
    }
    return fixed;
  }
  const lines = slo.split(/\n|(?=\d\.\s)/).map(l => l.trim()).filter(Boolean);
  const content = lines.filter(l => !l.toLowerCase().includes("by the end"));
  if (content.length >= 3) {
    return `By the end of the lesson, the learner should be able to:\na) ${content[0].replace(/^[a-c]\)\s*|^\d+[\.\)]\s*/i, "")}\nb) ${content[1].replace(/^[a-c]\)\s*|^\d+[\.\)]\s*/i, "")}\nc) ${content[2].replace(/^[a-c]\)\s*|^\d+[\.\)]\s*/i, "")}`;
  }
  console.warn("SLO format could not be auto-fixed:", slo.substring(0, 80));
  return slo;
}

/** GUARDRAIL 4: Validate Learning Experiences (English: "Learner is guided to:" + a,b,c,d; Kiswahili: "**Mwanafunzi aweze:-**" + dashes). */
function validateAndFixExperiences(exp: string, isSw: boolean): string {
  if (!exp || exp.trim().length === 0) {
    return isSw
      ? "**Mwanafunzi aweze:-**\n-kujadili [maarifa]\n-kutekeleza [ujuzi]\n-kutumia [utumiaji]\n-kuthamini [mitazamo]"
      : "Learner is guided to:\na) [Knowledge activity]\nb) [Skills activity]\nc) [Application activity]\nd) [Attitudes/Values activity]";
  }
  
  if (isSw) {
    // Kiswahili format: should start with **Mwanafunzi aweze:-** and use dashes
    const hasHeader = /mwanafunzi aweze/i.test(exp);
    const hasDashes = /-ku/.test(exp);
    
    if (hasHeader && hasDashes) {
      return exp.trim();
    }
    
    // Try to fix it
    let fixed = exp;
    if (!hasHeader) {
      fixed = "**Mwanafunzi aweze:-**\n" + fixed.trim();
    }
    // Convert a), b), c), d) to dashes if present
    fixed = fixed.replace(/\n\s*[a-d]\)\s*/gi, '\n-');
    return fixed;
  }
  
  // English format
  const hasGuided = /learner is guided to/i.test(exp);
  const hasA = /a\)/.test(exp);
  const hasB = /b\)/.test(exp);
  const hasC = /c\)/.test(exp);
  const hasD = /d\)/.test(exp);

  let fixed = exp.trim();

  if (hasGuided && hasA && hasB && hasC && hasD) return fixed;

  if (!hasGuided) fixed = "Learner is guided to:\n" + fixed;
  if (!hasA || !hasB || !hasC || !hasD) {
    const lines = fixed.split(/\n|(?<=\.)\s+/).map(l => l.trim()).filter(l => l && !l.toLowerCase().includes("learner is guided"));
    if (lines.length >= 4) {
      return `Learner is guided to:\na) ${lines[0].replace(/^[a-d]\)\s*|^[-•]\s*/i, "")}\nb) ${lines[1].replace(/^[a-d]\)\s*|^[-•]\s*/i, "")}\nc) ${lines[2].replace(/^[a-d]\)\s*|^[-•]\s*/i, "")}\nd) ${lines[3].replace(/^[a-d]\)\s*|^[-•]\s*/i, "")}`;
    }
  }
  return fixed;
}

/** GUARDRAIL 5: Fill in empty required fields with sensible defaults. */
function ensureNoEmptyFields(row: SchemeRow, grade: string, subject: string): SchemeRow {
  return {
    ...row,
    strand: row.strand || subject,
    subStrand: row.subStrand || "",
    specificLearningOutcome: row.specificLearningOutcome || "",
    keyInquiryQuestion: row.keyInquiryQuestion || "What have we learned today?",
    learningExperiences: row.learningExperiences || "",
    learningResources: row.learningResources || getKLBBookTitle(subject, grade),
    assessmentMethods: row.assessmentMethods || "Oral questions, observation",
    reflection: "",
  };
}

/** GUARDRAIL 6: Normalize AI key variants (snake_case, wrong casing, etc). */
function normalizeRowKeys(raw: Record<string, unknown>): SchemeRow {
  const keyMap: Record<string, string> = {
    specificlearningoutcome: "specificLearningOutcome",
    specificlearningoutcomes: "specificLearningOutcome",
    specific_learning_outcome: "specificLearningOutcome",
    specific_learning_outcomes: "specificLearningOutcome",
    learning_outcome: "specificLearningOutcome",
    keyinquiryquestion: "keyInquiryQuestion",
    keyinquiryquestions: "keyInquiryQuestion",
    key_inquiry_question: "keyInquiryQuestion",
    key_inquiry_questions: "keyInquiryQuestion",
    inquiry_question: "keyInquiryQuestion",
    learningexperiences: "learningExperiences",
    learning_experiences: "learningExperiences",
    learningresources: "learningResources",
    learning_resources: "learningResources",
    assessmentmethods: "assessmentMethods",
    assessment_methods: "assessmentMethods",
    assessment: "assessmentMethods",
    substrand: "subStrand",
    sub_strand: "subStrand",
  };
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const lk = key.toLowerCase().replace(/[-_\s]/g, "");
    normalized[keyMap[lk] || key] = value;
  }
  return {
    week: Number(normalized.week) || 1,
    lesson: Number(normalized.lesson) || 1,
    strand: String(normalized.strand || ""),
    subStrand: String(normalized.subStrand || ""),
    specificLearningOutcome: String(normalized.specificLearningOutcome || ""),
    keyInquiryQuestion: String(normalized.keyInquiryQuestion || ""),
    learningExperiences: String(normalized.learningExperiences || ""),
    learningResources: String(normalized.learningResources || ""),
    assessmentMethods: String(normalized.assessmentMethods || ""),
    reflection: "",
  };
}

/** GUARDRAIL 9: Enforce exact lesson count per sub-strand.
 *  If AI produced too many, trim the excess.
 *  If AI produced too few, keep what we have (do NOT pad with fake "continued" lessons). */
function enforceLessonCount(rows: SchemeRow[], expectedLessons: number, weekStart: number, lessonsPerWeek: number): SchemeRow[] {
  if (rows.length === expectedLessons) return rows;

  if (rows.length > expectedLessons) {
    console.warn(`Guardrail 9: Trimming ${rows.length} rows to expected ${expectedLessons}`);
    const trimmed = rows.slice(0, expectedLessons);
    return enforceWeekLessonNumbering(trimmed, weekStart, lessonsPerWeek);
  }

  // If we're short, just re-number what we have — do NOT duplicate/pad
  console.warn(`Guardrail 9: Have ${rows.length} rows but expected ${expectedLessons}. Keeping all unique rows.`);
  return enforceWeekLessonNumbering(rows, weekStart, lessonsPerWeek);
}

/** GUARDRAIL 10: Validate each SLO aligns with official KICD learning outcomes.
 *  If the sub-strand has official outcomes, every generated SLO must reference
 *  at least one of them. If a row's SLO doesn't match any official outcome,
 *  rewrite it using the official outcomes in round-robin order. */
function validateSLOAlignment(
  rows: SchemeRow[],
  officialOutcomes: string[] | undefined,
  isSw: boolean,
): SchemeRow[] {
  if (!officialOutcomes || officialOutcomes.length === 0) return rows;

  // Build keyword sets from each official outcome (lowercase, 3+ char words)
  const outcomeKeywords: Set<string>[] = officialOutcomes.map(o =>
    new Set(o.toLowerCase().split(/\s+/).filter(w => w.length >= 3))
  );

  // Check if an SLO text references at least one official outcome
  function matchesAnyOutcome(sloText: string): boolean {
    const sloLower = sloText.toLowerCase();
    for (let i = 0; i < officialOutcomes!.length; i++) {
      // Check if 40%+ of the outcome's keywords appear in the SLO
      const keywords = outcomeKeywords[i];
      let hits = 0;
      for (const kw of keywords) {
        if (sloLower.includes(kw)) hits++;
      }
      if (keywords.size > 0 && hits / keywords.size >= 0.4) return true;
    }
    return false;
  }

  let outcomeIndex = 0;
  return rows.map((row, lessonIdx) => {
    if (matchesAnyOutcome(row.specificLearningOutcome)) return row;

    // This SLO doesn't align — rebuild from official outcomes
    console.warn(`Guardrail 10: SLO for lesson ${lessonIdx + 1} doesn't align with KICD outcomes. Rewriting.`);
    
    // Distribute official outcomes across lessons round-robin
    const primaryOutcome = officialOutcomes[outcomeIndex % officialOutcomes.length];
    const secondaryOutcome = officialOutcomes[(outcomeIndex + 1) % officialOutcomes.length];
    const tertiaryOutcome = officialOutcomes[(outcomeIndex + 2) % officialOutcomes.length];
    outcomeIndex++;

    const newSLO = isSw
      ? `**Kufikia mwisho wa somo mwanafunzi aweze:**\n-${primaryOutcome}\n-${secondaryOutcome}\n-${tertiaryOutcome}`
      : `By the end of the lesson, the learner should be able to:\na) ${primaryOutcome}\nb) ${secondaryOutcome}\nc) ${tertiaryOutcome}`;

    return { ...row, specificLearningOutcome: newSLO };
  });
}

/** GUARDRAIL 11: RIGID KSA enforcement — a)=Knowledge verb, b)=Skills verb, c)=Attitudes verb.
 *  If any slot uses the wrong domain verb, swap it to the correct slot or rewrite. */
function validateKSAStructure(rows: SchemeRow[], isSw: boolean): SchemeRow[] {
  const knowledgeVerbsEn = ["identify", "define", "describe", "name", "outline", "state", "recognize", "explain", "list", "label", "recall", "summarize", "distinguish", "illustrate", "compare", "classify"];
  const skillsVerbsEn = ["demonstrate", "perform", "practice", "practise", "model", "draw", "calculate", "manipulate", "use", "collaborate", "execute", "construct", "sing", "measure", "sketch", "solve", "trace", "cut", "colour", "paint", "observe", "record", "differentiate", "interpret", "suggest", "role-play", "conduct", "participate", "sort", "express", "create", "conserve"];
  const attitudeVerbsEn = ["appreciate", "value", "show", "care", "demonstrate responsibility", "acknowledge", "enjoy", "uphold", "persist", "commit", "adhere", "advocate", "respect", "empathize", "prioritize", "develop"];

  const knowledgeVerbsSw = ["kutambua", "kutaja", "kuorodhesha", "kueleza", "kufafanua", "kulinganisha", "kutofautisha", "kuelezea", "kubainisha", "kufafanua"];
  const skillsVerbsSw = ["kutekeleza", "kutumia", "kujenga", "kuonyesha", "kuchora", "kuhesabu", "kupima", "kutatua", "kuimba", "kukata", "kupaka", "kushiriki", "kufanya mazoezi", "kupanga", "kurekodi", "kucheza jukumu", "kuunda"];
  const attitudeVerbsSw = ["kufurahia", "kuheshimu", "kuthamini", "kushirikiana", "kuzingatia", "kuendeleza", "kutetea", "kujali", "kujitolea", "kuweka kipaumbele"];

  const bannedVerbs = isSw
    ? ["kujua", "kuelewa"]
    : ["know", "understand", "be aware", "learn to", "have a positive attitude", "carry out", "find out", "look at", "get to know", "learn about", "talk about", "go through"];

  const kVerbs = isSw ? knowledgeVerbsSw : knowledgeVerbsEn;
  const sVerbs = isSw ? skillsVerbsSw : skillsVerbsEn;
  const aVerbs = isSw ? attitudeVerbsSw : attitudeVerbsEn;

  function startsWithVerb(text: string, verbs: string[]): boolean {
    const lower = text.toLowerCase().trim();
    return verbs.some(v => lower.startsWith(v));
  }

  function containsBannedVerb(text: string): string | null {
    const lower = text.toLowerCase();
    for (const v of bannedVerbs) {
      if (lower.includes(v)) return v;
    }
    return null;
  }

  function replaceBannedVerb(text: string): string {
    let fixed = text;
    if (!isSw) {
      fixed = fixed.replace(/\bknow\b/gi, "identify");
      fixed = fixed.replace(/\bunderstand\b/gi, "describe");
      fixed = fixed.replace(/\bbe aware of\b/gi, "recognize");
      fixed = fixed.replace(/\blearn to\b/gi, "");
      fixed = fixed.replace(/\bhave a positive attitude\b/gi, "appreciate");
      fixed = fixed.replace(/\bcarry out\b/gi, "practice");
      fixed = fixed.replace(/\bfind out\b/gi, "identify");
      fixed = fixed.replace(/\blook at\b/gi, "observe");
      fixed = fixed.replace(/\bget to know\b/gi, "recognize");
      fixed = fixed.replace(/\blearn about\b/gi, "identify");
      fixed = fixed.replace(/\btalk about\b/gi, "describe");
      fixed = fixed.replace(/\bgo through\b/gi, "explore");
    } else {
      fixed = fixed.replace(/\bkujua\b/gi, "kutambua");
      fixed = fixed.replace(/\bkuelewa\b/gi, "kueleza");
    }
    return fixed;
  }

  return rows.map((row, idx) => {
    const slo = row.specificLearningOutcome;
    if (!slo || slo.trim().length < 20) return row;

    // Extract the 3 parts (a, b, c for English; dashes for Kiswahili)
    let parts: string[] = [];
    if (isSw) {
      const lines = slo.split("\n").filter(l => l.trim().startsWith("-"));
      parts = lines.map(l => l.replace(/^-\s*/, "").trim());
    } else {
      const aMatch = slo.match(/a\)\s*(.+?)(?=\nb\)|$)/s);
      const bMatch = slo.match(/b\)\s*(.+?)(?=\nc\)|$)/s);
      const cMatch = slo.match(/c\)\s*(.+)/s);
      if (aMatch) parts.push(aMatch[1].trim());
      if (bMatch) parts.push(bMatch[1].trim());
      if (cMatch) parts.push(cMatch[1].trim());
    }

    if (parts.length < 3) return row; // Can't validate incomplete SLOs

    // Replace banned verbs in each part first
    parts = parts.map(p => {
      const banned = containsBannedVerb(p);
      if (banned) {
        console.warn(`Guardrail 11: Lesson ${idx + 1} — banned verb "${banned}" found, replacing.`);
        return replaceBannedVerb(p);
      }
      return p;
    });

    // Now validate KSA ordering: a=Knowledge, b=Skills, c=Attitudes
    const aIsK = startsWithVerb(parts[0], kVerbs);
    const aIsS = startsWithVerb(parts[0], sVerbs);
    const aIsA = startsWithVerb(parts[0], aVerbs);
    const bIsK = startsWithVerb(parts[1], kVerbs);
    const bIsS = startsWithVerb(parts[1], sVerbs);
    const bIsA = startsWithVerb(parts[1], aVerbs);
    const cIsK = startsWithVerb(parts[2], kVerbs);
    const cIsS = startsWithVerb(parts[2], sVerbs);
    const cIsA = startsWithVerb(parts[2], aVerbs);

    // If all in correct slots, keep as-is
    if (aIsK && bIsS && cIsA) {
      // Reassemble with cleaned parts
      return { ...row, specificLearningOutcome: reassembleSLO(slo, parts, isSw) };
    }

    // Try to rearrange: find the Knowledge part, Skills part, Attitudes part
    let kPart = "", sPart = "", aPart = "";
    const allParts = [...parts];

    // Find each domain
    for (const p of allParts) {
      if (!kPart && startsWithVerb(p, kVerbs)) kPart = p;
      else if (!sPart && startsWithVerb(p, sVerbs)) sPart = p;
      else if (!aPart && startsWithVerb(p, aVerbs)) aPart = p;
    }

    // Assign unmatched parts to empty slots
    const unmatched = allParts.filter(p => p !== kPart && p !== sPart && p !== aPart);
    if (!kPart && unmatched.length > 0) kPart = unmatched.shift()!;
    if (!sPart && unmatched.length > 0) sPart = unmatched.shift()!;
    if (!aPart && unmatched.length > 0) aPart = unmatched.shift()!;

    if (kPart !== parts[0] || sPart !== parts[1] || aPart !== parts[2]) {
      console.warn(`Guardrail 11: Lesson ${idx + 1} — KSA order was wrong. Rearranged: K="${kPart.substring(0, 30)}", S="${sPart.substring(0, 30)}", A="${aPart.substring(0, 30)}"`);
    }

    const newSLO = reassembleSLO(slo, [kPart || parts[0], sPart || parts[1], aPart || parts[2]], isSw);
    return { ...row, specificLearningOutcome: newSLO };
  });
}

function reassembleSLO(originalSLO: string, parts: string[], isSw: boolean): string {
  if (isSw) {
    const header = originalSLO.split("\n")[0];
    return `${header}\n-${parts[0]}\n-${parts[1]}\n-${parts[2]}`;
  }
  const headerMatch = originalSLO.match(/^(.*?)\n\s*a\)/s);
  const header = headerMatch ? headerMatch[1].trim() : "By the end of the lesson, the learner should be able to:";
  return `${header}\na) ${parts[0]}\nb) ${parts[1]}\nc) ${parts[2]}`;
}

/**
 * MASTER GUARDRAIL: Apply ALL validations in sequence.
 */
function validateAndSanitizeRows(
  rawRows: unknown[],
  strand: string,
  subStrandName: string,
  grade: string,
  subject: string,
  weekStart: number,
  lessonsPerWeek: number,
  isSw: boolean,
  officialOutcomes?: string[],
): SchemeRow[] {
  console.log(`Guardrails: processing ${rawRows.length} raw rows...`);
  let rows: SchemeRow[] = rawRows.map(r => normalizeRowKeys(r as Record<string, unknown>));
  rows = enforceStrandNames(rows, strand, subStrandName);
  rows = enforceWeekLessonNumbering(rows, weekStart, lessonsPerWeek);
  rows = rows.map((row) => {
    row = ensureNoEmptyFields(row, grade, subject);
    row.specificLearningOutcome = validateAndFixSLO(row.specificLearningOutcome, isSw);
    row.learningExperiences = validateAndFixExperiences(row.learningExperiences, isSw);
    return row;
  });
  // GUARDRAIL 10: Validate SLOs align with official KICD outcomes
  rows = validateSLOAlignment(rows, officialOutcomes, isSw);
  // GUARDRAIL 11: Validate KSA structure and verb usage
  rows = validateKSAStructure(rows, isSw);
  // GUARDRAIL 12: Replace inappropriate verbs for lower-primary non-language subjects
  const gradeNum = parseInt(grade.replace("Grade ", ""));
  const langSubjects = ["Kiswahili", "English Activities", "English", "Indigenous Language", "Arabic", "French", "German", "Mandarin"];
  if (gradeNum >= 1 && gradeNum <= 3 && !langSubjects.includes(subject)) {
    rows = rows.map((row, idx) => {
      let slo = row.specificLearningOutcome;
      let exp = row.learningExperiences;
      const replacements: [RegExp, string][] = isSw
        ? [
            [/\bkuandika\b/gi, "kuchora"],
            [/\bkusoma\b/gi, "kutazama"],
            [/\bkufupisha\b/gi, "kutaja"],
            [/\bkutunga\b/gi, "kuonyesha"],
            [/\bkufanya shughuli\b/gi, "kushiriki"],
            [/\bkujua kuhusu\b/gi, "kutambua"],
            [/\bkuangalia tu\b/gi, "kuangalia"],
            [/\bkupitia\b/gi, "kuchunguza"],
          ]
        : [
            [/\bwrite\b/gi, "draw"],
            [/\bwriting\b/gi, "drawing"],
            [/\bread\b/gi, "observe"],
            [/\breading\b/gi, "observing"],
            [/\bsummarize\b/gi, "describe"],
            [/\bsummarise\b/gi, "describe"],
            [/\bcompose\b/gi, "show"],
            [/\banalyse\b/gi, "sort"],
            [/\banalyze\b/gi, "sort"],
            [/\bevaluate\b/gi, "show"],
            [/\bsynthesize\b/gi, "group"],
            [/\bhypothesize\b/gi, "suggest"],
            [/\bformulate\b/gi, "suggest"],
            [/\bcompile\b/gi, "collect"],
            [/\bcarry out\b/gi, "practice"],
            [/\bcarrying out\b/gi, "practicing"],
            [/\bfind out\b/gi, "identify"],
            [/\bfinding out\b/gi, "identifying"],
            [/\blearn about\b/gi, "identify"],
            [/\blearning about\b/gi, "identifying"],
            [/\btalk about\b/gi, "describe"],
            [/\btalking about\b/gi, "describing"],
            [/\blook at\b/gi, "observe"],
            [/\blooking at\b/gi, "observing"],
            [/\bgo through\b/gi, "explore"],
            [/\bgoing through\b/gi, "exploring"],
            [/\bget to know\b/gi, "recognize"],
            [/\bgetting to know\b/gi, "recognizing"],
            [/\bdo\b(?=\s+(?:a|an|the|some|simple))/gi, "conduct"],
          ];
      let changed = false;
      for (const [pattern, replacement] of replacements) {
        if (pattern.test(slo)) { slo = slo.replace(pattern, replacement); changed = true; }
        if (pattern.test(exp)) { exp = exp.replace(pattern, replacement); changed = true; }
      }
      if (changed) {
        console.warn(`Guardrail 12: Lesson ${idx + 1} — replaced inappropriate verbs for ${grade} ${subject}`);
      }
      return { ...row, specificLearningOutcome: slo, learningExperiences: exp };
    });
  }
  // Guardrail: deduplicate by SLO content but only if we'd still have enough rows
  const seen = new Set<string>();
  const deduped = rows.filter((row) => {
    const key = row.specificLearningOutcome.substring(0, 100);
    if (seen.has(key)) {
      console.warn(`Guardrails: found duplicate row, removing`);
      return false;
    }
    seen.add(key);
    return true;
  });
  const final = enforceWeekLessonNumbering(deduped, weekStart, lessonsPerWeek);
  console.log(`Guardrails: ${final.length} rows passed validation (from ${rawRows.length} raw)`);
  return final;
}

const MAX_LESSONS_PER_BATCH = 5;

async function generateBatch(
  _apiKey: string,
  grade: string,
  subject: string,
  strand: string,
  subStrand: SubStrandInfo,
  batchLessons: number,
  context: string,
  isSw: boolean,
  weekStart: number,
  lessonsPerWeek: number,
  batchIndex: number,
  indigenousLanguage?: string,
  additionalInfo?: string,
): Promise<SchemeRow[]> {
  const subStrandName = subStrand.name;
  const totalLessons = subStrand.lessons;

  // Build official KICD context block
  let officialContext = "";
  if (subStrand.learningOutcomes?.length) {
    officialContext += `\n\nOFFICIAL KICD LEARNING OUTCOMES for "${subStrandName}":\n`;
    subStrand.learningOutcomes.forEach((o, i) => {
      officialContext += `  ${String.fromCharCode(97 + i)}) ${o}\n`;
    });
  }
  if (subStrand.keyInquiryQuestion) {
    officialContext += `\nOFFICIAL KEY INQUIRY QUESTION: "${subStrand.keyInquiryQuestion}"\n`;
  }
  if (subStrand.suggestedExperiences?.length) {
    officialContext += `\nOFFICIAL SUGGESTED LEARNING EXPERIENCES:\n`;
    subStrand.suggestedExperiences.forEach(e => {
      officialContext += `  - ${e}\n`;
    });
  }

  const hasOfficialData = !!officialContext;

  // GUARDRAIL 8: Refuse to generate if sub-strand has no official KICD learning outcomes
  // Exception 1: Kiswahili lower primary uses standardized language-skill sub-strands 
  // (Kusikiliza na Kuzungumza, Kusoma, Kuandika, Sarufi) under thematic Mada — 
  // the Mada name + sub-strand name provide sufficient context for generation.
  // Exception 2: Sub-strands from hardcoded curriculum data (verified KICD strand/sub-strand
  // names and lesson counts) are trusted — the sub-strand name + strand + grade provides
  // sufficient context for the AI to generate accurate CBC-aligned content.
  const isKiswahiliThematic = isSw && ["Kusikiliza na Kuzungumza", "Kusoma", "Kuandika", "Sarufi"].includes(subStrandName);
  const isFromHardcodedCurriculum = subStrand.lessons > 0 && subStrandName.length > 0;
  if (!hasOfficialData && !isKiswahiliThematic && !isFromHardcodedCurriculum) {
    console.error(`No official KICD data for sub-strand "${subStrandName}" in ${grade} ${subject}. Refusing to generate.`);
    throw new Error(`NO_OFFICIAL_DATA: No verified KICD curriculum data available for "${subStrandName}". Cannot generate without official learning outcomes.`);
  }
  
  // For hardcoded curriculum sub-strands without detailed outcomes, inject contextual info
  if (!hasOfficialData && isFromHardcodedCurriculum && !isKiswahiliThematic) {
    officialContext = `\n\nKICD CURRICULUM: ${grade} ${subject}\nStrand: "${strand}"\nSub-strand: "${subStrandName}"\nAllocated lessons: ${totalLessons}\nThis sub-strand is from the official KICD CBC curriculum design. Generate accurate, age-appropriate content aligned with the Kenyan CBC framework for ${grade} learners.\n`;
  }
  
  // For Kiswahili thematic topics, inject the Mada context
  if (isKiswahiliThematic && !hasOfficialData) {
    officialContext = `\n\nKICD MADA (Thematic Topic): "${strand}"\nSub-strand skill area: "${subStrandName}"\nThis is a standard Kiswahili language skill area under the given Mada. Generate age-appropriate content for ${grade} learners practicing "${subStrandName}" within the theme of "${strand}".\n`;
  }

  // Inject indigenous language context if provided
  if (indigenousLanguage && subject === "Indigenous Language") {
    officialContext += `\n\nINDIGENOUS LANGUAGE: ${indigenousLanguage}
All content MUST be contextualized for the ${indigenousLanguage} language. This means:
- Use examples, vocabulary, and cultural references specific to the ${indigenousLanguage}-speaking community
- Reading passages, stories, and dialogues should reflect ${indigenousLanguage} cultural contexts (names, places, traditions, foods, activities)
- Phonics/pronunciation exercises should reference ${indigenousLanguage} sound patterns
- Creative writing and oral exercises should draw from ${indigenousLanguage} proverbs, songs, riddles, and oral traditions
- The learning resources should include ${indigenousLanguage} textbooks, storybooks, and community elders as resource persons
- While the scheme structure follows KICD standards, the CONTENT must feel authentically ${indigenousLanguage}\n`;
  }

  // GUARDRAIL: Grade 1-3 non-language subjects need simpler, age-appropriate verbs
  const gradeNum = parseInt(grade.replace("Grade ", ""));
  const languageSubjects = ["Kiswahili", "English Activities", "English", "Indigenous Language", "Arabic", "French", "German", "Mandarin"];
  const isLanguageSubject = languageSubjects.includes(subject);
  const isLowerPrimary = gradeNum >= 1 && gradeNum <= 3;

  let verbRestrictionEn = "";
  let verbRestrictionSw = "";
  if (isLowerPrimary && !isLanguageSubject) {
    verbRestrictionEn = `
CRITICAL — KSA VERB FRAMEWORK FOR ${grade} ${subject}:
Since this is a non-language subject for lower primary, Lesson Learning Outcomes MUST use verbs from the official CBE Knowledge-Skills-Attitudes (KSA) framework. DO NOT invent informal phrases like "carry out" or "find out about".

KNOWLEDGE (Cognitive) verbs — use for understanding/information outcomes:
  identify, explain, describe, recognize, compare, classify, define, list, name, state, outline, summarize

SKILLS (Psychomotor) verbs — use for practical/hands-on outcomes:
  observe, record, differentiate, use, interpret, suggest, role-play, practice, conduct, demonstrate, participate, sort, measure, express, create, construct

ATTITUDES (Affective) verbs — use for values/dispositions outcomes:
  appreciate, value, show (curiosity/respect/responsibility), commit, prioritize, develop, care, respect, empathize

RULES:
- Each Lesson Learning Outcome MUST start with a proper KSA verb from the lists above.
- NEVER use informal/vague phrases: "carry out", "find out", "look at", "do", "make", "get to know", "learn about", "talk about", "go through".
- NEVER use literacy verbs for non-language subjects: "write", "read", "compose", "draft", "author", "journal".
- NEVER use overly advanced verbs for Grade 1-3: "analyse", "evaluate", "critique", "synthesize", "hypothesize", "infer", "deduce".
- For Grade 1-2, prefer simpler KSA verbs: identify, name, describe, observe, sort, demonstrate, appreciate, show, participate, practice.
- For Grade 3, you may also use: explain, compare, classify, suggest, interpret, value, commit, recognize.
- Lesson Learning Experiences should use activity verbs: observe, explore, collect, sort, group, discuss (orally), sing, role-play, visit, draw, colour, play, share, demonstrate, point to, name, show, participate, practice, measure.
- All activities must be HANDS-ON, CONCRETE, and OBSERVABLE.
`;
    verbRestrictionSw = `
MUHIMU SANA — MFUMO WA VITENZI VYA KSA KWA ${grade} ${subject}:
Hii ni somo lisilo la lugha kwa shule ya chini, kwa hivyo Matokeo ya Ujifunzaji LAZIMA yatumie vitenzi kutoka mfumo rasmi wa CBE wa Maarifa-Ujuzi-Mitazamo (KSA). USITUMIE maneno yasiyo rasmi kama "fanya", "jua kuhusu".

MAARIFA (vitenzi vya kufahamu):
  kutambua, kueleza, kuelezea, kutambua tofauti, kulinganisha, kupanga, kufafanua, kuorodhesha, kutaja, kusema, kufupisha

UJUZI (vitenzi vya vitendo):
  kuangalia, kurekodi, kutofautisha, kutumia, kufasiri, kupendekeza, kucheza jukumu, kufanya mazoezi, kuendesha, kuonyesha, kushiriki, kupanga, kupima, kueleza hisia, kuunda, kujenga

MITAZAMO (vitenzi vya thamani):
  kuthamini, kuthamini thamani, kuonyesha (udadisi/heshima/uwajibikaji), kujitolea, kuweka kipaumbele, kukuza, kutunza, kuheshimu, kuonyesha huruma

KANUNI:
- Kila Tokeo la Ujifunzaji LAZIMA lianze na kitenzi sahihi cha KSA.
- USITUMIE maneno yasiyo rasmi: "fanya shughuli", "jua kuhusu", "angalia tu", "pita".
- USITUMIE vitenzi vya lugha: "kuandika", "kusoma", "kutunga".
- Shughuli lazima ziwe za VITENDO, ZINAZOONEKANA, na ZINAZOSHIKIKA.
`;
  }

  const systemPrompt = isSw
    ? `Wewe ni mtaalamu wa mtaala wa CBC Kenya (KICD). Unatengeneza Mpango wa Kazi rasmi ambao unafuata viwango vya KICD kwa usahihi.

SHARTI MUHIMU: Lazima utumie data rasmi ya KICD iliyotolewa hapa chini PEKEE. USIBUNI, USITENGENEZE, au USIZUSHE matokeo ya kujifunza, majina ya strand, majina ya sub-strand, au maudhui ya mtaala ambayo hayapo katika mfumo wa KICD.

UMAHIRI WA CBC: Kila somo lazima lijeneze UMAHIRI — uwezo wa kutumia mchanganyiko wa Maarifa, Ujuzi, na Mitazamo (KSA) kutekeleza kazi.

STADI MUHIMU ZA CBC (zingatia katika shughuli za kujifunza):
- Mawasiliano na Ushirikiano (k.m., "Kufanya kazi kwa jozi...", "Kujadili katika vikundi...")
- Kufikiri kwa Kina na Utatuzi wa Matatizo (k.m., "Kutafuta suluhisho la...", "Kulinganisha...")
- Ujuzi wa Kidijitali (k.m., "Kutumia simu/kompyuta kutafuta...", "Kutazama video...")
- Ubunifu na Uvumbuzi (k.m., "Kubuni muundo kwa kutumia...", "Kuunda mfano wa...")

MAADILI YA CBC (zingatia katika matokeo ya Mitazamo):
Heshima, Uwajibikaji, Upendo, Umoja, Amani, Uadilifu, Uzalendo, Haki ya Kijamii.

KANUNI MUHIMU:
1. Tengeneza HASA somo ${batchLessons} kwa wanafunzi wa ${grade}.
2. Kila somo liwe FUPI, sahili, na linalofaa umri wa watoto.
3. **MATOKEO MAALUM YANAYOTARAJIWA** — Lazima ianze na "**Kufikia mwisho wa somo mwanafunzi aweze:**" kisha orodhesha matokeo HASA 3 kwa kutumia alama ya dashi (-), kila moja kutoka eneo moja la KSA KWA MPANGILIO HUU:
   - Tokeo la 1 = MAARIFA TU. Lazima lianze na kitenzi cha maarifa: kutambua, kutaja, kuorodhesha, kueleza, kufafanua, kulinganisha, kutofautisha, kuelezea, kubainisha.
     MARUFUKU kwa tokeo la 1: kutekeleza, kutumia, kuonyesha, kufurahia, kuthamini, kuheshimu.
   - Tokeo la 2 = UJUZI TU. Lazima lianze na kitenzi cha ujuzi: kutekeleza, kutumia, kujenga, kuonyesha, kuchora, kuhesabu, kupima, kutatua, kuimba, kushiriki, kufanya mazoezi, kupanga, kucheza jukumu, kuunda.
     MARUFUKU kwa tokeo la 2: kutambua, kutaja, kueleza, kufurahia, kuthamini.
   - Tokeo la 3 = MITAZAMO TU. Lazima lianze na kitenzi cha mitazamo: kufurahia, kuheshimu, kuthamini, kushirikiana, kuzingatia, kuendeleza, kutetea, kujali, kujitolea.
     MARUFUKU kwa tokeo la 3: kutambua, kutaja, kueleza, kutekeleza, kutumia, kuonyesha.
   - HILI HALIWEZI KUBADILISHWA. Kila tokeo LAZIMA liwe katika mpangilio huu.
   - Kila tokeo liwe MAHUSUSI sana na linatokana na data rasmi ya KICD ikiwa imetolewa hapa chini.
   - USIBUNI au UTENGENEZE matokeo ambayo hayapo katika mfumo rasmi wa KICD.
    
4. **MAPENDEKEZO YA SHUGHULI ZA UJIFUNZAJI** — Lazima ianze na "**Mwanafunzi aweze:-**" kisha orodhesha shughuli 3-5 kwa kutumia alama ya dashi (-).
   - Shughuli ziwe MAHUSUSI na ZENYE VITENDO: kutathmini, kujadili, kutazama, kuchora, kuimba, kucheza, kuandika, kusoma, kutatua, kuorodhesha
   - Usiwe na maneno kama "kujifunza" — badala yake tumia shughuli zinazoonekana
   - Tumia mapendekezo rasmi ya KICD yaliyo hapa chini kama chanzo. USIBUNI shughuli mpya zinazozidi mfumo wa KICD.
   - Zingatia mazingira mbalimbali ya kujifunza (shuleni, nje, nyumbani)
    
5. **SWALI DADISI** — Tumia swali rasmi la KICD lililotolewa, au unda swali linalofanana. Swali liwe sahili kwa umri wa mtoto.
6. **MAREJELEO** — Lazima yawe MAHUSUSI na YENYE MAELEZO — si majina ya jumla tu.
    Daima anza na "${getKLBBookTitle(subject, grade)}" kisha ongeza rasilimali 2-4 mahususi zinazohusiana na matokeo ya somo.
7. **TATHMINI** — Njia za kutathmini: "Kuuliza na kujibu maswali, uchunguzi" au ongeza "zoezi la kuandika, evaluation ya kazi, tathmini ya wenzao".
8. **MAONI** — Daima "".
9. Nambari za wiki zianze kutoka ${weekStart}. Wiki moja = masomo ${lessonsPerWeek}. Nambari za somo ZIANZIE UPYA kila wiki: 1, 2, 3... mpaka ${lessonsPerWeek}, kisha rudi 1 kwa wiki inayofuata.
10. Masomo ${totalLessons} yote yawe na mwelekeo wa kuendelea: TAMBULISHA dhana → ZOEZA ujuzi → TUMIA katika muktadha → KAGUA na tathmini.${verbRestrictionSw}${officialContext}

Rudisha JSON array pekee ya vitu ${batchLessons}. Hakuna maandishi mengine.`
    : `You are an expert educational consultant specializing in the Kenyan Competency-Based Curriculum (CBC), aligned with the Ministry of Education and KICD (Kenya Institute of Curriculum Development) standards.

YOUR GOAL: Generate detailed, pedagogically sound Schemes of Work that develop learner COMPETENCY — the ability to apply a combination of Knowledge, Skills, and Attitudes (KSA) to perform a task. Output must be structured for official school records.

CRITICAL CONSTRAINT: You MUST ONLY use the official KICD data provided below. NEVER fabricate, invent, or hallucinate learning outcomes, strand names, sub-strand names, or curriculum content. If no official data is provided for a field, leave it generic but DO NOT make up specific curriculum content that does not exist in the KICD framework.

ABSOLUTE RULE FOR NON-LANGUAGE SUBJECTS (Environmental Activities, Mathematics, CRE, IRE, HRE, Creative Activities, Social Studies, Agriculture, Science & Technology):
- Your lesson learning outcomes MUST be DIRECTLY DERIVED from the official KICD learning outcomes listed below. Do NOT invent new outcomes or add concepts not in the KICD design.
- For example, if the KICD outcomes for "Heat" say "list sources of heat", "identify uses of heat", "carry out activities to conserve heat" — you MUST NOT add content about "measuring temperature with a thermometer", "conducting experiments", or ANY concept not explicitly stated in the official outcomes.
- Each lesson's SLOs must be a SUBSET or RESTATEMENT of the official KICD outcomes — never an expansion or invention.
- The learning experiences must ONLY use the KICD suggested experiences listed below. You may rephrase them but NEVER invent new activities that go beyond what the KICD design prescribes.

ENGLISH LANGUAGE ACTIVITIES — LETTER SOUND ALLOCATION RULE:
- For sub-strands involving letter sounds (e.g., "Pronunciation and Vocabulary", "Word Reading", "Fluency"), each lesson MUST focus on ONE specific letter or letter-sound combination.
- Allocate letter sounds sequentially across lessons: Lesson 1 = letter sound 1, Lesson 2 = letter sound 2, etc.
- Never lump multiple letter sounds into one lesson. Each lesson introduces, practises, and assesses ONE sound.
- Example for 60 lessons: s, a, t, i, p, n, e, d, r, m, g, o, c, k, u, l, f, b, h, j, v, w, x, y, z, sh, ch, th, wh, ck, ng, ai, ee, oo, ar, or, etc.

CBC CORE COMPETENCIES (integrate into learning experiences where relevant):
- Communication and Collaboration (e.g., "Work in pairs to...", "Discuss in groups...")
- Critical Thinking and Problem Solving (e.g., "Find a solution for...", "Compare and contrast...")
- Digital Literacy (e.g., "Use a tablet to search for...", "Watch a video clip on...")
- Imagination and Creativity (e.g., "Design a pattern using...", "Make a model of...")
- Learning to Learn (e.g., "Explore different ways to...", "Reflect on what was learned...")
- Citizenship (e.g., "Discuss responsibilities in the community...")
- Self-efficacy (e.g., "Present their work to the class...")

CBC CORE VALUES (weave into Attitudes/Values outcomes):
Respect, Responsibility, Love, Unity, Peace, Integrity, Patriotism, Social Justice.

PERTINENT & CONTEMPORARY ISSUES (PCIs — integrate where naturally relevant):
Life Skills, Health, Environmental Conservation, Safety, Human Rights, Citizenship.

RULES:
1. Generate EXACTLY ${batchLessons} lesson rows for ${grade} learners.
2. Keep everything SIMPLE, age-appropriate, and inclusive of diverse learning needs and environments.
3. **Lesson Learning Outcomes** — EXACTLY 3 outcomes per lesson, strictly one from each KSA domain IN THIS EXACT ORDER. Use the official KICD outcomes below as source material — do NOT invent new ones.
   MANDATORY FORMAT — no other format is acceptable:
   "By the end of the lesson, the learner should be able to:\\na) [Knowledge outcome — MUST start with a Knowledge verb]\\nb) [Skills outcome — MUST start with a Skills verb]\\nc) [Attitudes/Values outcome — MUST start with an Attitudes verb]"

   a) = KNOWLEDGE ONLY (The "What"). The FIRST WORD must be one of these verbs: identify, define, describe, name, outline, state, recognize, explain, list, label, recall, compare, classify, distinguish, illustrate, summarize.
      BANNED from a): practice, demonstrate, draw, create, observe, appreciate, value, show, enjoy, carry out, find out, learn about.

   b) = SKILLS ONLY (The "How"). The FIRST WORD must be one of these verbs: demonstrate, perform, practice, practise, draw, calculate, manipulate, use, construct, sing, measure, sketch, solve, trace, cut, colour, paint, observe, record, sort, conduct, participate, role-play, conserve, create, model, explore.
      BANNED from b): identify, define, describe, name, state, explain, list, appreciate, value, enjoy, know, understand.

   c) = ATTITUDES/VALUES ONLY (The "Value/Belief"). The FIRST WORD must be one of these verbs: appreciate, value, show, care, enjoy, uphold, persist, commit, respect, empathize, prioritize, develop, acknowledge.
      BANNED from c): identify, describe, name, explain, list, practice, demonstrate, draw, create, observe, carry out.

   THIS IS NON-NEGOTIABLE. If a) starts with "practice" or "observe" — THAT IS WRONG. If c) starts with "identify" or "describe" — THAT IS WRONG.
   Every lesson MUST have exactly a), b), c) — one knowledge, one skill, one attitude. No more, no less.
4. **Lesson Learning Experiences**: MUST begin with "Learner is guided to:" followed by EXACTLY 4 lettered activities, one for each domain plus application.
   - a) must relate to the KNOWLEDGE outcome (a) — e.g. if SLO a) says "identify locally available materials used as beddings", then experience a) should be "discuss locally available materials used as beddings"
   - b) must relate to the SKILLS outcome (b) — e.g. if SLO b) says "draw items used as beddings", then experience b) should be "draw items used as beddings" or a hands-on activity
   - c) must be an APPLICATION activity — applying the knowledge and skills in a real-world or practical context
   - d) must relate to the ATTITUDES/VALUES outcome (c) — an activity that develops the desired attitude or value
   MANDATORY FORMAT — no other format is acceptable:
   "Learner is guided to:\\na) [activity mirroring SLO a - knowledge]\\nb) [activity mirroring SLO b - skills]\\nc) [application activity]\\nd) [attitudes/values activity]"
   Use the official suggested experiences below as source material for the activities. Do NOT invent activities beyond what the KICD design provides.
   Activities must account for diverse learning environments and integrate CBC core competencies.
5. **Key Inquiry Question**: Use the official KICD question provided, or create a closely related child-friendly variant per lesson. Must be age-appropriate and trigger thinking (open-ended).
6. **Learning Resources**: MUST be SPECIFIC and DETAILED — not just generic names. Every resource must describe WHAT it contains relevant to the lesson's sub-strand and topic. Examples:
   - Instead of "audio clips" → "audio clips of word pronunciation for fluency practice"
   - Instead of "flash cards" → "flash cards with CVC words featuring target letter-sound combinations"
   - Instead of "charts" → "wall chart showing sources of heat in the environment"
    - Instead of "textbooks" → "${getKLBBookTitle(subject, grade)}, Learner's Book pages [relevant topic]"
    Always include "${getKLBBookTitle(subject, grade)}" as the first resource, then add 2-4 specific contextual resources relevant to the lesson's learning outcomes.
7. **Assessment**: Methods to evaluate learning — "oral questions, observation" or add "written exercise, portfolio, peer assessment" as appropriate. Must match the learning outcome.
8. **Reflection**: always "".
9. Week numbering starts from ${weekStart}. Fit exactly ${lessonsPerWeek} lessons per week. Lesson numbers RESET each week: 1, 2, 3... up to ${lessonsPerWeek}, then back to 1 for the next week. Example: Week 1 has lessons 1,2,3,4,5; Week 2 has lessons 1,2,3,4,5 — NOT lesson 6,7,8.
10. Progress gradually across ${totalLessons} total lessons: INTRODUCE concepts → PRACTISE skills → APPLY in context → REVIEW and assess. Each lesson should build on the previous one.${verbRestrictionEn}${officialContext}

Return ONLY a valid JSON array of ${batchLessons} objects. No other text.`;

  const batchDesc = batchIndex > 0 ? ` (continuing from lesson ${batchIndex * MAX_LESSONS_PER_BATCH + 1} — do NOT repeat any content from previous lessons)` : "";
  const userPrompt = `Generate ${batchLessons} lesson rows for:
- Grade: ${grade}, Subject: ${subject}
- Strand: ${strand}
- Sub-strand: ${subStrandName} (${totalLessons} total lessons, this batch: ${batchLessons})${batchDesc}
${context ? `- Additional Resources: ${context}` : ""}
${additionalInfo ? `- Additional Teacher Notes/Context: ${additionalInfo}` : ""}

CRITICAL: Every lesson MUST be unique. Do NOT repeat learning outcomes, experiences, or content from any other lesson. Do NOT create "continued practice" or "revision" lessons — each lesson must introduce NEW content or a NEW skill progression.

Each row: week, lesson, strand, subStrand, specificLearningOutcome, keyInquiryQuestion, learningExperiences, learningResources, assessmentMethods, reflection.
The "strand" field = "${strand}", the "subStrand" field = "${subStrandName}".
Start week numbering from ${weekStart}.

Return ONLY a JSON array of exactly ${batchLessons} objects.`;

  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error(`AI error for ${subStrandName} batch ${batchIndex}:`, aiResponse.status, errorText);
    if (aiResponse.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(`AI generation failed for ${subStrandName} batch ${batchIndex}`);
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error(`AI returned empty response for ${subStrandName} batch ${batchIndex}`);

  const rows = extractJsonArray(rawContent);
  console.log(`Batch ${batchIndex}: generated ${rows.length} rows for ${subStrandName} (expected ${batchLessons})${hasOfficialData ? ' [with official KICD context]' : ''}`);
  return rows;
}

async function generateForSubStrand(
  _apiKey: string,
  grade: string,
  subject: string,
  strand: string,
  subStrand: SubStrandInfo,
  context: string,
  isSw: boolean,
  weekStart: number,
  lessonsPerWeek: number,
  indigenousLanguage?: string,
  additionalInfo?: string,
): Promise<{ rows: SchemeRow[]; weeksUsed: number }> {
  const allRows: SchemeRow[] = [];
  let remaining = subStrand.lessons;
  let batchIndex = 0;
  let currentWeek = weekStart;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, MAX_LESSONS_PER_BATCH);
    let rows: SchemeRow[] | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!rows && attempts < maxAttempts) {
      attempts++;
      try {
          rows = await generateBatch(
           _apiKey, grade, subject, strand, subStrand,
          batchSize, context, isSw, currentWeek, lessonsPerWeek, batchIndex, indigenousLanguage, additionalInfo
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown";
        if (msg === "RATE_LIMIT") throw e; // Don't retry rate limits
        if (msg.startsWith("NO_OFFICIAL_DATA:")) throw e; // Don't retry missing data
        if (attempts >= maxAttempts) throw e;
        // Brief pause before retry
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (rows) {
      allRows.push(...rows);
    }
    remaining -= batchSize;
    batchIndex++;
  }

  // MASTER GUARDRAIL: validate & sanitize all rows
  const fixedRows = validateAndSanitizeRows(allRows, strand, subStrand.name, grade, subject, weekStart, lessonsPerWeek, isSw, subStrand.learningOutcomes);

  // GUARDRAIL 9: Enforce exact lesson count
  const finalRows = enforceLessonCount(fixedRows, subStrand.lessons, weekStart, lessonsPerWeek);
  console.log(`Sub-strand "${subStrand.name}": expected ${subStrand.lessons} lessons, delivering ${finalRows.length}`);

  const totalWeeks = Math.ceil(finalRows.length / lessonsPerWeek);
  return { rows: finalRows, weeksUsed: totalWeeks };
}

// Fetch reference schemes from database to enhance AI context
async function fetchReferenceContext(grade: string, subject: string, strand: string): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return "";

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search for matching references by grade and subject
    const { data: refs } = await supabase
      .from("scheme_references")
      .select("title, description, content_snippet, source_site")
      .or(`grade.ilike.%${grade}%,subject.ilike.%${subject}%`)
      .limit(5);

    if (!refs || refs.length === 0) return "";

    let refContext = "\n\nREFERENCE SCHEMES FROM PROFESSIONAL SOURCES (use as inspiration for tone, structure, and content depth):\n";
    for (const ref of refs) {
      refContext += `\n--- From ${ref.source_site} ---\n`;
      if (ref.title) refContext += `Title: ${ref.title}\n`;
      if (ref.description) refContext += `Description: ${ref.description}\n`;
      if (ref.content_snippet) refContext += `Content: ${ref.content_snippet.slice(0, 500)}\n`;
    }
    return refContext;
  } catch (e) {
    console.error("Error fetching reference context:", e);
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, subject, strand, context, additionalInfo, subStrands, lessonsPerWeek = 5, indigenousLanguage, weeklyMode, weekNumber, term, weeklyPlan, termMode, termPlan, madaCycleMode } = await req.json();

    if (!grade || !subject) {
      return new Response(
        JSON.stringify({ error: "Grade and subject are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSw = kiswahiliSubjects.includes(subject);

    // ── WEEKLY MODE: Generate all skill strands for a single week ──
    if (weeklyMode && weeklyPlan && Array.isArray(weeklyPlan)) {
      console.log(`Weekly mode: ${grade} ${subject} - ${term} Week ${weekNumber} (${weeklyPlan.length} strands)`);

      const allRows: SchemeRow[] = [];
      let lessonCounter = 1;

      for (const plan of weeklyPlan as { strandName: string; subStrandName: string; lessons: number; learningOutcomes?: string[]; suggestedExperiences?: string[]; keyInquiryQuestion?: string }[]) {
        const subStrandInfo: SubStrandInfo = {
          name: plan.subStrandName,
          lessons: plan.lessons,
          learningOutcomes: plan.learningOutcomes,
          suggestedExperiences: plan.suggestedExperiences,
          keyInquiryQuestion: plan.keyInquiryQuestion,
        };

        try {
          const rows = await generateBatch(
            GROQ_API_KEY, grade, subject, plan.strandName, subStrandInfo,
            plan.lessons, context || "", isSw, weekNumber || 1, lessonsPerWeek, 0, indigenousLanguage, additionalInfo
          );

          // Normalize and fix each row
          const processed = rows.map((r: unknown) => {
            const row = normalizeRowKeys(r as Record<string, unknown>);
            row.week = weekNumber || 1;
            row.lesson = lessonCounter++;
            row.strand = plan.strandName;
            row.subStrand = plan.subStrandName;
            const filled = ensureNoEmptyFields(row, grade, subject);
            filled.specificLearningOutcome = validateAndFixSLO(filled.specificLearningOutcome, isSw);
            filled.learningExperiences = validateAndFixExperiences(filled.learningExperiences, isSw);
            return filled;
          });

          allRows.push(...processed);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown";
          console.error(`Error generating ${plan.strandName}: ${msg}`);
          if (msg === "RATE_LIMIT") {
            if (allRows.length > 0) {
              return new Response(
                JSON.stringify({ rows: allRows, source: "hardcoded_context", partial: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      if (allRows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Failed to generate any lesson rows. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Weekly mode: generated ${allRows.length} total lesson rows for Week ${weekNumber}`);
      return new Response(
        JSON.stringify({ rows: allRows, source: "hardcoded_context" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── TERM MODE: Generate full term scheme ──
    if (termMode && termPlan && Array.isArray(termPlan)) {
      const totalSubStrands = (termPlan as { strandName: string; subStrands: SubStrandInfo[] }[])
        .reduce((sum, s) => sum + s.subStrands.length, 0);
      const totalLessons = (termPlan as { strandName: string; subStrands: SubStrandInfo[] }[])
        .reduce((sum, s) => sum + s.subStrands.reduce((ss, sub) => ss + sub.lessons, 0), 0);
      console.log(`Term mode${madaCycleMode ? ' (Mada cycle)' : ''}: ${grade} ${subject} - ${term} (${totalSubStrands} sub-strands, ${totalLessons} total lessons)`);

      const referenceContext = await fetchReferenceContext(grade, subject, "");

      const allRows: SchemeRow[] = [];
      let currentWeek = 1;

      for (const strandPlan of termPlan as { strandName: string; subStrands: SubStrandInfo[] }[]) {
        if (madaCycleMode) {
          // ── MADA CYCLE MODE: Generate all sub-strands for this Mada, then interleave ──
          // Each sub-strand generates its lessons separately, then we weave them into weeks
          // Week 1: lesson 1 from each sub-strand, Week 2: lesson 2 from each, etc.
          const subStrandRows: SchemeRow[][] = [];
          const lessonsPerSS = strandPlan.subStrands[0]?.lessons || 3;

          for (const ss of strandPlan.subStrands) {
            try {
              const enrichedContext = (context || "") + referenceContext;
              const { rows } = await generateForSubStrand(
                GROQ_API_KEY, grade, subject, strandPlan.strandName, ss,
                enrichedContext, isSw, 1, ss.lessons, indigenousLanguage, additionalInfo
              );
              subStrandRows.push(rows);
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Unknown";
              console.error(`Error generating ${strandPlan.strandName}/${ss.name}: ${msg}`);
              if (msg === "RATE_LIMIT" && allRows.length > 0) {
                return new Response(
                  JSON.stringify({ rows: allRows, source: "hardcoded_context", partial: true }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
              if (msg === "RATE_LIMIT") {
                return new Response(
                  JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
                  { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          }

          // Interleave: for each lesson index, pick one row from each sub-strand
          for (let lessonIdx = 0; lessonIdx < lessonsPerSS; lessonIdx++) {
            for (const ssRows of subStrandRows) {
              if (lessonIdx < ssRows.length) {
                const row = { ...ssRows[lessonIdx] };
                allRows.push(row);
              }
            }
          }

          // Re-number the interleaved rows for this Mada
          const madaRowCount = subStrandRows.reduce((sum, r) => sum + Math.min(r.length, lessonsPerSS), 0);
          const madaStart = allRows.length - madaRowCount;
          let weekLesson = 1;
          for (let i = madaStart; i < allRows.length; i++) {
            allRows[i].week = currentWeek;
            allRows[i].lesson = weekLesson;
            weekLesson++;
            if (weekLesson > lessonsPerWeek) {
              weekLesson = 1;
              currentWeek++;
            }
          }
          if (weekLesson > 1) currentWeek++; // Move to next week if partial

        } else {
          // ── STANDARD TERM MODE: sequential sub-strand generation ──
          for (const ss of strandPlan.subStrands) {
            try {
              const enrichedContext = (context || "") + referenceContext;
              const { rows, weeksUsed } = await generateForSubStrand(
                GROQ_API_KEY, grade, subject, strandPlan.strandName, ss,
                enrichedContext, isSw, currentWeek, lessonsPerWeek, indigenousLanguage, additionalInfo
              );
              allRows.push(...rows);
              currentWeek += weeksUsed;
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Unknown";
              console.error(`Error generating ${strandPlan.strandName}/${ss.name}: ${msg}`);
              if (msg === "RATE_LIMIT") {
                if (allRows.length > 0) {
                  console.warn(`Rate limited after ${allRows.length} rows, returning partial results`);
                  return new Response(
                    JSON.stringify({ rows: allRows, source: "hardcoded_context", partial: true }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                  );
                }
                return new Response(
                  JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
                  { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }
          }
        }
      }

      if (allRows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Failed to generate any lesson rows. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Term mode: generated ${allRows.length} total lesson rows for ${term}`);
      return new Response(
        JSON.stringify({ rows: allRows, source: "hardcoded_context" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── STANDARD MODE ──
    if (!strand) {
      return new Response(
        JSON.stringify({ error: "Strand is required for non-language subjects" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch reference context from scraped schemes
    const referenceContext = await fetchReferenceContext(grade, subject, strand);

    // If we have sub-strands, generate per sub-strand to avoid truncation
    if (subStrands && Array.isArray(subStrands) && subStrands.length > 0) {
      const totalLessons = (subStrands as SubStrandInfo[]).reduce((sum, ss) => sum + ss.lessons, 0);
      console.log(`Generating scheme for ${grade} ${subject} - ${strand} (${totalLessons} total lessons across ${subStrands.length} sub-strands, generating per sub-strand)`);

      const allRows: SchemeRow[] = [];
      let currentWeek = 1;

      for (const ss of subStrands as SubStrandInfo[]) {
        try {
            const enrichedContext = (context || "") + referenceContext;
            const { rows, weeksUsed } = await generateForSubStrand(
              GROQ_API_KEY, grade, subject, strand, ss, enrichedContext, isSw, currentWeek, lessonsPerWeek, indigenousLanguage, additionalInfo
            );
          allRows.push(...rows);
          currentWeek += weeksUsed;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          if (msg === "RATE_LIMIT") {
            // Return what we have so far
            if (allRows.length > 0) {
              console.warn(`Rate limited after ${allRows.length} rows, returning partial results`);
              return new Response(
                JSON.stringify({ rows: allRows, source: "hardcoded_context", partial: true }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (msg.startsWith("NO_OFFICIAL_DATA:")) {
            return new Response(
              JSON.stringify({ error: msg.replace("NO_OFFICIAL_DATA: ", "") }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          console.error(`Error generating ${ss.name}: ${msg}`);
        }
      }

      if (allRows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Failed to generate any lesson rows. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Generated ${allRows.length} total lesson rows across all sub-strands`);

      return new Response(
        JSON.stringify({ rows: allRows, source: "hardcoded_context" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GUARDRAIL 7: NEVER generate without official curriculum data.
    // If we reach here, it means no hardcoded sub-strand data exists for this subject/strand.
    console.error(`No official curriculum data available for ${grade} ${subject} - ${strand}. Refusing to generate.`);
    return new Response(
      JSON.stringify({ 
        error: `We don't have verified KICD curriculum data for "${subject}" (${grade}) yet. Generation is only available for subjects with official curriculum data to ensure accuracy. Please select a different subject or check back later.` 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-scheme error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
