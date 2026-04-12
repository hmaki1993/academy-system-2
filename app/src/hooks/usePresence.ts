import { useState, useEffect, useMemo } from 'react';
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
    const [dbOnlineUsers, setDbOnlineUsers] = useState<Record<string, any>>({});

    // 1. WebSocket Presence
    useEffect(() => {
        let channel: any = null;
        const setupPresence = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
                if (!profile) return;

                channel = supabase.channel('online-users', { config: { presence: { key: user.id } } });

                const syncPresence = () => {
                    const state = channel.presenceState();
                    const formatted: Record<string, PresenceUser> = {};
                    Object.keys(state).forEach((key) => {
                        const entries = state[key] as any[];
                        if (entries.length > 0) formatted[key] = entries[0];
                    });
                    setOnlineUsers(formatted);
                };

                channel
                    .on('presence', { event: 'sync' }, syncPresence)
                    .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
                        setOnlineUsers(prev => ({ ...prev, [key]: newPresences[0] }));
                    })
                    .on('presence', { event: 'leave' }, ({ key }: any) => {
                        setOnlineUsers(prev => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                        });
                    })
                    .subscribe(async (subStatus: string) => {
                        setStatus(subStatus);
                        if (subStatus === 'SUBSCRIBED') {
                            channel.track({ id: user.id, full_name: profile.full_name, role: profile.role, last_seen: new Date().toISOString() });
                        }
                    });
            } catch (error) { console.error('Presence Error:', error); setStatus('error'); }
        };
        setupPresence();
        return () => { if (channel) channel.unsubscribe(); };
    }, []);

    // 2. Database Realtime Pulse (The "Instant" part)
    useEffect(() => {
        const fetchInitialDbPresence = async () => {
            const threeMinsAgo = new Date(Date.now() - 180000).toISOString();
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, role, last_active_at')
                .gt('last_active_at', threeMinsAgo);
            
            if (data) {
                const map: Record<string, any> = {};
                data.forEach(p => { map[p.id] = p; });
                setDbOnlineUsers(map);
            }
        };

        fetchInitialDbPresence();

        const channel = supabase.channel('db-presence-sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                const lastActive = new Date(payload.new.last_active_at).getTime();
                const now = Date.now();
                
                if (now - lastActive < 180000) {
                    setDbOnlineUsers(prev => ({
                        ...prev,
                        [payload.new.id]: {
                            id: payload.new.id,
                            full_name: payload.new.full_name,
                            role: payload.new.role,
                            last_active_at: payload.new.last_active_at
                        }
                    }));
                } else {
                    setDbOnlineUsers(prev => {
                        const next = { ...prev };
                        delete next[payload.new.id];
                        return next;
                    });
                }
            })
            .subscribe();

        const cleanup = setInterval(() => {
            const now = Date.now();
            setDbOnlineUsers(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(id => {
                    const lastActive = new Date(next[id].last_active_at).getTime();
                    if (now - lastActive >= 180000) {
                        delete next[id];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 60000);

        return () => { 
            supabase.removeChannel(channel);
            clearInterval(cleanup);
        };
    }, []);

    const mergedUsers = useMemo(() => {
        const result: Record<string, any> = { ...onlineUsers };
        Object.values(dbOnlineUsers).forEach((u: any) => {
            result[u.id] = {
                id: u.id,
                full_name: u.full_name,
                role: u.role,
                last_seen: u.last_active_at || u.last_seen
            };
        });
        return Object.values(result);
    }, [onlineUsers, dbOnlineUsers]);

    return {
        onlineUsers: mergedUsers,
        onlineCount: mergedUsers.length,
        onlineStudents: mergedUsers.filter(u => {
            const r = (u.role || '').toLowerCase();
            return r === 'student' || r === 'trainee' || !['admin', 'coach', 'head_coach'].includes(r);
        }),
        connectionStatus: status
    };
}
