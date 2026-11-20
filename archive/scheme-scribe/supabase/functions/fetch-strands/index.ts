const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hardcoded KICD strands (verified from official curriculum design PDFs)
const hardcodedStrands: Record<string, string[]> = {
  "Grade 3|Creative Activities": [
    "1.0 Creating and Executing",
    "2.0 Performing and Displaying",
    "3.0 Appreciation",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, subject } = await req.json();

    if (!grade || !subject) {
      return new Response(
        JSON.stringify({ error: "Grade and subject are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const key = `${grade}|${subject}`;

    // Use hardcoded data if available
    if (hardcodedStrands[key]) {
      console.log(`Using hardcoded strands for ${key}`);
      return new Response(
        JSON.stringify({ strands: hardcodedStrands[key], source: "hardcoded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fall back to AI for subjects not yet hardcoded
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`No hardcoded data for ${key}, falling back to AI`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a KICD Kenya CBC curriculum expert. Return ONLY a JSON array of strand names (strings) for the given grade and subject. Use the exact strand names from the official KICD curriculum designs. No additional text, just the JSON array.`,
          },
          {
            role: "user",
            content: `List all the strands from the official KICD CBC curriculum design for ${grade} ${subject} in Kenya. Return ONLY a JSON array of strings.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: aiResponse.status === 429 ? "Rate limit exceeded. Please try again." : "Failed to fetch strands" }),
        { status: aiResponse.status === 429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let strands: string[];
    try {
      strands = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse strands:", rawContent);
      return new Response(
        JSON.stringify({ error: "Invalid response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(strands) || strands.length === 0) {
      return new Response(
        JSON.stringify({ error: "No strands found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ strands, source: "ai" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-strands error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
