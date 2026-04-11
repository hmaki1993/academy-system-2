import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PresenceUser {
    id: string;
    full_name: string;
    role: string;
    last_seen: string;
}

export function usePresence() {
    const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser>>({});
    const [status, setStatus] = useState<string>('initializing');

    useEffect(() => {
        let channel: any = null;

        const setupPresence = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setStatus('no-auth');
                    return;
                }

                // Get user profile info
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('id', user.id)
                    .single();

                if (!profile) {
                    setStatus('no-profile');
                    return;
                }

                setStatus('connecting');

                // Create a unique-ish channel name but consistent for 'online-users'
                channel = supabase.channel('online-users', {
                    config: {
                        presence: {
                            key: user.id,
                        },
                    },
                });

                const syncPresence = () => {
                    const state = channel.presenceState();
                    const formattedDetails: Record<string, PresenceUser> = {};
                    
                    Object.keys(state).forEach((key) => {
                        const presenceEntries = state[key] as any[];
                        if (presenceEntries.length > 0) {
                            formattedDetails[key] = presenceEntries[0] as PresenceUser;
                        }
                    });
                    
                    setOnlineUsers(formattedDetails);
                };

                channel
                    .on('presence', { event: 'sync' }, () => {
                        console.log('🛰️ Presence: SYNC event received');
                        syncPresence();
                    })
                    .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string, newPresences: any[] }) => {
                        console.log('🛰️ Presence: JOIN event -', key);
                        const newUser = newPresences[0] as PresenceUser;
                        setOnlineUsers(prev => ({ ...prev, [key]: newUser }));
                    })
                    .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
                        console.log('🛰️ Presence: LEAVE event -', key);
                        setOnlineUsers(prev => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                        });
                    })
                    .on('broadcast', { event: 'rocket_join' }, ({ payload }: { payload: any }) => {
                        console.log('🚀 Rocket Join Broadcast received:', payload);
                        setOnlineUsers(prev => ({
                            ...prev,
                            [payload.id]: {
                                id: payload.id,
                                full_name: payload.full_name,
                                role: payload.role,
                                last_seen: new Date().toISOString()
                            }
                        }));
                    })
                    .subscribe(async (subStatus: string) => {
                        console.log('🛰️ Presence Status:', subStatus);
                        setStatus(subStatus);
                        
                        if (subStatus === 'SUBSCRIBED') {
                            const presenceData = {
                                id: user.id,
                                full_name: profile.full_name,
                                role: profile.role,
                                last_seen: new Date().toISOString(),
                            };

                            // Track standard presence
                            channel.track(presenceData);

                            // AGGRESSIVE BROADCAST: Tell everyone we are here RIGHT NOW
                            channel.send({
                                type: 'broadcast',
                                event: 'rocket_join',
                                payload: presenceData
                            });

                            console.log('🛰️ Rocket Join broadcast sent');
                            syncPresence();
                        }
                    });

            } catch (error) {
                console.error('❌ Presence Setup Error:', error);
                setStatus('error');
            }
        };

        setupPresence();

        // Heartbeat to ensure we stay synced or detect stalls
        const heartbeat = setInterval(() => {
            if (channel && channel.state === 'joined') {
                // If we're joined but empty and shouldn't be, sync again
                const state = channel.presenceState();
                if (Object.keys(state).length > 0 && Object.keys(onlineUsers).length === 0) {
                    console.log('🛰️ Presence: Heartbeat manual sync triggered');
                    const formattedDetails: Record<string, PresenceUser> = {};
                    Object.keys(state).forEach((key) => {
                        const entries = state[key] as any[];
                        if (entries.length > 0) formattedDetails[key] = entries[0];
                    });
                    setOnlineUsers(formattedDetails);
                }
            }
        }, 5000);

        return () => {
            clearInterval(heartbeat);
            if (channel) {
                console.log('🛰️ Presence: Cleaning up channel...');
                channel.unsubscribe();
            }
        };
    }, []);

    return {
        onlineUsers: Object.values(onlineUsers),
        onlineCount: Object.keys(onlineUsers).length,
        onlineStudents: Object.values(onlineUsers).filter(u => u.role === 'student'),
        connectionStatus: status
    };
}
