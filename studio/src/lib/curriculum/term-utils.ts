/**
 * Term Detection and Management Utilities
 * 
 * This module handles:
 * - Detecting the current academic term based on device date
 * - Filtering content based on term availability
 * - Managing Kenyan academic calendar
 */

export type Term = 1 | 2 | 3;

export interface TermPeriod {
  term: Term;
  startMonth: number; // 1-12
  endMonth: number;   // 1-12
  name: string;
}

/**
 * Kenyan Academic Calendar (approximate):
 * - Term 1: January - April
 * - Term 2: May - August  
 * - Term 3: September - December
 */
export const KENYAN_TERMS: TermPeriod[] = [
  { term: 1, startMonth: 1, endMonth: 4, name: 'Term 1' },
  { term: 2, startMonth: 5, endMonth: 8, name: 'Term 2' },
  { term: 3, startMonth: 9, endMonth: 12, name: 'Term 3' },
];

/**
 * Get the current term based on device date
 * This respects the student's device date/time settings
 */
export function getCurrentTerm(date: Date = new Date()): Term {
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  
  for (const period of KENYAN_TERMS) {
    if (month >= period.startMonth && month <= period.endMonth) {
      return period.term;
    }
  }
  
  // Fallback to Term 1 if somehow outside all ranges
  return 1;
}

/**
 * Get all terms up to and including the current term
 * This ensures students only see content they should have learned
 */
export function getAvailableTerms(currentDate: Date = new Date()): Term[] {
  const currentTerm = getCurrentTerm(currentDate);
  const terms: Term[] = [];
  
  for (let i = 1; i <= currentTerm; i++) {
    terms.push(i as Term);
  }
  
  return terms;
}

/**
 * Check if content from a specific term should be available
 */
export function isTermAvailable(contentTerm: Term, currentDate: Date = new Date()): boolean {
  const currentTerm = getCurrentTerm(currentDate);
  return contentTerm <= currentTerm;
}

/**
 * Get term name for display
 */
export function getTermName(term: Term): string {
  const period = KENYAN_TERMS.find(p => p.term === term);
  return period?.name || `Term ${term}`;
}

/**
 * Get term period details
 */
export function getTermPeriod(term: Term): TermPeriod | undefined {
  return KENYAN_TERMS.find(p => p.term === term);
}

/**
 * Format term info for display
 */
export function formatTermInfo(term: Term): string {
  const period = getTermPeriod(term);
  if (!period) return `Term ${term}`;
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const startMonth = months[period.startMonth - 1];
  const endMonth = months[period.endMonth - 1];
  
  return `${period.name} (${startMonth} - ${endMonth})`;
}

/**
 * Check if we're in a specific term
 */
export function isCurrentTerm(term: Term, date: Date = new Date()): boolean {
  return getCurrentTerm(date) === term;
}

/**
 * Get progress through current term (0-1)
 */
export function getTermProgress(date: Date = new Date()): number {
  const currentTerm = getCurrentTerm(date);
  const period = getTermPeriod(currentTerm);
  
  if (!period) return 0;
  
  const month = date.getMonth() + 1;
  const termLength = period.endMonth - period.startMonth + 1;
  const monthsIntoTerm = month - period.startMonth + 1;
  
  return Math.min(1, Math.max(0, monthsIntoTerm / termLength));
}

/**
 * Validate device date (detect if date is significantly wrong)
 * Returns true if date seems reasonable, false if suspicious
 */
export function isDeviceDateReasonable(date: Date = new Date()): boolean {
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  
  // Allow dates within 2 years of actual current year
  // This handles minor clock drift but catches major issues
  return year >= currentYear - 1 && year <= currentYear + 1;
}

/**
 * Get warning message if device date seems wrong
 */
export function getDateWarningMessage(date: Date = new Date()): string | null {
  if (!isDeviceDateReasonable(date)) {
    return 'Your device date may be incorrect. Please check your device settings for the correct date and time.';
  }
  return null;
}

// Made with Bob
