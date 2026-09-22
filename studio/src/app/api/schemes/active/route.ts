/**
 * Active Scheme Context API
 * 
 * Returns the active scheme context for a student's class.
 * Used by AI agents (Mwalimu, CBC Agent) to ground responses in current curriculum.
 * 
 * Students never see this data directly - only AI agents use it as guardrails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStudentSchemes } from '@/lib/scheme-v2-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const subject = searchParams.get('subject');
    const weekNumber = searchParams.get('week');

    if (!studentId || !subject) {
      return NextResponse.json(
        { error: 'Missing required parameters: student_id and subject' },
        { status: 400 }
      );
    }

    // Get auth token from request headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || '';

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    }

    // Fetch student's visible schemes from backend
    const schemes = await getStudentSchemes(studentId, token);

    if (!schemes || schemes.length === 0) {
      return NextResponse.json(
        { error: 'No active scheme found for this student' },
        { status: 404 }
      );
    }

    // Filter by subject
    const subjectSchemes = schemes.filter(
      (s) => s.subject.toLowerCase() === subject.toLowerCase()
    );

    if (subjectSchemes.length === 0) {
      return NextResponse.json(
        { error: `No active scheme found for subject: ${subject}` },
        { status: 404 }
      );
    }

    // Get the most recent scheme for this subject
    const activeScheme = subjectSchemes.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    // Determine current week (use provided week or calculate)
    const currentWeek = weekNumber ? parseInt(weekNumber) : getCurrentWeekFromScheme(activeScheme);

    // Filter scheme rows for current week
    const currentWeekRows = activeScheme.scheme_rows.filter(
      (row) => row.week === currentWeek
    );

    if (currentWeekRows.length === 0) {
      return NextResponse.json(
        { error: `No activities found for week ${currentWeek}` },
        { status: 404 }
      );
    }

    // Extract unique strand and sub-strand from current week
    const strand = currentWeekRows[0].strand;
    const subStrand = currentWeekRows[0].subStrand;

    // Build scheme context response
    const schemeContext = {
      id: activeScheme.id,
      subject: activeScheme.subject,
      grade_level: activeScheme.grade,
      strand,
      sub_strand: subStrand,
      learning_objectives: extractLearningObjectives(currentWeekRows),
      current_week_activities: currentWeekRows.map((row) => ({
        week: row.week,
        lesson: row.lesson,
        activity_type: 'Learning Experience',
        description: row.learningExperiences,
        resources: parseResources(row.learningResources),
        duration_minutes: 40, // Default lesson duration
      })),
      curriculum_ref: activeScheme.curriculum_ref,
    };

    return NextResponse.json(schemeContext);
  } catch (error) {
    console.error('Failed to fetch active scheme context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get current week number from scheme
 * Uses the most recent week in the scheme as a heuristic
 */
function getCurrentWeekFromScheme(scheme: any): number {
  if (!scheme.scheme_rows || scheme.scheme_rows.length === 0) {
    return 1;
  }

  // Get the maximum week number (assumes scheme is current)
  const maxWeek = Math.max(...scheme.scheme_rows.map((r: any) => r.week));
  
  // Simple heuristic: assume we're in the middle of the scheme
  // In production, this should use school calendar service
  return Math.ceil(maxWeek / 2);
}

/**
 * Extract learning objectives from scheme rows
 */
function extractLearningObjectives(rows: any[]): string[] {
  const objectives = new Set<string>();
  
  rows.forEach((row) => {
    if (row.specificLearningOutcome) {
      objectives.add(row.specificLearningOutcome);
    }
  });

  return Array.from(objectives);
}

/**
 * Parse resources string into array
 */
function parseResources(resourcesStr: string): string[] {
  if (!resourcesStr) return [];
  
  // Split by common delimiters
  return resourcesStr
    .split(/[,;]/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
}
