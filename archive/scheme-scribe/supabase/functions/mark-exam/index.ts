const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnswerItem {
  index: number;
  type: "short" | "long";
  question: string;
  expectedAnswer?: string;
  acceptableKeywords?: string[];
  rubric?: string;
  marks: number;
  studentAnswer: string;
}

const MARK_TOOL = {
  type: "function",
  function: {
    name: "submit_marks",
    description: "Submit marks for the answers.",
    parameters: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "number" },
              awarded: { type: "number" },
              feedback: { type: "string" },
            },
            required: ["index", "awarded", "feedback"],
            additionalProperties: false,
          },
        },
      },
      required: ["results"],
      additionalProperties: false,
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, grade, subject } = (await req.json()) as {
      items: AnswerItem[];
      grade: string;
      subject: string;
    };

    if (!items?.length) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a fair, encouraging KICD CBC examiner marking ${grade} ${subject} answers.

═══ MARKING PHILOSOPHY (CRITICAL) ═══
You are marking 7-8 year-old pupils. Mark for UNDERSTANDING, not for exact wording.
- ACCEPT any answer that demonstrates the correct concept, even if the words differ from the model answer.
- ACCEPT synonyms and child-language equivalents:
    • "Mum / Mummy / Mama" = "Mother"
    • "Dad / Daddy / Baba" = "Father"
    • "Cooking / Mopping / Fetching water / Washing clothes" all count as "chores at home"
    • "Praying / Singing in church" both count as "worship"
- ACCEPT minor spelling and grammar errors.
- ACCEPT partial answers proportionally: if a question asks for TWO items and the pupil gives ONE correct item, award HALF the marks (rounded up).
- For factual questions with ONE objectively correct answer (e.g. "How many books in the Old Testament?" → 39), only that number (or its written form "thirty-nine") is correct.
- If the student answer is empty or completely off-topic, award 0 with kind feedback.

═══ MARKING STEPS PER ITEM ═══
For each item:
1. Read the question, the expectedAnswer (model answer) and any acceptableKeywords.
2. Read the studentAnswer.
3. Decide what CONCEPT(S) the question is testing.
4. Check if the studentAnswer demonstrates that concept (using the lenient rules above).
5. Award integer marks 0..maxMarks. For SHORT (2-mark) questions, award 0, 1 or 2.
6. Give ONE short encouraging feedback line (max 20 words). If awarding less than full marks, briefly say what was missing.

Return ONLY via the submit_marks tool.`;

    const userPayload = items
      .map(
        (it) => `Q${it.index} [${it.type}] (max ${it.marks} marks):
Question: ${it.question}
${it.type === "short" ? `Model answer: ${it.expectedAnswer || "(none)"}` : `Rubric: ${it.rubric || "(none)"}`}
${it.acceptableKeywords?.length ? `Acceptable keywords: ${it.acceptableKeywords.join(", ")}` : ""}
Student answer: ${it.studentAnswer || "(no answer)"}
`
      )
      .join("\n---\n");

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
            { role: "user", content: userPayload },
          ],
          tools: [MARK_TOOL],
          tool_choice: { type: "function", function: { name: "submit_marks" } },
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

    return new Response(JSON.stringify({ results: args.results || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mark-exam error:", e);
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
