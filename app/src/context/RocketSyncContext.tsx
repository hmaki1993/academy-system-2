import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from './ThemeContext';

interface RocketSyncContextType {
    activePlan: any;
    targetJumps: number;
    targetTime: number;
    isRemoteLocked: boolean;
    isRemotePaused: boolean;
    scheduledRemaining: number | null;
    lastPulse: string;
    studentId: string | null;
    refreshPlan: () => Promise<void>;
}

const RocketSyncContext = createContext<RocketSyncContextType | undefined>(undefined);

export const RocketSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userProfile } = useTheme();
    const [activePlan, setActivePlan] = useState<any>(null);
    const [targetJumps, setTargetJumps] = useState<number>(() => Number(sessionStorage.getItem('ai_session_target_jumps')) || 0);
    const [targetTime, setTargetTime] = useState<number>(() => Number(sessionStorage.getItem('ai_session_countdown_mins')) || 0);
    const [isRemoteLocked, setIsRemoteLocked] = useState(true);
    const [isRemotePaused, setIsRemotePaused] = useState(false);
    const [scheduledRemaining, setScheduledRemaining] = useState<number | null>(null);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [lastPulse, setLastPulse] = useState(new Date().toISOString());
    const channelRef = useRef<any>(null);

    const fetchLatestPlan = async () => {
        if (!userProfile?.id) return;
        try {
            const { data: stData } = await supabase.from('students').select('id').eq('profile_id', userProfile.id).maybeSingle();
            if (stData) {
                setStudentId(stData.id);
                const { data, error } = await supabase
                    .from('training_plans')
                    .select('*')
                    .eq('student_id', stData.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    setActivePlan(data);
                    setIsRemoteLocked(data.status === 'idle');
                    setIsRemotePaused(data.status === 'paused');
                    
                    // Sync local state if DB has values
                    if (data.target_jumps) setTargetJumps(data.target_jumps);
                    if (data.target_time) setTargetTime(data.target_time);
                }
            }
        } catch (e) {
            console.error('RocketSync: Fetch error', e);
        }
    };

    useEffect(() => {
        console.log('🚀 ROCKET_SYNC: Phase 1 (Engine Initialization)...', { hasProfile: !!userProfile?.id });
        
        if (!userProfile?.id) {
            console.log('🚀 ROCKET_SYNC: Waiting for User Identity...');
            return;
        }

        // 🟢 INITIAL HYDRATION: Fetch the latest plan from DB on mount
        fetchLatestPlan();

        const channelId = `user-notifications:${userProfile.id}`;
        console.log(`🚀 ROCKET_SYNC: [TALQA_ACTIVE] Initializing high-speed channel [${channelId}]`);
        // @ts-ignore
        window.ROCKET_SYNC_CHANNEL = channelId;

        // 🔊 AUDIO PROACTIVE RESUME: Fix the 'AudioContext was not allowed to start' hurdle
        const resumeAudio = () => {
            if (supabase.realtime) {
                // This triggers a subtle gesture-based activation for all audio contexts if needed
                console.log('🔊 ROCKET_SYNC: Audio System Resumed via Identity Pulse.');
                window.removeEventListener('click', resumeAudio);
            }
        };
        window.addEventListener('click', resumeAudio);

        const channel = supabase.channel(channelId)
            .on('broadcast', { event: 'SYNC_ALERTS' }, ({ payload }) => {
                console.log('🚀 ROCKET_SYNC: [PULSE_RECEIVED] Bullet data incoming!', payload);
                setLastPulse(new Date().toISOString());

                if (payload.target_jumps !== undefined) {
                    const val = Number(payload.target_jumps) || 0;
                    setTargetJumps(val);
                    sessionStorage.setItem('ai_session_target_jumps', String(val));
                }

                if (payload.target_time !== undefined) {
                    const mins = Number(payload.target_time) || 0;
                    setTargetTime(mins);
                    sessionStorage.setItem('ai_session_countdown_mins', String(mins));
                }

                if (payload.scheduled_start !== undefined) {
                    const now = new Date();
                    let targetDate;
                    if (payload.scheduled_start && String(payload.scheduled_start).includes('T')) {
                        targetDate = new Date(payload.scheduled_start);
                    } else {
                        const [targetH, targetM] = String(payload.scheduled_start || "00:00").split(':').map(Number);
                        targetDate = new Date();
                        targetDate.setHours(targetH, targetM, 0, 0);
                        if (targetDate.getTime() <= now.getTime() - 60000) targetDate.setDate(targetDate.getDate() + 1);
                    }
                    const diff = Math.ceil((targetDate.getTime() - now.getTime()) / 1000);
                    setScheduledRemaining(diff > 0 ? diff : 0);
                }

                if (payload.status) {
                    const status = payload.status;
                    // 🚀 INSTANT HYDRATION: Deep merge payload into local activePlan to bypass DB delay
                    setActivePlan((prev: any) => ({ 
                        ...(prev || {}), 
                        status, 
                        scheduled_start: payload.scheduled_start || (prev?.scheduled_start),
                        target_jumps: payload.target_jumps !== undefined ? Number(payload.target_jumps) : prev?.target_jumps,
                        target_time: payload.target_time !== undefined ? Number(payload.target_time) : prev?.target_time
                    }));
                    
                    if (status === 'live') {
                        setIsRemoteLocked(false);
                        setIsRemotePaused(false);
                    } else if (status === 'paused') {
                        setIsRemotePaused(true);
                    } else if (status === 'idle') {
                        // 🧹 NUCLEAR RESET: Clean the UI when session ends
                        setIsRemoteLocked(true);
                        setScheduledRemaining(null);
                        setTargetJumps(0);
                        setTargetTime(0);
                        sessionStorage.removeItem('ai_session_target_jumps');
                        sessionStorage.removeItem('ai_session_countdown_mins');
                    } else if (status === 'scheduled') {
                        setIsRemoteLocked(false);
                    }
                }

                // 🛡️ RACE CONDITION FIX: Do NOT fetch from DB immediately as the update might still be in progress.
                // The broadcast payload already has the ground truth for the UI.
                if (payload.type === 'REFRESH_REQUIRED') fetchLatestPlan();
            })
            .on('broadcast', { event: 'mission-alert' }, (payload) => {
                console.log('🚀 ROCKET_SYNC: MISSION_ALERT BACKUP RECEIVED!', payload);
                fetchLatestPlan();
            })
            .subscribe((status) => {
                console.log(`🚀 ROCKET_SYNC: [STATUS] Channel State: ${status} for [${channelId}]`);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ ROCKET_SYNC: [TALQA_READY] Ready for bullets!');
                    
                    // 🛡️ Ensure channel is 'joined' before firing ACK pulse to avoid REST fallback warning
                    setTimeout(() => {
                        if (channel.state === 'joined') {
                            channel.send({
                                type: 'broadcast',
                                event: 'STUDENT_ACK',
                                payload: { userId: userProfile.id, timestamp: new Date().toISOString() }
                            });
                        }
                    }, 500);
                }
            });

        channelRef.current = channel;

        // Presence Heartbeat (Aggressive for Rocket Sync)
        const heartbeat = setInterval(() => {
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'STUDENT_ACK',
                    payload: { userId: userProfile.id, status: 'online', timestamp: new Date().toISOString() }
                });
            }
        }, 5000);

        // ⏱️ COUNTDOWN ENGINE: Reactive 1s pulse to update scheduledRemaining
        const countdown = setInterval(() => {
            if (activePlan?.status === 'scheduled' && activePlan?.scheduled_start) {
                const now = new Date().getTime();
                const start = new Date(activePlan.scheduled_start).getTime();
                const diff = Math.max(0, Math.floor((start - now) / 1000));
                setScheduledRemaining(diff);

                // 🚀 AUTO-LIVE: Force status to 'live' when countdown hits zero
                if (diff === 0) {
                    console.log('🚀 ROCKET_SYNC: [AUTO_LIVE] Timer expired! Launching mission...');
                    setActivePlan((prev: any) => ({ ...prev, status: 'live' }));
                    setIsRemoteLocked(false);
                }
            } else if (activePlan?.status !== 'scheduled') {
                if (scheduledRemaining !== null) setScheduledRemaining(null);
            }
        }, 1000);

        return () => {
            clearInterval(heartbeat);
            clearInterval(countdown);
            supabase.removeChannel(channel);
        };
    }, [userProfile?.id, activePlan?.id, activePlan?.status, activePlan?.scheduled_start, scheduledRemaining]);

    return (
        <RocketSyncContext.Provider value={{
            activePlan,
            targetJumps,
            targetTime,
            isRemoteLocked,
            isRemotePaused,
            scheduledRemaining,
            lastPulse,
            studentId,
            refreshPlan: fetchLatestPlan
        }}>
            {children}
        </RocketSyncContext.Provider>
    );
};

export const useRocketSync = () => {
    const context = useContext(RocketSyncContext);
    if (!context) throw new Error('useRocketSync must be used within RocketSyncProvider');
    return context;
};
