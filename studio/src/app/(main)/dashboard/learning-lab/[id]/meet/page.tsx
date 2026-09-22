
"use client";

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

declare const JitsiMeetExternalAPI: any;

export default function JitsiMeetPage() {
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const params = useParams();
    const roomId = params.id as string;

    useEffect(() => {
        if (!jitsiContainerRef.current || !roomId) {
            return;
        }

        const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';
        const options = {
            roomName: `SyncSenta-Room-${roomId}`,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: localStorage.getItem('userName') || 'Teacher'
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
    }, [roomId]);

    return (
        <div className="w-full h-[calc(100vh-8rem)] rounded-lg overflow-hidden">
             <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>
    );
}

    