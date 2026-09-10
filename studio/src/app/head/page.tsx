'use client';

import SchoolAdminDashboard from "@/components/dashboards/school-admin-dashboard";
import { RoleGate } from "@/components/auth/role-gate";

/** Canonical Head-of-School entry point. */
export default function HeadDashboardPage() {
  return <RoleGate allowedRoles={['admin']}><SchoolAdminDashboard /></RoleGate>;
}
