import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface LiveMonitor {
    streamId: string;
    startTime: string;
    status: string;
    label: string;
}

export function useLiveMonitors() {
    const [monitors, setMonitors] = useState<LiveMonitor[]>([]);

    useEffect(() => {
        const presenceChannel = supabase.channel('live_monitors_lobby');

        presenceChannel.on('presence', { event: 'sync' }, () => {
            const newState = presenceChannel.presenceState();
            const activeStreams: LiveMonitor[] = [];
            
            Object.values(newState).forEach((presenceObjects: any) => {
                presenceObjects.forEach((p: any) => {
                    if (p.streamId) {
                        activeStreams.push({
                            streamId: p.streamId,
                            startTime: p.startTime,
                            status: p.status,
                            label: p.label
                        });
                    }
                });
            });
            
            setMonitors(activeStreams);
        });

        presenceChannel.subscribe();

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, []);

    return monitors;
}
