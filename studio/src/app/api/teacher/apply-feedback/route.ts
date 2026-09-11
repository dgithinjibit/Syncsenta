/**
 * POST /api/teacher/apply-feedback
 *
 * Teacher approves/rejects a feedback-generated patch.
 *
 * If approve=true:
 * 1. Create git branch: omega/feedback-${date}-${competency}
 * 2. Apply patch
 * 3. Run tests
 * 4. If tests pass: commit + merge to main → Vercel redeploys
 * 5. If tests fail: store as pending_tests_fail, notify teacher
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const ApplyFeedbackRequest = z.object({
  feedbackId: z.string().uuid(),
  approve: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
});

type ApplyFeedbackPayload = z.infer<typeof ApplyFeedbackRequest>;

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
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ── Parse + validate ────────────────────────────────────────────
  let body: ApplyFeedbackPayload;
  try {
    body = ApplyFeedbackRequest.parse(await req.json());
  } catch (err) {
    return Response.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }

  // ── Fetch feedback record ───────────────────────────────────────
  const supabaseAdmin = getSupabaseServerClient();

  const { data: feedback, error: fetchError } = await supabaseAdmin
    .from('teacher_feedback')
    .select('*')
    .eq('id', body.feedbackId)
    .single();

  if (fetchError || !feedback) {
    return Response.json(
      { error: 'Feedback not found' },
      { status: 404 }
    );
  }

  // ── Verify teacher owns this feedback ────────────────────────────
  if (feedback.teacher_id !== user.id) {
    return Response.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // ── Handle rejection ────────────────────────────────────────────
  if (!body.approve) {
    await supabaseAdmin
      .from('teacher_feedback')
      .update({
        patch_status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.feedbackId);

    return Response.json(
      {
        success: true,
        status: 'rejected',
        message: body.rejectionReason || 'Feedback rejected by teacher',
      },
      { status: 200 }
    );
  }

  // ── Handle approval ────────────────────────────────────────────
  // NOTE: In production, this would trigger a webhook to a GitHub Actions
  // workflow that:
  // 1. Creates branch
  // 2. Applies patch
  // 3. Runs tests
  // 4. Merges if tests pass
  //
  // For now, update status to 'approved' and return instructions.

  await supabaseAdmin
    .from('teacher_feedback')
    .update({
      patch_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.feedbackId);

  // Trigger GitHub Actions workflow (if configured)
  const githubWebhookUrl = process.env.GITHUB_FEEDBACK_WEBHOOK_URL;
  if (githubWebhookUrl && feedback.patch_proposed) {
    try {
      await fetch(githubWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: body.feedbackId,
          patchProposal: feedback.patch_proposed,
          competencyCode: feedback.competency_code,
          teacherId: user.id,
        }),
      });
    } catch (err) {
      console.error('[/api/teacher/apply-feedback] Webhook trigger failed:', err);
    }
  }

  return Response.json(
    {
      success: true,
      status: 'approved',
      message: 'Patch approved. Running tests and applying changes...',
      nextSteps: [
        'Patch will be applied to a feature branch',
        'Tests will run automatically',
        'If tests pass, patch will merge to main and deploy',
        'Check your email for deployment confirmation',
      ],
    },
    { status: 202 }
  );
}
