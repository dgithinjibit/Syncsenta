/**
 * POST /api/teacher/feedback
 *
 * Teacher submits feedback on:
 * 1. Generated schemes of work (lesson order, activities, pacing)
 * 2. Student scaffolding decisions (Omega thresholds)
 *
 * Flow:
 * - Validate + store in Supabase
 * - Record in MeTTa session boundary
 * - POST to FastAPI for analysis
 * - Return proposed patch to teacher
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// ────────────────────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────────────────────

const TeacherFeedbackRequest = z.object({
  type: z.enum(['scheme', 'omega_threshold']),
  competencyCode: z.string().max(120),
  competencyName: z.string().max(200).optional(),
  studentId: z.string().uuid().optional(), // Only for omega_threshold type
  currentContext: z.record(z.any()).optional(), // { scaffolding, mastery, hints, etc }
  issueDescription: z.string().min(10).max(2000),
  correctionDetails: z.string().min(10).max(5000),
  reasoning: z.string().min(10).max(5000),
});

type TeacherFeedback = z.infer<typeof TeacherFeedbackRequest>;

// ────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: 'Unauthorized', detail: 'Please sign in' },
      { status: 401 }
    );
  }

  // ── Verify teacher role ──────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return Response.json(
      { error: 'Forbidden', detail: 'Only teachers can submit feedback' },
      { status: 403 }
    );
  }

  // ── Parse + validate ────────────────────────────────────────────
  let body: TeacherFeedback;
  try {
    body = TeacherFeedbackRequest.parse(await req.json());
  } catch (err) {
    return Response.json(
      { error: 'Invalid request', detail: err instanceof Error ? err.message : 'Schema validation failed' },
      { status: 400 }
    );
  }

  // ── Store in Supabase ───────────────────────────────────────────
  const supabaseAdmin = getSupabaseServerClient();

  const { data: feedbackRecord, error: insertError } = await supabaseAdmin
    .from('teacher_feedback')
    .insert({
      teacher_id: user.id,
      student_id: body.studentId || null,
      feedback_type: body.type,
      competency_code: body.competencyCode,
      competency_name: body.competencyName || null,
      current_context: body.currentContext || null,
      issue_description: body.issueDescription,
      correction_details: body.correctionDetails,
      reasoning: body.reasoning,
      patch_status: 'pending',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[/api/teacher/feedback] Insert failed:', insertError);
    return Response.json(
      { error: 'Failed to store feedback' },
      { status: 500 }
    );
  }

  const feedbackId = feedbackRecord?.id;

  // ── Send to FastAPI for analysis ────────────────────────────────
  const aiAgentsUrl = process.env.NEXT_PUBLIC_AI_AGENTS_URL;
  if (!aiAgentsUrl) {
    console.warn('[/api/teacher/feedback] AI_AGENTS_URL not configured, skipping analysis');
    return Response.json(
      {
        success: true,
        feedbackId,
        message: 'Feedback stored. AI analysis endpoint not available.',
      },
      { status: 202 }
    );
  }

  let analysisResult: Record<string, unknown> = {};
  try {
    const analysisResponse = await fetch(`${aiAgentsUrl}/teacher/feedback-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedbackId,
        teacherId: user.id,
        ...body,
      }),
    });

    if (analysisResponse.ok) {
      analysisResult = await analysisResponse.json();
    } else {
      console.error(
        '[/api/teacher/feedback] FastAPI analysis failed:',
        analysisResponse.status,
        await analysisResponse.text()
      );
    }
  } catch (err) {
    console.error('[/api/teacher/feedback] FastAPI call failed:', err);
  }

  // ── Update feedback record with patch proposal ───────────────────
  if (analysisResult && typeof analysisResult === 'object' && 'proposedPatch' in analysisResult) {
    await supabaseAdmin
      .from('teacher_feedback')
      .update({
        patch_proposed: analysisResult.proposedPatch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);
  }

  return Response.json(
    {
      success: true,
      feedbackId,
      proposedPatch: analysisResult.proposedPatch || null,
      message: 'Feedback submitted successfully. Review patch proposal above.',
    },
    { status: 202 }
  );
}
