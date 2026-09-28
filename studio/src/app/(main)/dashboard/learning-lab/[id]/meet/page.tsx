
"use client";

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

declare const JitsiMeetExternalAPI: any;

export default function JitsiMeetPage() {
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const params = useParams();
    const roomId = params.id as string;
    // The name other participants see. This read `localStorage.userName`, a key
    // nothing writes any more, so every teacher joined as "Teacher". Waiting for
    // the session here costs one effect re-run before anyone is in the room,
    // which is cheaper than putting a stranger's label on a live call.
    const { profile, user, loading } = useAuth();
    const displayName = profile?.full_name ?? user?.email ?? 'Teacher';

    useEffect(() => {
        if (!jitsiContainerRef.current || !roomId || loading) {
            return;
        }

        const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
        const options = {
            roomName: `SyncSenta-Room-${roomId}`,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName
            },
            configOverwrite: {
                prejoinPageEnabled: false,
                startWithAudioMuted: true,
                startWithVideoMuted: true,
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                ],
            }
        };

        const api = new JitsiMeetExternalAPI(domain, options);

        return () => {
            api.dispose();
        };
    }, [roomId, loading, displayName]);

    return (
        <div className="w-full h-[calc(100vh-8rem)] rounded-lg overflow-hidden">
             <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>
    );
}

    