/**
 * Phase 2 Dashboard API Client
 * 
 * Fetches telemetry data from the Phase 1 tables via the new Phase 2 endpoints:
 * - Per-learner misconceptions, interventions, timelines
 * - Per-competency trends and summaries
 * - Active alerts
 */

import { API_ENDPOINTS } from './api-config';

// Type definitions from backend response
export interface StudentActivitySummary {
  student_id: string;
  student_name: string;
  status: 'active' | 'struggling' | 'idle';
  current_subject?: string;
  current_topic?: string;
  current_agent?: string;
  duration_minutes: number;
  last_activity: string; // ISO datetime
  mastery_indicator?: number;
  engagement_score?: number;
  primary_pattern?: string;
}

export interface StudentProgressDetail {
  student_id: string;
  subject: string;
  topic: string;
  mastery_level: number;
  time_spent_minutes: number;
  quiz_scores: number[];
  last_activity: string; // ISO datetime
  competency?: string;
  session_id?: string;
  engagement_score?: number;
  primary_pattern?: string;
}

export interface Misconception {
  id: string;
  student_id: string;
  misconception_type: string;
  confidence: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  competency?: string;
  created_at: string; // ISO datetime
}

export interface MisconceptionSummary {
  misconception_type: string;
  count: number;
  max_severity: 'low' | 'medium' | 'high' | 'critical';
  latest_confidence: number;
  latest_description: string;
  latest_seen: string;
  competencies: string[];
}

export interface Intervention {
  id: string;
  student_id: string;
  intervention_type: string;
  description: string;
  priority: string;
  created_at: string; // ISO datetime
  status?: string;
}

export interface TimelineSession {
  session_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes: number;
  topic?: string;
  competency?: string;
  mastery_indicator?: number;
  misconception_count: number;
  intervention_count: number;
}

export interface CompetencySummary {
  competency: string;
  session_count: number;
  misconception_count: number;
  average_mastery: number;
}

export interface CompetencyTrends {
  competency: string;
  session_count: number;
  misconception_frequency: { [type: string]: number };
  severity_distribution: { [severity: string]: number };
  mastery_histogram: number[]; // Buckets [0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0]
}

export interface DashboardAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  student_id: string;
  student_name: string;
  message: string;
  created_at: string;
  acknowledged: boolean;
}

// Helper to fetch with error handling
async function fetchDashboardApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const dashboardEndpoint = endpoint.startsWith('/dashboard/')
    ? `/api/teacher/dashboard/${endpoint.slice('/dashboard/'.length)}`
    : endpoint;
  const url = dashboardEndpoint;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dashboard API error: ${response.status} ${text}`);
  }

  const payload = await response.json() as
    | { success: true; data: T }
    | { success: false; error: { message: string } };
  if (!payload.success) {
    throw new Error(payload.error.message);
  }
  return payload.data;
}

/**
 * Get active students (last 30 minutes of activity)
 */
export async function getActiveStudents(limit = 50): Promise<StudentActivitySummary[]> {
  const endpoint = `${API_ENDPOINTS.DASHBOARD_STUDENTS_ACTIVE.replace('/dashboard/students/active', '/dashboard/overview')}?limit=${limit}`;
  return fetchDashboardApi<StudentActivitySummary[]>(endpoint);
}

/**
 * Get recent sessions for one student with mastery + engagement
 */
export async function getStudentProgress(
  studentId: string,
  limit = 25
): Promise<StudentProgressDetail[]> {
  const endpoint = `${API_ENDPOINTS.DASHBOARD_STUDENTS_PROGRESS(studentId)}?limit=${limit}`;
  return fetchDashboardApi<StudentProgressDetail[]>(endpoint);
}

/**
 * Get all misconceptions for a student (newest first)
 */
export async function getStudentMisconceptions(
  studentId: string,
  limit = 50
): Promise<Misconception[]> {
  const endpoint = `${API_ENDPOINTS.DASHBOARD_STUDENTS_MISCONCEPTIONS(studentId)}?limit=${limit}`;
  return fetchDashboardApi<Misconception[]>(endpoint);
}

/**
 * Get misconceptions grouped by type for a student
 */
export async function getStudentMisconceptionsSummary(
  studentId: string
): Promise<MisconceptionSummary[]> {
  const endpoint = `${API_ENDPOINTS.DASHBOARD_STUDENTS_MISCONCEPTIONS(studentId)}?grouped=true`;
  return fetchDashboardApi<MisconceptionSummary[]>(endpoint);
}

/**
 * Get recent interventions for a student
 */
export async function getStudentInterventions(
  studentId: string,
  limit = 25
): Promise<Intervention[]> {
  const endpoint = `${API_ENDPOINTS.DASHBOARD_STUDENTS_INTERVENTIONS(studentId)}?limit=${limit}`;
  return fetchDashboardApi<Intervention[]>(endpoint);
}

/**
 * Get session-by-session timeline for a student
 */
export async function getStudentTimeline(
  studentId: string,
  limit = 30
): Promise<TimelineSession[]> {
  const endpoint = `${API_ENDPOINTS.DASHBOARD_STUDENTS_TIMELINE(studentId)}?limit=${limit}`;
  return fetchDashboardApi<TimelineSession[]>(endpoint);
}

/**
 * Get all competencies with session/misconception counts
 */
export async function getCompetencySummary(limit = 50): Promise<CompetencySummary[]> {
  const endpoint = `${API_ENDPOINTS.DASHBOARD_COMPETENCIES_SUMMARY}?limit=${limit}`;
  return fetchDashboardApi<CompetencySummary[]>(endpoint);
}

/**
 * Get cohort-level trends for one competency
 */
export async function getCompetencyTrends(competency: string): Promise<CompetencyTrends> {
  const endpoint = API_ENDPOINTS.DASHBOARD_COMPETENCIES_TRENDS(
    encodeURIComponent(competency),
  );
  return fetchDashboardApi<CompetencyTrends>(endpoint);
}

/**
 * Get live alerts (behavioral profiles flagged for intervention)
 */
export async function getAlerts(
  acknowledged = false,
  limit = 50
): Promise<DashboardAlert[]> {
  const endpoint = `${API_ENDPOINTS.DASHBOARD_ALERTS}?acknowledged=${acknowledged}&limit=${limit}`;
  return fetchDashboardApi<DashboardAlert[]>(endpoint);
}
