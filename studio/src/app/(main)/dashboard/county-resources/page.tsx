
"use client";

import { useState, useEffect } from 'react';
import { CountyResourceAllocation } from '@/components/dashboards/county-resource-allocation';
import type { SchoolResource } from '@/lib/types';

export default function CountyResourcesPage() {
    const [resources, setResources] = useState<SchoolResource[]>([]);

    useEffect(() => {
        const fetchResources = () => {
            const storedResources = localStorage.getItem('schoolResources');
            if (storedResources) {
                setResources(JSON.parse(storedResources));
            } else {
                setResources([]);
            }
        };

        fetchResources();

        const handleResourceUpdate = () => fetchResources();
        window.addEventListener('school-resource-update', handleResourceUpdate);

        return () => {
            window.removeEventListener('school-resource-update', handleResourceUpdate);
        };
    }, []);

    return (
        <CountyResourceAllocation initialResources={resources} />
    );
}
