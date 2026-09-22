
"use client";

import { useState, useEffect } from 'react';
import { CountyCommunications } from '@/components/dashboards/county-communications';
import type { Communication } from '@/lib/types';
import { mockCommunications } from '@/lib/mock-data';

export default function CountyCommsPage() {
    const [communications, setCommunications] = useState<Communication[]>([]);

    useEffect(() => {
        const fetchComms = () => {
            const storedComms = localStorage.getItem('mockCommunications');
            if (storedComms) {
                setCommunications(JSON.parse(storedComms).map((c: any) => ({...c, date: new Date(c.date)})));
            } else {
                setCommunications(mockCommunications);
                localStorage.setItem('mockCommunications', JSON.stringify(mockCommunications));
            }
        };

        fetchComms();

        const handleCommUpdate = () => fetchComms();
        window.addEventListener('communication-update', handleCommUpdate);

        return () => {
            window.removeEventListener('communication-update', handleCommUpdate);
        };
    }, []);

    return (
        <CountyCommunications initialCommunications={communications} />
    );
}
