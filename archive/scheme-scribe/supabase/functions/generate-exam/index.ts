const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SubStrandInfo {
  name: string;
  lessons: number;
  learningOutcomes?: string[];
  keyInquiryQuestion?: string;
}

interface StrandAllocation {
  strandName: string;
  subStrands: SubStrandInfo[];
}

interface MCQ {
  type: "mcq";
  strand: string;
  subStrand: string;
  question: string;
  options: string[];
  answerIndex: number;
  marks: number;
}
interface ShortQ {
  type: "short";
  strand: string;
  subStrand: string;
  question: string;
  expectedAnswer: string;
  acceptableKeywords: string[];
  marks: number;
}
interface LongQ {
  type: "long";
  strand: string;
  subStrand: string;
  question: string;
  rubric: string;
  marks: number;
}

type ExamQuestion = MCQ | ShortQ | LongQ;

const KISWAHILI = "Kiswahili";

function buildSystemPrompt(
  grade: string,
  subject: string,
  term: string,
  allocation: StrandAllocation[],
  counts: { mcq: number; short: number; long: number }
): string {
  const isSw = subject === KISWAHILI;
  const lang = isSw ? "Kiswahili" : "English";

  const scopeBlock = allocation
    .map((s) => {
      const subs = s.subStrands
        .map(
          (ss) =>
            `    - ${ss.name} (lessons: ${ss.lessons})${
              ss.learningOutcomes?.length
                ? `\n      Outcomes: ${ss.learningOutcomes.slice(0, 4).join("; ")}`
                : ""
            }`
        )
        .join("\n");
      return `  • ${s.strandName}\n${subs}`;
    })
    .join("\n");

  return `You are a senior KICD CBC assessment writer for ${grade} ${subject}, ${term}.
Generate an end-of-term exam in ${lang}.

═══ NON-NEGOTIABLE SCOPE RULE ═══
You MUST ONLY ask questions on the strands and sub-strands listed below.
Do NOT introduce ANY topic, concept, vocabulary or skill that is not in this list.
Do NOT use content from previous or future terms.
If a sub-strand is not listed, it is OUT OF SCOPE — ignore it completely.

IN-SCOPE CONTENT FOR ${term}:
${scopeBlock}

═══ EXAM STRUCTURE (STRICT) ═══
- ${counts.mcq} multiple-choice questions (Section A) — exactly 4 options each, ONE correct answer, 1 mark each
- ${counts.short} short-answer questions (Section B) — one-line answer, 2 marks each
- ${counts.long} long/structured questions (Section C) — 5 marks each, requires explanation

═══ DIFFICULTY (Grade 2 appropriate) ═══
- Use simple, age-appropriate ${lang} vocabulary
- Questions must be answerable by a 7-8 year old
- No trick questions, no double negatives
- For Mathematics: keep numbers within the term's taught range

═══ DISTRIBUTION RULE ═══
- Distribute questions across sub-strands PROPORTIONALLY to "lessons" count
- A sub-strand with 6 lessons gets ~2x the questions of one with 3 lessons
- Every listed sub-strand MUST get at least one question if total questions allow

═══ ANSWER QUALITY (MANDATORY — NEVER OMIT) ═══
EVERY question MUST include its answer. Questions without answers will be REJECTED.

- MCQ (type="mcq"): MUST include
    • options: array of EXACTLY 4 strings
    • answerIndex: integer 0, 1, 2, or 3 — the index of the ONE correct option
    • The correct option MUST actually be correct and present in options[]
    • Do NOT leave answerIndex blank, null, or missing under any circumstance

- Short (type="short"): MUST include
    • expectedAnswer: the REAL CONTENT a pupil should write — NOT a restatement of the question
        ◦ The question asks WHAT to do; expectedAnswer is the ACTUAL THING that does it.
        ◦ BAD examples (NEVER do this):
            – Q: "Name four members of your family." → expectedAnswer: "Name four family members." ❌
            – Q: "List three colours of the Kenyan flag." → expectedAnswer: "Three colours of the flag." ❌
            – Q: "Write the number after 9." → expectedAnswer: "The number after 9." ❌
        ◦ GOOD examples (DO THIS):
            – Q: "Name four members of your family." → expectedAnswer: "Father, Mother, Brother, Sister" ✅
            – Q: "List three colours of the Kenyan flag." → expectedAnswer: "Black, Red, Green" ✅
            – Q: "Write the number after 9." → expectedAnswer: "10" ✅
    • acceptableKeywords: 2-5 lowercase keywords from the actual answer content (not from the question)

- Long (type="long"): MUST include
    • rubric: concrete marking guide that names the SPECIFIC points/items/steps a pupil must mention to earn full marks. Do NOT write a vague rubric like "award marks if the answer is good".

Self-check before submitting:
- For every MCQ confirm answerIndex is a number 0-3.
- For every short question confirm expectedAnswer contains the ACTUAL ANSWER (names, numbers, facts) — NOT a paraphrase of the question.
- For every long question confirm rubric lists specific expected content.

═══ NO REPETITION / NO VAGUENESS (CRITICAL) ═══
- Do NOT repeat the same question, even with reworded phrasing.
- Do NOT repeat the same numerical example, the same names, or the same scenario across questions.
- Do NOT produce two MCQs that test the exact same fact (e.g. "What is 2+3?" and "Add 2 and 3").
- Vary the numbers, names, contexts and verbs used across the paper.
- Every question MUST be SPECIFIC and SELF-CONTAINED:
    • BAD: "Write a number." / "Say something about animals." / "Give an example."
    • GOOD: "Write the number that comes after 47." / "Name one domestic animal that gives us milk."
- Avoid vague stems like "Discuss…", "Talk about…", "Explain something…" without a concrete focus.
- Each question must have ONE clear, unambiguous correct answer (or for long answers, a clearly bounded expected response).
- Do NOT duplicate options inside an MCQ. All 4 options must be distinct.
- Spread questions across DIFFERENT sub-strands; do not cluster many questions on the same sub-strand unless its lesson count clearly demands it.

═══ TEXT-ONLY EXAM (CRITICAL — NO PRACTICAL TASKS) ═══
This exam is delivered and auto-marked as TEXT on a screen. The pupil can ONLY type/select an answer.
You MUST NOT generate any question that requires:
  • Drawing, sketching, colouring, shading, or tracing ("Draw the sun…", "Colour the flag…", "Shade half of…")
  • Cutting, pasting, folding, modelling, or any physical craft
  • Singing, reciting aloud, role-play, dancing, or any performance
  • Pointing at, touching, or matching pictures/objects on paper
  • Measuring real objects, observing the weather outside, or any field activity
  • Using a physical ruler, abacus, counters, beads, or any classroom material
  • Group work, pair work, asking a partner, or interviewing someone
  • Looking at a picture/diagram/map (you cannot include images)
If the curriculum sub-strand is fundamentally practical (e.g. "Drawing", "Singing", "Modelling"), assess the
underlying KNOWLEDGE in writing instead — e.g. "Name two colours used to draw the sun." NOT "Draw the sun."

═══ UNAMBIGUOUS MCQs (CRITICAL) ═══
Every MCQ must have EXACTLY ONE option that is correct and THREE options that are clearly, factually wrong.
- Distractors must NOT be "also technically true" or "sometimes true" answers.
- BAD (two valid answers): "What do you see in the sky at night?" → Sun / Clouds / Moon and stars / Birds
   (Clouds CAN be seen at night, so this has two correct answers.)
- GOOD: "Which of these gives light at night?" → Sun / Moon / Table / Chair  (only Moon is correct)
- BAD (subjective): "Which is the best fruit?"  → no objective answer.
- GOOD (objective): "Which of these is a fruit?" → Mango / Carrot / Onion / Cabbage
- Before finalising each MCQ, mentally check each of the 4 options and confirm 3 of them are DEFINITELY wrong.
- If you cannot make 3 clearly-wrong distractors, REWRITE the question — do not ship an ambiguous MCQ.

═══ STRAND/SUB-STRAND LABELS (EXACT) ═══
- The "strand" field MUST be copied EXACTLY as listed above (including leading numbering like "1.0 Numbers").
- The "subStrand" field MUST be copied EXACTLY as listed above (including numbering like "1.4 Subtraction").
- Do NOT shorten, rename, translate or invent labels.

Return ONLY via the submit_exam tool. No prose, no markdown.`;
}

const QUESTION_TOOL = {
  type: "function",
  function: {
    name: "submit_exam",
    description: "Submit the generated exam paper.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["mcq", "short", "long"] },
              strand: { type: "string" },
              subStrand: { type: "string" },
              question: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              answerIndex: { type: "number" },
              expectedAnswer: { type: "string" },
              acceptableKeywords: { type: "array", items: { type: "string" } },
              rubric: { type: "string" },
              marks: { type: "number" },
            },
            required: ["type", "strand", "subStrand", "question", "marks"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },
} as const;

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/^[\d.\s]+/, "") // strip leading "1.2 " numbering
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function validateScope(
  questions: ExamQuestion[],
  allocation: StrandAllocation[]
): ExamQuestion[] {
  const strandMap = new Map<string, string>();
  const subStrandMap = new Map<string, string>();
  for (const a of allocation) {
    strandMap.set(normalize(a.strandName), a.strandName);
    for (const ss of a.subStrands) {
      subStrandMap.set(normalize(ss.name), ss.name);
    }
  }

  const result: ExamQuestion[] = [];
  for (const q of questions) {
    const strandKey = normalize(q.strand);
    const subKey = normalize(q.subStrand);
    // Allow substring match in either direction so "Subtraction" matches "1.4 Subtraction"
    let matchedStrand: string | undefined = strandMap.get(strandKey);
    if (!matchedStrand) {
      for (const [k, v] of strandMap) {
        if (k.includes(strandKey) || strandKey.includes(k)) {
          matchedStrand = v;
          break;
        }
      }
    }
    let matchedSub: string | undefined = subStrandMap.get(subKey);
    if (!matchedSub) {
      for (const [k, v] of subStrandMap) {
        if (k.includes(subKey) || subKey.includes(k)) {
          matchedSub = v;
          break;
        }
      }
    }
    if (matchedStrand && matchedSub) {
      // Block practical/non-text tasks that cannot be auto-marked on screen
      const practicalRegex = /\b(draw|sketch|colou?r in|colou?r the|shade|trace|cut out|paste|fold|model|sing|recite|act out|role[- ]?play|dance|point at|point to|touch the|match the picture|measure (?:the|your)|observe (?:the )?weather|use (?:a|your) ruler|use (?:an )?abacus|use counters?|use beads?|ask (?:your|a) (?:partner|friend|parent)|interview)\b/i;
      if (practicalRegex.test(q.question)) {
        console.warn(`Dropped practical Q: "${q.question}"`);
        continue;
      }
      // Enforce answer completeness per type
      if (q.type === "mcq") {
        const opts = (q as MCQ).options;
        const idx = (q as MCQ).answerIndex;
        if (
          !Array.isArray(opts) ||
          opts.length !== 4 ||
          typeof idx !== "number" ||
          idx < 0 ||
          idx > 3
        ) {
          console.warn(`Dropped MCQ (missing/invalid answerIndex): "${q.question}"`);
          continue;
        }
      } else if (q.type === "short") {
        const ans = (q as ShortQ).expectedAnswer?.trim() || "";
        if (!ans) {
          console.warn(`Dropped short (no expectedAnswer): "${q.question}"`);
          continue;
        }
        // Detect "echo" answers — where the answer just restates the question
        const qNorm = normalize(q.question);
        const aNorm = normalize(ans);
        const qWords = new Set(qNorm.split(" ").filter((w) => w.length > 3));
        const aWords = aNorm.split(" ").filter((w) => w.length > 3);
        const overlap = aWords.filter((w) => qWords.has(w)).length;
        const overlapRatio = aWords.length ? overlap / aWords.length : 0;
        // If the answer is short AND >70% of its meaningful words come from the question,
        // it's almost certainly an echo (e.g. Q "Name four members of your family" → A "Name four family members")
        if (aWords.length <= 6 && overlapRatio >= 0.7) {
          console.warn(
            `Dropped echo answer — Q: "${q.question}" | A: "${ans}"`
          );
          continue;
        }
      } else if (q.type === "long") {
        if (!(q as LongQ).rubric?.trim()) {
          console.warn(`Dropped long (no rubric): "${q.question}"`);
          continue;
        }
      }
      result.push({ ...q, strand: matchedStrand, subStrand: matchedSub });
    } else {
      console.warn(
        `Dropped Q — strand="${q.strand}" sub="${q.subStrand}" (no match)`
      );
    }
  }
  // De-duplicate near-identical questions
  const seen = new Set<string>();
  const deduped: ExamQuestion[] = [];
  for (const q of result) {
    const fingerprint = normalize(q.question).replace(/\s+/g, " ").slice(0, 80);
    if (seen.has(fingerprint)) {
      console.warn(`Dropped duplicate Q: "${q.question}"`);
      continue;
    }
    seen.add(fingerprint);
    deduped.push(q);
  }
  return deduped;
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      grade,
      subject,
      term,
      allocation,
      counts = { mcq: 15, short: 8, long: 2 },
      forceRefresh = false,
    } = body as {
      grade: string;
      subject: string;
      term: string;
      allocation: StrandAllocation[];
      counts?: { mcq: number; short: number; long: number };
      forceRefresh?: boolean;
    };

    if (!grade || !subject || !term || !allocation?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Cache lookup: reuse existing exam for (grade, subject, term) ──
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!forceRefresh) {
      const { data: cached } = await admin
        .from("exams")
        .select("id, questions")
        .eq("grade", grade)
        .eq("subject", subject)
        .eq("term", term)
        .maybeSingle();
      if (cached?.questions?.length) {
        console.log(`Cache hit for ${grade}/${subject}/${term}`);
        return new Response(
          JSON.stringify({
            examId: cached.id,
            questions: cached.questions,
            cached: true,
            meta: { grade, subject, term, total: cached.questions.length },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Identify caller (teacher) for created_by
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const createdBy = userData?.user?.id;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = buildSystemPrompt(
      grade,
      subject,
      term,
      allocation,
      counts
    );

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate the ${grade} ${subject} ${term} exam now. Stay strictly in-scope.`,
            },
          ],
          tools: [QUESTION_TOOL],
          tool_choice: { type: "function", function: { name: "submit_exam" } },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in Workspace settings.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw new Error(`AI gateway: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned");

    const args = JSON.parse(toolCall.function.arguments);
    let questions: ExamQuestion[] = args.questions || [];

    // Scope guardrail
    const before = questions.length;
    questions = validateScope(questions, allocation);
    if (questions.length < before) {
      console.warn(
        `Filtered out ${before - questions.length} out-of-scope questions`
      );
    }

    // Persist to cache so future pupils on any device get the same paper
    let examId: string | null = null;
    if (createdBy && questions.length) {
      const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
      const { data: upserted, error: upsertErr } = await admin
        .from("exams")
        .upsert(
          {
            created_by: createdBy,
            grade,
            subject,
            term,
            questions,
            total_marks: totalMarks,
          },
          { onConflict: "grade,subject,term" }
        )
        .select("id")
        .single();
      if (upsertErr) console.error("Cache write failed:", upsertErr);
      else examId = upserted?.id ?? null;
    }

    return new Response(
      JSON.stringify({
        examId,
        questions,
        cached: false,
        meta: { grade, subject, term, total: questions.length },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-exam error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
