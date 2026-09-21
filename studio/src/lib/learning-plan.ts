export interface TimetableItem {
  id: string;
  day: string;
  time: string;
  subject: string;
  activity: string;
  mode: 'lesson' | 'sandbox' | 'quiz' | 'live';
}

export interface LiveClassItem {
  id: string;
  title: string;
  subject: string;
  grade: string;
  teacher: string;
  time: string;
  status: 'live' | 'upcoming';
}

export const DEFAULT_TIMETABLE: readonly TimetableItem[] = [
  { id: 'mon-math', day: 'Monday', time: '08:00–08:40', subject: 'Mathematics', activity: 'Fractions and number sense', mode: 'lesson' },
  { id: 'tue-english', day: 'Tuesday', time: '09:00–09:40', subject: 'English', activity: 'Reading comprehension', mode: 'quiz' },
  { id: 'wed-agi', day: 'Wednesday', time: '10:00–10:40', subject: 'AI Literacy', activity: 'Evidence and human oversight', mode: 'sandbox' },
  { id: 'thu-blockchain', day: 'Thursday', time: '11:00–11:40', subject: 'Blockchain', activity: 'Shared ledgers and verification', mode: 'sandbox' },
  { id: 'fri-finance', day: 'Friday', time: '08:00–08:40', subject: 'Financial Literacy', activity: 'Budgeting and opportunity cost', mode: 'lesson' },
];

export const DEFAULT_LIVE_CLASSES: readonly LiveClassItem[] = [
  { id: 'live-math', title: 'Fractions clinic', subject: 'Mathematics', grade: 'Selected grade', teacher: 'Teacher 1', time: 'Today · 10:00 EAT', status: 'live' },
  { id: 'live-agi', title: 'How should we trust an AI claim?', subject: 'AI Literacy', grade: 'Selected grade', teacher: 'Teacher 1', time: 'Tomorrow · 09:00 EAT', status: 'upcoming' },
  { id: 'live-finance', title: 'Build a safe weekly budget', subject: 'Financial Literacy', grade: 'Selected grade', teacher: 'Teacher 1', time: 'Friday · 11:00 EAT', status: 'upcoming' },
];

export function timetableForGrade(grade: string | null | undefined): readonly TimetableItem[] {
  // The timetable is intentionally a shared, replaceable contract until the
  // school timetable tables are connected. Grade filtering belongs here, not
  // in individual dashboards.
  void grade;
  return DEFAULT_TIMETABLE;
}

export function liveClassesForGrade(grade: string | null | undefined): readonly LiveClassItem[] {
  const displayGrade = grade?.trim() ? `${grade.trim()}A` : 'Selected grade';
  return DEFAULT_LIVE_CLASSES.map((item) => ({ ...item, grade: displayGrade }));
}
