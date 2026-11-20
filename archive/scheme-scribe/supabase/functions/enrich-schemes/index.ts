import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const START_TIME = Date.now();
const TIMEOUT_BUFFER_MS = 120_000;
const MAX_ITEMS_PER_RUN = 10;

function isTimeBudgetExhausted(): boolean {
  return Date.now() - START_TIME > TIMEOUT_BUFFER_MS;
}

/**
 * This function enriches scraped scheme_references using AI.
 * It finds records with missing/incomplete data and uses AI to extract
 * structured grade, subject, strand, and term information from their content.
 * This improves the quality of context injected into scheme generation.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find records that need enrichment:
    // - Missing grade, subject, or strand
    // - Or have content_snippet but no structured data extracted
    const { data: records, error: fetchError } = await supabase
      .from("scheme_references")
      .select("*")
      .or("grade.is.null,subject.is.null,strand.is.null")
      .not("content_snippet", "is", null)
      .order("scraped_at", { ascending: false })
      .limit(MAX_ITEMS_PER_RUN);

    if (fetchError) {
      console.error("Error fetching records:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch records" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!records || records.length === 0) {
      console.log("No records need enrichment");
      return new Response(
        JSON.stringify({ success: true, enriched: 0, message: "All records already enriched" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${records.length} records to enrich`);
    let enriched = 0;

    for (const record of records) {
      if (isTimeBudgetExhausted()) {
        console.log("Time budget exhausted, stopping");
        break;
      }

      try {
        const textForAnalysis = [
          record.title || "",
          record.description || "",
          (record.content_snippet || "").slice(0, 1500),
        ].join("\n\n");

        const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
              {
                role: "system",
                content: `You are an expert on the Kenyan CBC (Competency-Based Curriculum) by KICD. 
Extract structured metadata from the following educational content. Return ONLY a JSON object with these fields:
- "grade": The grade level (e.g. "Grade 1", "Grade 7", "PP 1", "Form 2") or null
- "subject": The subject name (e.g. "Mathematics", "English", "Kiswahili", "Science", "Social Studies", "CRE", "Agriculture", "Creative Activities") or null  
- "strand": The curriculum strand/topic (e.g. "Numbers", "Geometry", "Reading", "Weather") or null
- "term": The term (e.g. "Term 1", "Term 2", "Term 3") or null
- "summary": A 1-2 sentence summary of what this scheme covers, useful as context for AI generation

Return ONLY valid JSON, no other text.`,
              },
              {
                role: "user",
                content: `Extract CBC metadata from this content:\n\nURL: ${record.url}\n\n${textForAnalysis}`,
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for ${record.id}: ${aiResponse.status}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const raw = aiData.choices?.[0]?.message?.content || "";
        
        // Parse AI response
        let parsed;
        try {
          let cleaned = raw.trim();
          if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          parsed = JSON.parse(cleaned.trim());
        } catch {
          console.error(`Failed to parse AI response for ${record.id}`);
          continue;
        }

        // Update the record with enriched data
        const updates: Record<string, string | null> = {};
        if (parsed.grade && !record.grade) updates.grade = parsed.grade;
        if (parsed.subject && !record.subject) updates.subject = parsed.subject;
        if (parsed.strand && !record.strand) updates.strand = parsed.strand;
        if (parsed.term && !record.term) updates.term = parsed.term;
        if (parsed.summary) {
          // Append AI summary to description for richer context
          updates.description = parsed.summary;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("scheme_references")
            .update(updates)
            .eq("id", record.id);

          if (updateError) {
            console.error(`Update error for ${record.id}:`, updateError);
          } else {
            enriched++;
            console.log(`Enriched ${record.id}: ${JSON.stringify(updates)}`);
          }
        }

        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error enriching ${record.id}:`, e);
      }
    }

    console.log(`Enrichment complete: ${enriched}/${records.length} records updated`);
    return new Response(
      JSON.stringify({ success: true, enriched, total: records.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("enrich-schemes error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
