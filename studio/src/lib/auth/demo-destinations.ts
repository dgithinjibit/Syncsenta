export type DemoRole = 'student' | 'teacher' | 'head' | 'parent';

export const DEMO_DESTINATIONS: Record<DemoRole, string> = {
  student: '/student',
  teacher: '/teacher',
  head: '/head',
  parent: '/parent',
};

export function getDemoDestination(role: string): string | null {
  const normalized = role.trim().toLowerCase();
  return normalized in DEMO_DESTINATIONS
    ? DEMO_DESTINATIONS[normalized as DemoRole]
    : null;
}
