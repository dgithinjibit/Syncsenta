const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { grade, subject, strand, subStrand, slo, learningExperiences, keyInquiryQuestion, learningResources, term, additionalNotes } = await req.json();

    if (!grade || !subject || !strand || !subStrand) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a KICD Kenya CBC curriculum expert. Generate a detailed, practical lesson plan for a Kenyan teacher.

CONTEXT:
- Grade: ${grade}
- Subject: ${subject}
- Strand: ${strand}
- Sub-Strand: ${subStrand}
- Term: ${term || "Not specified"}
- Specific Learning Outcomes from Scheme: ${slo || "Not provided"}
- Learning Experiences from Scheme: ${learningExperiences || "Not provided"}
- Key Inquiry Question: ${keyInquiryQuestion || "Not provided"}
- Available Resources: ${learningResources || "Not provided"}
${additionalNotes ? `- Teacher's Additional Notes: ${additionalNotes}` : ""}

Generate a comprehensive lesson plan as a JSON object with this EXACT structure:
{
  "title": "Lesson title (descriptive, specific to the topic)",
  "grade": "${grade}",
  "subject": "${subject}",
  "strand": "${strand}",
  "subStrand": "${subStrand}",
  "duration": "40 minutes",
  "objectives": ["3-5 specific, measurable learning objectives using action verbs"],
  "keyInquiryQuestion": "The key question that drives this lesson",
  "introduction": {
    "duration": "5-8 minutes",
    "activities": ["3-4 warm-up/hook activities to engage learners and activate prior knowledge"]
  },
  "development": {
    "duration": "20-25 minutes", 
    "activities": ["5-7 detailed step-by-step teaching activities covering knowledge, skills, and application"]
  },
  "conclusion": {
    "duration": "5-8 minutes",
    "activities": ["3-4 wrap-up activities for consolidation and reflection"]
  },
  "assessment": ["3-4 specific assessment strategies aligned with objectives"],
  "differentiation": {
    "advanced": "Activities for advanced/gifted learners",
    "struggling": "Support strategies for struggling learners"
  },
  "resources": ["5-7 specific teaching and learning resources needed"],
  "teacherReflection": "Guiding questions for teacher self-reflection after the lesson"
}

REQUIREMENTS:
- Activities must be AGE-APPROPRIATE for ${grade} learners
- Use LEARNER-CENTERED pedagogy (group work, pair work, hands-on activities)
- Include INTEGRATION of core competencies (communication, collaboration, critical thinking, creativity, digital literacy, citizenship, learning to learn)
- Include Pertinent and Contemporary Issues (PCIs) where relevant
- Include values integration
- Activities should be SPECIFIC and ACTIONABLE — not vague
- Resources should be REALISTIC for a Kenyan classroom setting

Return ONLY the JSON object, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a KICD Kenya CBC curriculum expert. Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: aiResponse.status === 429 ? "Rate limit exceeded. Please try again." : "AI generation failed" }),
        { status: aiResponse.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let raw = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let plan;
    try {
      plan = JSON.parse(raw.trim());
    } catch {
      console.error("Failed to parse lesson plan JSON:", raw.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-lesson-plan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
