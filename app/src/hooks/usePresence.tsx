import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../utils/notifications';

/**
 * Unified Presence & Notification Hook
 * 
 * Manages the single WebSocket connection to Supabase 'online-users' channel.
 * High-performance direct event listening for both Live Floor and Notifications.
 */

export interface PresenceUser {
    id: string;
    full_name: string;
    role: string;
    last_seen: string;
}

const STAFF_ROLES = new Set(['admin', 'coach', 'head_coach', 'reception']);

export function usePresence(config?: {
    currentUserId?: string | null;
    userRole?: string | null;
    notifySounds?: boolean;
}) {
    const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser>>({});
    const [status, setStatus] = useState<string>('initializing');
    const [dbOnlineUsers, setDbOnlineUsers] = useState<Record<string, any>>({});
    
    // Deduplication Set: prevents repeat notifications in same session
    const seenIds = useRef<Set<string>>(new Set());
    const isInitialized = useRef(false);

    // ─── 1. Internal Notification Trigger (Admin/Staff only) ────────────────────
    const triggerJoinAlert = (user: PresenceUser) => {
        if (!user?.id || user.id === config?.currentUserId) return;
        const normalizedRole = (config?.userRole || '').toLowerCase();
        
        if (!STAFF_ROLES.has(normalizedRole)) return;
        if (STAFF_ROLES.has((user.role || '').toLowerCase())) return;
        if (seenIds.current.has(user.id)) return;
        seenIds.current.add(user.id);

        toast.success(
            <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_10px_#10b981,0_0_20px_#10b981] animate-pulse" />
                <span className="font-black tracking-widest uppercase text-[11px] font-[var(--font-outfit)]">
                    {(user.full_name || 'Athlete').toUpperCase()} IS ONLINE
                </span>
            </div>,
            {
                icon: null, duration: 6000,
                style: {
                    background: '#050505', color: '#fff',
                    border: '1px solid rgba(16,185,129,0.3)',
                    boxShadow: '0_0_40px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.1)',
                    padding: '20px 32px', borderRadius: '24px'
                }
            }
        );

        // 🔔 DIRECT SOUND CALL (No more silence!)
        if (config?.notifySounds) {
            playNotificationSound('bell');
        }
    };

    const pendingLeaveAlerts = useRef<Record<string, NodeJS.Timeout>>({});

    const triggerLeaveAlert = (user: { id?: string; full_name?: string }) => {
        if (!user?.id || user.id === config?.currentUserId) return;
        const normalizedRole = (config?.userRole || '').toLowerCase();
        if (!STAFF_ROLES.has(normalizedRole)) return;
        
        // ⏳ DEBOUNCE: Wait 5 seconds before showing offline alert
        // If they rejoin in this window, we cancel the offline notification
        if (pendingLeaveAlerts.current[user.id]) {
            clearTimeout(pendingLeaveAlerts.current[user.id]);
        }

        pendingLeaveAlerts.current[user.id] = setTimeout(() => {
            seenIds.current.delete(user.id!);
            delete pendingLeaveAlerts.current[user.id!];

            toast.error(
                <div className="flex items-center gap-3 opacity-80">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_10px_#ef4444,0_0_20px_#ef4444] animate-pulse" />
                    <span className="font-black tracking-widest uppercase text-[11px] font-[var(--font-outfit)]">
                        {(user.full_name || 'Athlete').toUpperCase()} WENT OFFLINE
                    </span>
                </div>,
                {
                    icon: null, duration: 4000,
                    style: {
                        background: '#050505', color: 'rgba(255,255,255,0.6)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        padding: '16px 24px', borderRadius: '16px'
                    }
                }
            );

            if (config?.notifySounds) {
                playNotificationSound('bell');
            }
        }, 1500); // 1.5 second grace period for refreshes (Reduced from 5s for 'instant' feel)
    };

    // ─── 2. WebSocket Presence ───────────────────────────────────────────────────
    useEffect(() => {
        let channel: any = null;
        let isMounted = true;
        const setupPresence = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser || !isMounted) return;

                channel = supabase.channel('online-users', {
                    config: { presence: { key: authUser.id } }
                });

                const syncPresence = () => {
                    const state = channel.presenceState();
                    const formatted: Record<string, PresenceUser> = {};
                    Object.keys(state).forEach((key) => {
                        const entries = state[key] as any[];
                        if (entries.length > 0) {
                            const p: PresenceUser = entries[0];
                            formatted[key] = p;
                            if (!isInitialized.current) seenIds.current.add(key);
                        }
                    });
                    setOnlineUsers(formatted);
                    isInitialized.current = true;
                };

                channel
                    .on('presence', { event: 'sync' }, syncPresence)
                    .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
                        const joined: PresenceUser = newPresences[0];
                        
                        // ❌ CANCEL PENDING LEAVE: If they joined, they are not really offline
                        if (pendingLeaveAlerts.current[key]) {
                            clearTimeout(pendingLeaveAlerts.current[key]);
                            delete pendingLeaveAlerts.current[key];
                        }

                        setOnlineUsers(prev => ({ ...prev, [key]: joined }));
                        if (isInitialized.current) triggerJoinAlert(joined);
                    })
                    .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
                        const left: PresenceUser = leftPresences?.[0];
                        setOnlineUsers(prev => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                        });
                        if (isInitialized.current && left) triggerLeaveAlert(left);
                    })
                    .on('broadcast', { event: 'pulse:join' }, ({ payload }: any) => {
                        // Fast path: Update state instantly for Live Floor
                        if (payload?.id) {
                            const u: PresenceUser = {
                                id: payload.id,
                                full_name: payload.full_name || 'Athlete',
                                role: payload.role || 'student',
                                last_seen: new Date().toISOString()
                            };
                            setOnlineUsers(prev => {
                                if (prev[payload.id]) return prev;
                                return { ...prev, [payload.id]: u };
                            });
                            // Trigger notification if not already seen
                            if (isInitialized.current) triggerJoinAlert(u);
                        }
                    })
                    .subscribe(async (subStatus: string) => {
                        setStatus(subStatus);
                        if (subStatus === 'SUBSCRIBED') {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('id, full_name, role')
                                .eq('id', authUser.id)
                                .maybeSingle();

                            if (profile) {
                                channel.track({
                                    id: profile.id,
                                    full_name: profile.full_name,
                                    role: profile.role,
                                    last_seen: new Date().toISOString()
                                });

                                // Broadcast pulse for instant dashboard update
                                channel.send({
                                    type: 'broadcast',
                                    event: 'pulse:join',
                                    payload: profile
                                });
                            }
                        }
                    });
            } catch (error) { setStatus('error'); }
        };
        setupPresence();
        return () => {
            isMounted = false;
            if (channel) {
                channel.unsubscribe();
                supabase.removeChannel(channel);
            }
        };
    }, [config?.currentUserId]); // Re-subscribe if user changes

    // ─── 3. Database Pulse (Backup for offline detection) ──────────────────────
    useEffect(() => {
        const fetchInitialDbPresence = async () => {
            const oneMinAgo = new Date(Date.now() - 60000).toISOString(); // Reduced from 3m to 1m for faster recovery
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, role, last_active_at')
                .gt('last_active_at', oneMinAgo);
            
            if (data) {
                const map: Record<string, any> = {};
                data.forEach(p => { map[p.id] = p; });
                setDbOnlineUsers(map);
            }
        };

        fetchInitialDbPresence();

        const cleanup = setInterval(() => {
            const now = Date.now();
            setDbOnlineUsers(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(id => {
                    if (now - new Date(next[id].last_active_at).getTime() >= 60000) { // Threshold reduced from 3m to 1m
                        delete next[id];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 10000); // Interval reduced from 60s to 10s for 'instant' presence synchronization

        return () => { 
            clearInterval(cleanup);
        };
    }, []);

    // ─── 4. Final Aggregation ────────────────────────────────────────────────────
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

    const onlineStudents = useMemo(() => 
        mergedUsers.filter(u => {
            const r = (u.role || '').toLowerCase();
            return !STAFF_ROLES.has(r);
        }),
    [mergedUsers]);

    return {
        onlineUsers: mergedUsers,
        onlineCount: mergedUsers.length,
        onlineStudents,
        connectionStatus: status
    };
}
