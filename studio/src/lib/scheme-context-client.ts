/**
 * Scheme Context Client
 * 
 * Fetches active scheme of work for AI agents (Mwalimu, CBC Agent)
 * to ground their responses in the current week's curriculum.
 * 
 * Students never see this UI - only AI agents use this context.
 */

export interface SchemeActivity {
  week: number;
  lesson: number;
  activity_type: string;
  description: string;
  resources: string[];
  duration_minutes: number;
}

export interface SchemeContext {
  id: string;
  subject: string;
  grade_level: string;
  strand: string;
  sub_strand: string;
  learning_objectives: string[];
  current_week_activities: SchemeActivity[];
  curriculum_ref: string;
}

/**
 * Get active scheme context for a student's class
 * Used by AI agents to ground responses in current curriculum
 */
export async function getActiveSchemeContext(
  studentId: string,
  subject: string,
  weekNumber?: number
): Promise<SchemeContext | null> {
  try {
    const params = new URLSearchParams({
      student_id: studentId,
      subject,
      ...(weekNumber && { week: weekNumber.toString() }),
    });

    const response = await fetch(`/api/schemes/active?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No active scheme found - this is normal
        return null;
      }
      throw new Error(`Failed to fetch scheme context: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch scheme context (non-blocking):', error);
    return null;
  }
}

/**
 * Format scheme context for AI prompt injection
 */
export function formatSchemeContextForPrompt(context: SchemeContext): string {
  if (!context) return '';

  const activitiesText = context.current_week_activities
    .map(
      (a) =>
        `Lesson ${a.lesson}: ${a.activity_type} - ${a.description} (${a.duration_minutes} min)`
    )
    .join('\n');

  return `
# CURRENT SCHEME OF WORK CONTEXT

The teacher is currently teaching:
- Subject: ${context.subject}
- Grade: ${context.grade_level}
- Strand: ${context.strand}
- Sub-strand: ${context.sub_strand}

## Learning Objectives for this Unit:
${context.learning_objectives.map((obj) => `- ${obj}`).join('\n')}

## This Week's Planned Activities:
${activitiesText || 'No specific activities planned yet'}

**IMPORTANT**: Ground your tutoring in these learning objectives and activities. 
Help the student understand concepts that align with what their teacher is covering in class.
Use the Key Inquiry Questions and suggested experiences from the scheme when relevant.
`.trim();
}

/**
 * Get current week number (simple calculation based on term start)
 * In production, this should come from school calendar service
 */
export function getCurrentWeekNumber(): number {
  // Simple heuristic: assume term started on Jan 15, 2026
  // Each term is ~13 weeks
  const termStart = new Date('2026-01-15');
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - termStart.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  
  // Clamp to 1-13 (typical term length)
  return Math.max(1, Math.min(13, diffWeeks));
}
