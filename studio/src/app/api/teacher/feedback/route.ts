import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { buildReflectionEvidencePlan } from '@/lib/teacher/teacher-reflection-evidence';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      content_type,
      content_id,
      rating,
      feedback_text,
      improvement_suggestions,
      context,
      student_id,
      school_name,
      subject,
      mastery_percent,
      teacher_summary,
      next_step,
      parent_linked,
      parent_consent,
    } = body;

    // Validate required fields
    if (!content_type || !content_id || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: content_type, content_id, rating' },
        { status: 400 }
      );
    }

    // Validate content_type
    const validContentTypes = ['scheme', 'lesson_plan', 'assessment', 'worksheet', 'text_leveler', 'standards_unpacker'];
    if (!validContentTypes.includes(content_type)) {
      return NextResponse.json(
        { error: `Invalid content_type. Must be one of: ${validContentTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate rating
    if (!['thumbs_up', 'thumbs_down'].includes(rating)) {
      return NextResponse.json(
        { error: 'Invalid rating. Must be thumbs_up or thumbs_down' },
        { status: 400 }
      );
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('teacher_feedback')
      .insert({
        teacher_id: user.id,
        content_type,
        content_id,
        rating,
        feedback_text: feedback_text || null,
        improvement_suggestions: improvement_suggestions || null,
        context: context || null,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error inserting feedback:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    const evidencePlan = typeof student_id === 'string'
      ? buildReflectionEvidencePlan({
          teacherId: user.id,
          studentId: student_id,
          schoolName: school_name,
          subject,
          masteryPercent: Number(mastery_percent),
          teacherSummary: teacher_summary,
          nextStep: next_step,
          parentLinked: parent_linked === true,
          parentConsent: parent_consent === true,
        })
      : null;

    return NextResponse.json({ data, evidencePlan, success: true });
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const content_type = searchParams.get('content_type');
    const content_id = searchParams.get('content_id');

    let query = supabase
      .from('teacher_feedback')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (content_type) {
      query = query.eq('content_type', content_type);
    }

    if (content_id) {
      query = query.eq('content_id', content_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Made with Bob
