export const ROLE_HOME: Record<string, string> = {
  student: '/student',
  teacher: '/teacher',
  parent: '/parent',
  admin: '/head',
  school_head: '/head',
  school_admin: '/head',
  national_admin: '/head',
  county_officer: '/teacher',
};

export function getRoleHome(role: string | null | undefined): string {
  return (role && ROLE_HOME[role]) || '/login';
}
