/**
 * Scheme v2.0 API Client
 * 
 * Handles all API calls to the Rust/Axum backend for scheme management,
 * lesson plans, and IPFS integration.
 */

import { SchemeV2, LessonPlan } from '@/types/curriculum';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface SaveSchemeResponse {
  id: string;
  message: string;
}

interface SchemeListResponse {
  schemes: SchemeV2[];
}

interface LessonPlanResponse {
  id: string;
  message: string;
}

/**
 * Save a scheme to the database with IPFS integration
 */
export async function saveScheme(
  scheme: Omit<SchemeV2, 'id' | 'created_at' | 'updated_at'>,
  token: string
): Promise<SaveSchemeResponse> {
  const response = await fetch(`${API_BASE}/api/v1/schemes/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(scheme),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save scheme');
  }

  return response.json();
}

/**
 * Get a scheme by ID
 */
export async function getScheme(
  schemeId: string,
  token: string
): Promise<SchemeV2> {
  const response = await fetch(`${API_BASE}/api/v1/schemes/v2/${schemeId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch scheme');
  }

  return response.json();
}

/**
 * Get all schemes for a teacher
 */
export async function getTeacherSchemes(
  teacherId: string,
  token: string
): Promise<SchemeV2[]> {
  const response = await fetch(`${API_BASE}/api/v1/schemes/v2/teacher/${teacherId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch teacher schemes');
  }

  return response.json();
}

/**
 * Get schemes visible to a student (based on their class)
 */
export async function getStudentSchemes(
  studentId: string,
  token: string
): Promise<SchemeV2[]> {
  const response = await fetch(`${API_BASE}/api/v1/schemes/v2/student/${studentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch student schemes');
  }

  return response.json();
}

/**
 * Save a scheme to the teacher's library
 */
export async function saveSchemeToLibrary(
  schemeId: string,
  token: string
): Promise<{ message: string; scheme_id: string }> {
  const response = await fetch(`${API_BASE}/api/v1/schemes/v2/${schemeId}/save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save scheme to library');
  }

  return response.json();
}

/**
 * Save a lesson plan for a scheme
 */
export async function saveLessonPlan(
  schemeId: string,
  lessonPlan: Omit<LessonPlan, 'id' | 'created_at' | 'updated_at'>,
  token: string
): Promise<LessonPlanResponse> {
  const response = await fetch(`${API_BASE}/api/v1/schemes/v2/${schemeId}/lesson-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ lesson_plan: lessonPlan }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save lesson plan');
  }

  return response.json();
}

/**
 * Get all lesson plans for a scheme
 */
export async function getSchemeLessonPlans(
  schemeId: string,
  token: string
): Promise<LessonPlan[]> {
  const response = await fetch(`${API_BASE}/api/v1/schemes/v2/${schemeId}/lesson-plans`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch lesson plans');
  }

  return response.json();
}

/**
 * Update an existing scheme
 */
export async function updateScheme(
  schemeId: string,
  scheme: Partial<SchemeV2>,
  token: string
): Promise<SaveSchemeResponse> {
  // For now, we'll use the same save endpoint
  // The backend should handle updates based on scheme ID
  const response = await fetch(`${API_BASE}/api/v1/schemes/v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ ...scheme, id: schemeId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update scheme');
  }

  return response.json();
}
