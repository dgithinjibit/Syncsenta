
"use client";

import { Suspense, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import TeacherDashboard from '@/components/dashboards/teacher-dashboard';
import SchoolHeadDashboard from '@/components/dashboards/school-head-dashboard';
import { CountyOfficerDashboard } from '@/components/dashboards/county-officer-dashboard';
import ParentDashboard from '@/components/dashboards/parent-dashboard';
import SchoolAdminDashboard from '@/components/dashboards/school-admin-dashboard';
import NationalAdminDashboard from '@/components/dashboards/national-admin-dashboard';
import { getServerUser } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

const DashboardSkeleton = () => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
        </div>
    </div>
);

export default function DashboardPage() {
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
             const user = await getServerUser();
             setRole(user?.role as UserRole);
             setLoading(false);
        }
        fetchRole();
    }, []);

    const renderDashboardByRole = () => {
        switch (role) {
            case 'teacher':
                return <TeacherDashboard />;
            case 'school_head':
                return <SchoolHeadDashboard />;
            case 'county_officer':
                return <CountyOfficerDashboard />;
            case 'parent':
                return <ParentDashboard />;
            case 'school_admin':
                return <SchoolAdminDashboard />;
            case 'national_admin':
                return <NationalAdminDashboard />;
            default:
                // Return a loading state or a generic view if the role is not yet determined or unrecognized.
                return <DashboardSkeleton />;
        }
    };
    
    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <Suspense fallback={<DashboardSkeleton />}>
            {renderDashboardByRole()}
        </Suspense>
    );
}
