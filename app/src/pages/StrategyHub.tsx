import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Clock, Flame, CheckCircle2, X, Calculator, Send,
    Pause, RefreshCcw, RotateCcw, Settings2, Zap, PlayCircle, Activity, UserCircle2, Trophy, History, Sparkles, Loader2,
    Users, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJumpRopeAdminStats, useJumpRopeAccess, useTrainingPlanHistory, useAthleteActivityHistory } from '../hooks/useData';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useSmartPlan, TrainingMetric, GeneratedPlan } from '../hooks/useSmartPlan';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';


// --- Sub-Component: Floating Remote Control Hub ---
const FloatingRemoteHub = ({ athlete, onClose }: { athlete: any, onClose: () => void }) => {
    const { t } = useTranslation();
    const { sendDirectTargets, updateSessionStatus, isSending } = useSmartPlan();
    const [liveJumps, setLiveJumps] = useState<number | ''>('');
    const [liveTime, setLiveTime] = useState<number | ''>('');
    const [isAthletePresent, setIsAthletePresent] = useState(false);
    const hasToasted = React.useRef(false);

    // ─── Bidirectional Handshake: Listen for Athlete Presence ─────────────────
    useEffect(() => {
        if (!athlete?.userId) return;
        const channel = supabase.channel(`direct_broadcasts_${athlete.userId}`)
            .on('broadcast', { event: 'STUDENT_ACK' }, () => {
                setIsAthletePresent(true);
                if (!hasToasted.current) {
                    toast.success(`${athlete.name} is ready!`, {
                        icon: '🚀',
                        style: { background: '#0b0e18', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
                    });
                    hasToasted.current = true;
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [athlete?.userId, athlete.name]);

    const now = useMemo(() => new Date(), []);
    const initialH24 = now.getHours();
    const initialMM = String(now.getMinutes()).padStart(2, '0');
    const initialPeriod = initialH24 >= 12 ? 'PM' : 'AM';
    
    const [scheduledStartTime, setScheduledStartTime] = useState<string>(`${String(initialH24).padStart(2, '0')}:${initialMM}`); // Stores as HH:mm (24h)
    const [period, setPeriod] = useState<'AM' | 'PM'>(initialPeriod);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    
    const hRef = React.useRef<HTMLDivElement>(null);
    const mRef = React.useRef<HTMLDivElement>(null);
    const pRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to current time on mount
    React.useEffect(() => {
        const itemHeight = 36;
        const currentH12 = initialH24 === 0 ? 12 : (initialH24 > 12 ? initialH24 - 12 : initialH24);
        const currentMM = Number(initialMM);
        const pIdx = initialPeriod === 'AM' ? 0 : 1;

        if (hRef.current) hRef.current.scrollTop = (currentH12 - 1) * itemHeight;
        if (mRef.current) mRef.current.scrollTop = currentMM * itemHeight;
        if (pRef.current) pRef.current.scrollTop = pIdx * itemHeight;
    }, [initialH24, initialMM, initialPeriod]);
    const dragRef = React.useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
    const hubRef = React.useRef<HTMLDivElement>(null);

    // ─── Click Outside to Close ─────────────────
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (hubRef.current && !hubRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        // Add listener with a slight delay to avoid immediate closing on trigger
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const onMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };
        const onMove = (ev: MouseEvent) => {
            if (!dragRef.current) return;
            setPos({ x: dragRef.current.startPosX + (ev.clientX - dragRef.current.startX), y: dragRef.current.startPosY + (ev.clientY - dragRef.current.startY) });
        };
        const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return createPortal(
        <div className="fixed inset-0 z-[999] pointer-events-none flex items-start sm:items-center justify-center pt-32 sm:pt-0 sm:block sm:inset-auto sm:bottom-10 sm:left-12 sm:translate-y-0">
            <div
                ref={hubRef}
                className="pointer-events-auto w-60 bg-[#0b0e18] border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col gap-3 animate-in zoom-in-95 fade-in duration-200"
                style={{ 
                    transform: window.innerWidth < 640 
                        ? 'none' 
                        : `translate(${pos.x}px, ${pos.y}px)` 
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header — drag zone */}
                <div
                    className="flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={onMouseDown}
                >
                    <div className="flex items-center gap-1.5">
                        <Zap size={10} className="text-cyan-400 fill-cyan-400" />
                        <span className="text-[7px] font-black text-white/60 uppercase tracking-widest">{t('strategy.control')}</span>
                    </div>
                    {/* X — red, no background */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="w-8 h-8 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-500/50 hover:text-red-400 transition-all flex items-center justify-center"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="px-3 py-2.5">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">{t('strategy.jumps')}</span>
                        <input
                            type="number"
                            value={liveJumps}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setLiveJumps(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-transparent text-sm font-black text-white outline-none border-b border-white/10 pb-1 focus:border-emerald-500/50 transition-colors"
                        />
                    </div>
                    <div className="px-3 py-2.5">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] block mb-2">{t('strategy.time')}</span>
                        <input
                            type="number"
                            value={liveTime}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setLiveTime(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-transparent text-sm font-black text-white outline-none border-b border-white/10 pb-1 focus:border-emerald-500/50 transition-colors"
                        />
                    </div>
                </div>


                {/* Small Transparent 3D Wheel Time Picker */}
                <div className="relative overflow-hidden group py-1">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-emerald-500/80" />
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{t('strategy.launchSchedule')}</span>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setScheduledStartTime(''); }}
                            className="text-[8px] font-black text-red-500/40 hover:text-red-500 uppercase tracking-widest transition-colors"
                        >
                            {t('strategy.reset')}
                        </button>
                    </div>

                    <div className="relative flex justify-center h-28 items-center gap-1 sm:gap-2">
                        {/* 3D Visual Guides - Center Glass Bar */}
                        <div className="absolute inset-x-0 h-10 bg-emerald-500/[0.08] border-y border-emerald-500/20 rounded-md pointer-events-none z-10" />
                        
                        {/* Hours Wheel */}
                        <div 
                            ref={hRef}
                            className="flex-1 h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-10 perspective-1000 mask-fade-edges"
                            onScroll={(e: any) => {
                                const itemHeight = 36;
                                const h12 = Math.round(e.target.scrollTop / itemHeight) + 1;
                                if (h12 < 1 || h12 > 12) return;
                                const h24 = period === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
                                const mm = scheduledStartTime.split(':')[1] || '00';
                                setScheduledStartTime(`${String(h24).padStart(2, '0')}:${mm}`);
                            }}>
                            {Array.from({ length: 12 }).map((_, i) => {
                                const h = i + 1;
                                const currentH24 = Number(scheduledStartTime.split(':')[0] || 0);
                                const currentH12 = currentH24 === 0 ? 12 : (currentH24 > 12 ? currentH24 - 12 : currentH24);
                                const isActive = currentH12 === h;
                                return (
                                    <div key={h} className="h-9 flex items-center justify-center snap-center transition-all duration-300">
                                        <span className={`text-base font-black tracking-tight transition-colors duration-300 ${isActive ? 'text-emerald-400 scale-125' : 'text-white/20'}`}>
                                            {String(h).padStart(2, '0')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <span className="text-white/10 font-black text-xl mb-1">:</span>

                        {/* Minutes Wheel */}
                        <div 
                            ref={mRef}
                            className="flex-1 h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-10 perspective-1000 mask-fade-edges"
                            onScroll={(e: any) => {
                                const itemHeight = 36;
                                const mm = Math.round(e.target.scrollTop / itemHeight);
                                if (mm < 0 || mm > 59) return;
                                const hh = scheduledStartTime.split(':')[0] || '00';
                                setScheduledStartTime(`${hh}:${String(mm).padStart(2, '0')}`);
                            }}>
                            {Array.from({ length: 60 }).map((_, i) => {
                                const isActive = (scheduledStartTime.split(':')[1] || '00') === String(i).padStart(2, '0');
                                return (
                                    <div key={i} className="h-9 flex items-center justify-center snap-center transition-all duration-300">
                                        <span className={`text-base font-black tracking-tight transition-colors duration-300 ${isActive ? 'text-emerald-400 scale-125' : 'text-white/20'}`}>
                                            {String(i).padStart(2, '0')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* AM/PM Wheel */}
                        <div 
                            ref={pRef}
                            className="flex-none h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-10 w-14 mask-fade-edges"
                            onScroll={(e: any) => {
                                const itemHeight = 36;
                                const pIdx = Math.round(e.target.scrollTop / itemHeight);
                                const newP = pIdx === 0 ? 'AM' : 'PM';
                                if (newP === period) return;
                                setPeriod(newP);
                                const h24Old = Number(scheduledStartTime.split(':')[0] || 0);
                                const h12 = h24Old === 0 ? 12 : (h24Old > 12 ? h24Old - 12 : h24Old);
                                const h24New = newP === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
                                const mm = scheduledStartTime.split(':')[1] || '00';
                                setScheduledStartTime(`${String(h24New).padStart(2, '0')}:${mm}`);
                            }}>
                            {['AM', 'PM'].map((p) => (
                                <div key={p} className="h-9 flex items-center justify-center snap-center transition-all duration-300">
                                    <span className={`text-[10px] font-black tracking-[0.1em] transition-colors duration-300 ${period === p ? 'text-white' : 'text-white/10'}`}>
                                        {p}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Shadow Gradients (Inner) */}
                    <div className="absolute top-12 inset-x-0 h-8 bg-gradient-to-b from-[#0b0e18] to-transparent pointer-events-none z-20 opacity-80" />
                    <div className="absolute bottom-4 inset-x-0 h-8 bg-gradient-to-t from-[#0b0e18] to-transparent pointer-events-none z-20 opacity-80" />
                </div>

                <style>{`
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                    .perspective-1000 { perspective: 1000px; }
                    .mask-fade-edges {
                        mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
                    }
                `}</style>

                {/* Control Icons — gap-2 */}
                <div className="flex items-center gap-2 mt-2">
                    {/* Restart: Always Active */}
                    <button onClick={(e) => { 
                        e.stopPropagation(); 
                        updateSessionStatus(athlete.userId, 'restarting'); 
                    }}
                        className="flex-1 h-10 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-black flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-orange-500/5">
                        <RotateCcw size={16} />
                    </button>
                    
                    {/* Professional Master Controller: Start / Scheduled / Pause / Resume */}
                    {(() => {
                        const status = athlete.status || 'idle';
                        const isLive = status === 'live';
                        const isPaused = status === 'paused';
                        const isScheduled = status === 'scheduled';
                        const isActive = isLive || isPaused;
                        
                        // 📅 CASE 1: Scheduled Session (Lock controls, allow Override)
                        if (isScheduled) {
                            return (
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        // 🚀 FORCE START NOW: Overrides schedule and starts immediately!
                                        athlete.status = 'live'; 
                                        sendDirectTargets(athlete.userId, Number(liveTime), Number(liveJumps), null); 
                                    }}
                                    className="flex-[2] h-10 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg shadow-cyan-500/10">
                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-60">{t('strategy.override')}</span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] -mt-1">{t('strategy.startNow')}</span>
                                </button>
                            );
                        }

                        // 🛑 CASE 2: No Active Session (Start or Schedule)
                        if (!isActive) {
                            const isPickingFuture = (() => {
                                if (!scheduledStartTime) return false;
                                const [h, m] = scheduledStartTime.split(':').map(Number);
                                const picked = new Date();
                                picked.setHours(h, m, 0, 0);
                                
                                // 💡 Handle Roll-over: If picked time is before current time, it must be for tomorrow
                                if (picked.getTime() <= Date.now()) {
                                    picked.setDate(picked.getDate() + 1);
                                }
                                
                                return picked.getTime() > Date.now() + 30000; // More than 30 seconds in future
                            })();

                            return (
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        // 🎯 Check if we are scheduling or starting
                                        athlete.status = isPickingFuture ? 'scheduled' : 'live';
                                        sendDirectTargets(athlete.userId, Number(liveTime), Number(liveJumps), isPickingFuture ? scheduledStartTime : null); 
                                    }}
                                    className={`flex-[2] h-10 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest shadow-lg ${
                                        isPickingFuture 
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white shadow-blue-500/10'
                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black shadow-emerald-500/10'
                                    }`}>
                                    {isPickingFuture ? <Clock size={14} /> : <PlayCircle size={14} fill="currentColor" />}
                                    <span>{isPickingFuture ? t('strategy.schedule') : t('strategy.start')}</span>
                                </button>
                            );
                        }

                        // ⚡ CASE 3: Active Session (Handshake Lock applied)
                        return (
                            <button 
                                disabled={!isAthletePresent}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const targetStatus = isPaused ? 'live' : 'paused';
                                    athlete.status = targetStatus; 
                                    updateSessionStatus(athlete.userId, targetStatus); 
                                }}
                                className={`flex-[2] h-10 rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-lg disabled:opacity-20 disabled:grayscale disabled:cursor-wait ${
                                    isPaused 
                                        ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black shadow-emerald-500/5' 
                                        : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-black shadow-yellow-500/5'
                                }`}>
                                {isPaused ? <PlayCircle size={18} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                            </button>
                        );
                    })()}

                    {/* Stop: Always Active */}
                    <button onClick={(e) => { 
                        e.stopPropagation(); 
                        athlete.status = 'idle';
                        updateSessionStatus(athlete.userId, 'idle'); 
                    }}
                        className="flex-1 h-10 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/5">
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- Sub-Component: Inline Plan Builder ---
const InlinePlanBuilder = ({ studentId, studentName, onClose, onSendReady, existingPlan }: { studentId: string, studentName: string, onClose: () => void, onSendReady?: (fn: () => void) => void, existingPlan?: any }) => {
    const { t, i18n } = useTranslation();
    const { sendPlan, isSending } = useSmartPlan();
    const [metrics, setMetrics] = useState<TrainingMetric>({
        age: 25,
        weight: 70,
        height: 165,
        daysPerWeek: 3,
        gender: 'female',
        language: 'en'
    });

    const [bmr, setBmr] = useState(0);
    const [tdee, setTdee] = useState(0);
    const [targetCalories, setTargetCalories] = useState(0);

    const [editablePlan, setEditablePlan] = useState<GeneratedPlan['weeklyPlan']>([]);

    const isAr = metrics.language === 'ar';

    // 1. Load Existing Plan if available
    useEffect(() => {
        if (existingPlan && existingPlan.plan_content) {
            setEditablePlan(existingPlan.plan_content);
            setBmr(existingPlan.bmr || 0);
            setTdee(existingPlan.tdee || 0);
            setTargetCalories(existingPlan.target_calories || 0);
        } else {
            // Default empty day
            setEditablePlan([{
                day: i18n.language === 'ar' ? 'اليوم 1' : 'Day 1',
                focus: i18n.language === 'ar' ? 'هيكل التدريب' : 'Training Structure',
                details: []
            }]);
        }
    }, [existingPlan, i18n.language]);

    // 2. Auto-calculate metrics if side-panel inputs change
    useEffect(() => {
        if (metrics.weight && !!metrics.height && !!metrics.age) {
            const calculatedBmr = (10 * metrics.weight) + (6.25 * metrics.height) - (5 * metrics.age) - (metrics.gender === 'male' ? -5 : 161);
            const calculatedTdee = calculatedBmr * 1.375;
            setBmr(Math.round(calculatedBmr));
            setTdee(Math.round(calculatedTdee));
            setTargetCalories(Math.round(calculatedTdee * 0.8));
        }
    }, [metrics.weight, metrics.height, metrics.age, metrics.gender]);

    const handleUpdateDay = (index: number, field: string, value: string) => {
        const newPlan = [...editablePlan];
        newPlan[index] = { ...newPlan[index], [field]: value };
        setEditablePlan(newPlan);
    };

    const handleUpdateDetailsArea = (dayIndex: number, text: string) => {
        const newPlan = [...editablePlan];
        newPlan[dayIndex] = { ...newPlan[dayIndex], details: text.split('\n') };
        setEditablePlan(newPlan);
    };

    const handleAddDay = () => {
        setEditablePlan([...editablePlan, {
            day: isAr ? `اليوم ${editablePlan.length + 1}` : `Day ${editablePlan.length + 1}`,
            focus: isAr ? 'هيكل التدريب' : 'Training Structure',
            details: []
        }]);
    };

    const handleRemoveDay = (index: number) => {
        setEditablePlan(editablePlan.filter((_, i) => i !== index));
    };

    const handleSend = React.useCallback(async () => {
        try {
            toast.loading('Sending plan...', { id: 'save-plan' });
            // Strip out empty details strings that might happen if coach hit enter twice
            const cleanPlan = editablePlan.map(day => ({
                ...day,
                details: Array.isArray(day.details) ? day.details.filter(d => d && d.trim() !== '') : []
            }));

            const finalPlan = {
                bmr,
                tdee,
                targetCalories,
                weeklyPlan: cleanPlan
            };
            
            await sendPlan(studentId, finalPlan);

            // 🔔 PERSISTENT NOTIFICATION: Record in DB
            await supabase.from('notifications').insert({
                user_id: studentId, 
                title: 'Tactical Blueprint',
                message: 'Coach updated your Training Strategy. Check it now.',
                type: 'info',
                is_read: false
            });

            // 📻 BROADCAST SIGNAL: Tell student to refresh UI instantly (Bypasses 400 DB errors)
            const syncChannel = supabase.channel(`athlete-broadcast-${studentId}`);
            await syncChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await syncChannel.send({
                        type: 'broadcast',
                        event: 'SYNC_ALERTS',
                        payload: { type: 'STRATEGY_UPDATE', timestamp: new Date().toISOString() }
                    });
                    // Clean up temp channel
                    supabase.removeChannel(syncChannel);
                }
            });

            // Duplicate toast removed, hook handles notification.

            onClose();
        } catch (err: any) {
            console.error("handleSend FAILED: ", err);
            toast.error(`Error saving plan: ${err.message}`, { id: 'save-plan' });
        }
    }, [editablePlan, bmr, tdee, targetCalories, studentId]);

    // Expose the send function to parent via callback
    useEffect(() => {
        if (onSendReady) {
            onSendReady(handleSend);
        }
    }, [handleSend, onSendReady]);

    return (
        <div className="flex flex-col space-y-6 animate-in slide-in-from-top-4 duration-500">
            {/* 1. Header & Language Toggle */}
            <div className="flex flex-col items-center justify-center gap-4 py-4 sm:py-8 relative">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-orange-500/10 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                        <Activity size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-black text-white tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-none drop-shadow-2xl text-center sm:text-left">
                            {t('strategy.strategyBuilder')}
                        </h1>
                        <div className="h-1 w-8 sm:w-12 bg-orange-500 rounded-full mt-2 mx-auto sm:mx-0" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <p className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.4em] sm:tracking-[0.6em] text-center px-4">
                        {t('strategy.customManualStrategy', { name: studentName })}
                    </p>
                    {/* Centered Premium Timestamp */}
                    <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-3xl flex items-center gap-2 sm:gap-3">
                        <Clock size={8} className="text-orange-500/40 sm:w-[10px] sm:h-[10px]" />
                        <span className="text-[7px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.3em] sm:tracking-[0.4em] tabular-nums">
                            {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                </div>

                <div className="relative sm:absolute right-0 top-auto sm:top-1/2 sm:-translate-y-1/2 mt-2 sm:mt-0">
                    <div className="flex bg-white/5 p-1 rounded-xl backdrop-blur-xl border border-white/10">
                        {(['en', 'ar'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => setMetrics({ ...metrics, language: lang })}
                                className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${metrics.language === lang ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 relative z-10">
                {/* SIDEBAR: Manual Metrics */}
                <div className="w-full lg:w-[220px] shrink-0 space-y-3">
                    <div className="p-5 rounded-[2rem] bg-white/[0.01] border border-white/5 flex flex-col gap-5 relative group/bio">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[40px] rounded-full group-hover/bio:bg-orange-500/10 transition-all duration-700" />
                        <h3 className="text-[8px] font-black uppercase tracking-[0.5em] text-white/10 mb-1">
                            {t('strategy.bioMetrics')}
                        </h3>
                        
                        {[
                            { label: t('strategy.weight'), value: metrics.weight, key: 'weight', unit: 'kg' },
                            { label: t('strategy.height'), value: metrics.height, key: 'height', unit: 'cm' },
                            { label: t('strategy.age'), value: metrics.age, key: 'age', unit: 'yrs' }
                        ].map(m => (
                            <div key={m.key} className="group/input space-y-1 relative">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[7px] font-black uppercase tracking-[0.3em] text-white/20 group-hover/input:text-orange-500/40 transition-colors uppercase">{m.label}</label>
                                    <span className="text-[5px] font-black text-white/10 uppercase tracking-widest">{m.unit}</span>
                                </div>
                                <input
                                    type="number"
                                    value={m.value || ''}
                                    onChange={e => setMetrics({ ...metrics, [m.key]: e.target.value === '' ? '' : Number(e.target.value) })}
                                    className="w-full h-8 bg-transparent border-b border-white/5 text-[12px] font-black text-white outline-none focus:border-orange-500/20 px-1 transition-all"
                                />
                            </div>
                        ))}

                        <div className="pt-4 mt-2 space-y-3.5 border-t border-white/[0.03]">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                <span className="text-white/10 italic">BMR</span>
                                <span className="text-white/40 tabular-nums">{bmr || 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                <span className="text-white/10 italic">TDEE</span>
                                <span className="text-white/40 tabular-nums">{tdee || 0}</span>
                            </div>
                            
                            <div className="flex flex-col items-center pt-2 gap-1 group">
                                <span className="text-[6px] font-black uppercase tracking-[0.5em] text-orange-500/30 group-hover:text-orange-500 transition-colors">{t('strategy.dailyTarget')}</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">{targetCalories || 0}</span>
                                    <span className="text-[8px] font-bold text-orange-500/20 uppercase italic">Kcal</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tactical Divider */}
                <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/[0.03] to-transparent shrink-0" />
                <div className="block lg:hidden h-px w-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent my-4" />

                {/* MAIN EDITOR: Day Grid */}
                <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 relative z-10 w-full animate-in fade-in duration-700 px-4">
                        {editablePlan.map((d, i) => (
                            <div key={i} className="group/item flex flex-col gap-6 relative">
                                {/* Header Info */}
                                <div className="flex flex-col gap-3 border-b border-white/[0.03] pb-4 transition-colors group-hover/item:border-orange-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] group-hover/item:scale-150 transition-transform duration-500" />
                                            <input 
                                                value={d.day} 
                                                onChange={e => handleUpdateDay(i, 'day', e.target.value)} 
                                                className="bg-transparent text-sm font-black text-white uppercase tracking-[0.2em] outline-none w-24" 
                                                placeholder={t('strategy.jumps')}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveDay(i)}
                                            className="w-7 h-7 rounded-lg bg-red-500/5 text-red-500 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <input 
                                        value={d.focus} 
                                        onChange={e => handleUpdateDay(i, 'focus', e.target.value)} 
                                        className="bg-transparent text-[10px] font-black text-orange-500/40 group-hover/item:text-orange-500 uppercase tracking-[0.3em] outline-none w-full transition-colors ml-4" 
                                        placeholder={t('strategy.focusArea')}
                                    />
                                </div>

                                {/* Details Editor */}
                                <div className="relative pl-4 h-48">
                                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-orange-500/20 via-transparent to-transparent" />
                                    <textarea 
                                        value={d.details.join('\n')} 
                                        onChange={e => handleUpdateDetailsArea(i, e.target.value)}
                                        className="w-full h-full bg-transparent text-[12px] font-bold text-white/50 focus:text-white outline-none resize-none custom-scrollbar leading-[1.8] tracking-wide placeholder:text-white/5"
                                        placeholder={t('strategy.writeTrainingDetails')}
                                    />
                                </div>
                            </div>
                        ))}
                        
                        {/* Minimalist Add Button */}
                        <div className="flex items-center justify-center min-h-[16rem]">
                            <button 
                                onClick={handleAddDay}
                                className="group/add flex flex-col items-center gap-4 transition-all active:scale-95"
                            >
                                <div className="w-12 h-12 rounded-full border border-dashed border-white/20 group-hover/add:border-orange-500/50 flex items-center justify-center text-white/10 group-hover/add:text-orange-500 transition-all duration-500 group-hover/add:rotate-90">
                                    <span className="text-2xl font-light">+</span>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/10 group-hover/add:text-orange-500 transition-colors">
                                    {t('strategy.addDay')}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub-Component: Athlete Detail Modal ---
const AthleteDetailModal = ({ athlete, onClose, autoOpenGenerator = false }: { athlete: any, onClose: () => void, autoOpenGenerator?: boolean }) => {
    const { t, i18n } = useTranslation();
    const [showGenerator, setShowGenerator] = useState(autoOpenGenerator);
    const [activeTab, setActiveTab] = useState<'strategy' | 'activity'>('strategy');
    const sendPlanRef = React.useRef<(() => void) | null>(null);
    
    const handleSendReady = useCallback((fn: () => void) => {
        sendPlanRef.current = fn;
    }, []);

    const { data: history, isLoading: isHistoryLoading } = useTrainingPlanHistory(athlete.userId);
    const { data: activityHistory, isLoading: isActivityLoading } = useAthleteActivityHistory(athlete.userId);
    const { sendDirectTargets, updateSessionStatus, isSending } = useSmartPlan();

    return (
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-400 font-sans overflow-hidden">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(249,115,22,0.4); }
            `}</style>

            <div className="flex-1 flex flex-col max-w-[1800px] mx-auto w-full relative overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-6 sm:gap-0 min-h-[7rem] relative">
                    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12 flex-1 w-full sm:w-auto">
                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 sm:pr-12 sm:border-r sm:border-white/5 h-auto">
                            <div className="w-20 h-20 sm:w-14 sm:h-14 rounded-[2rem] sm:rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl transition-transform hover:scale-105">
                                {athlete.avatarUrl ? <img src={athlete.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={32} className="text-orange-500/40" />}
                            </div>
                            <div className="flex flex-col justify-center text-center sm:text-left">
                                <h3 className="text-2xl sm:text-2xl font-black tracking-tighter text-white uppercase leading-none mb-2 sm:mb-0">{athlete.name}</h3>
                                <div className="flex flex-col mt-1 sm:mt-1.5 gap-1">
                                    <span className="text-[8px] sm:text-[8px] font-black text-orange-500 uppercase tracking-[0.3em] font-sans">Athlete Profile</span>
                                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-8 text-[9px] sm:text-[10px] font-black text-white/70 uppercase tracking-widest mt-3 sm:mt-4">
                                        {athlete.email && <span className="max-w-[200px] sm:max-w-none truncate">{athlete.email}</span>}
                                        {athlete.phone && <span className="text-green-500 shrink-0">WhatsApp: {athlete.phone}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-6 right-6 sm:relative sm:top-auto sm:right-auto">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500/60 hover:text-red-500 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-300 group shadow-lg shadow-red-500/5"
                        >
                            <X size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar">
                    {/* Full Width Content Container for Immersive View */}
                    <div className="max-w-[1700px] mx-auto space-y-6 sm:space-y-10 pb-32 pt-6">
                        {/* Quick Metrics Bar - Enlarged for and mobile */}
                        <div className="flex items-center justify-around py-8 sm:py-10 border-b border-white/5 relative z-10 gap-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 text-center">{t('strategy.collectiveJumps')}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg sm:text-2xl font-black text-blue-400 tabular-nums">{athlete.totalJumps.toLocaleString()}</span>
                                    <Trophy size={14} className="text-blue-400/20" />
                                </div>
                            </div>
                            <div className="w-px h-10 bg-white/5" />
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 text-center">{t('strategy.lastActive')}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg sm:text-2xl font-black text-white tabular-nums">{athlete.lastActiveAt ? format(new Date(athlete.lastActiveAt), 'HH:mm') : t('strategy.offline')}</span>
                                    <History size={14} className="text-white/10" />
                                </div>
                            </div>
                            <div className="w-px h-10 bg-white/5" />
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 text-center">{t('strategy.energyLoad')}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg sm:text-2xl font-black text-red-500 tabular-nums">{athlete.sessionsCount}</span>
                                    <span className="text-xs font-black text-red-500/40 -ml-1">{t('strategy.sessions')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-10">
                            <div className="flex items-center gap-4 w-full sm:w-fit px-4">
                                <button
                                    onClick={() => setActiveTab('strategy')}
                                    className={`relative px-6 sm:px-8 py-3 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[.3em] transition-all ${activeTab === 'strategy' ? 'text-orange-400' : 'text-white/20 hover:text-white/50'}`}
                                >
                                    {t('strategy.strategy')}
                                    {activeTab === 'strategy' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]" />}
                                </button>
                                
                                <div className="w-px h-4 bg-white/10 rotate-[15deg] hidden sm:block" />
                                
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`relative px-6 sm:px-8 py-3 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[.3em] transition-all ${activeTab === 'activity' ? 'text-blue-400' : 'text-white/20 hover:text-white/50'}`}
                                >
                                    {t('strategy.activity')}
                                    {activeTab === 'activity' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                                </button>
                            </div>
                            
                            {/* Quick Generate Plan Button - Scaled down and balanced */}
                            <button
                                onClick={() => setShowGenerator(true)}
                                title="Generate Smart Plan"
                                className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 transition-all active:scale-90 shrink-0 group"
                            >
                                <span className="text-lg font-black leading-none group-hover:rotate-90 transition-transform">+</span>
                            </button>
                        </div>

                        {activeTab === 'strategy' ? (
                            <div className="animate-in fade-in duration-500 space-y-8">
                                {showGenerator ? (
                                    <InlinePlanBuilder
                                        studentId={athlete.userId}
                                        studentName={athlete.name}
                                        onClose={() => setShowGenerator(false)}
                                        onSendReady={handleSendReady}
                                        existingPlan={history?.[0]}
                                    />
                                ) : (
                                    <>
                                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[.4em] flex items-center gap-3 mb-6">
                                            <History size={14} /> {t('strategy.trainingPlanArchives')}
                                        </h4>

                                        {isHistoryLoading ? (
                                            <div className="flex flex-col items-center justify-center py-10 gap-4">
                                                <Loader2 className="animate-spin text-orange-500" />
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{t('strategy.retrievingArchives')}</p>
                                            </div>
                                        ) : history?.length === 0 ? (
                                            <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4">
                                                <Sparkles size={32} className="text-white/10" />
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest px-10">{t('strategy.noArchives')}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-12">
                                                {history?.map((plan: any, idx: number) => (
                                                    <div key={idx} className="relative group px-2 sm:px-4">
                                                        {/* Section Line Index */}
                                                        <div className="absolute -left-4 sm:-left-8 top-1/2 -translate-y-1/2 w-8 sm:w-16 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
                                                        
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-y-10 group-hover:translate-x-1 transition-transform duration-500">
                                                            <div className="flex flex-col gap-2.5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-1.5 rounded-lg ${idx === 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/20'} transition-colors`}>
                                                                        <Flame size={12} strokeWidth={3} />
                                                                    </div>
                                                                    <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${idx === 0 ? 'text-orange-500' : 'text-white/20'}`}>
                                                                        {idx === 0 ? t('strategy.currentActiveStrategy') : `${t('strategy.tacticalSchema')} V${history.length - idx}`}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none ml-0.5">
                                                                    {new Date(plan.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                                </h4>
                                                            </div>

                                                            <div className="flex items-center gap-x-16 sm:gap-x-24">
                                                                <div className="flex flex-col items-center sm:items-start group/stat">
                                                                    <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em] mb-2.5 group-hover/stat:text-primary transition-colors">{t('strategy.dailyTarget')}</span>
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className="text-3xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">{plan.target_calories}</span>
                                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic font-serif">{t('strategy.kcal')}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="w-px h-10 bg-white/5 rotate-[15deg] hidden sm:block" />

                                                                <div className="flex flex-col items-center sm:items-start group/stat">
                                                                    <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em] mb-2.5 group-hover/stat:text-primary transition-colors">{t('strategy.loadIntensity')}</span>
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className="text-3xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">{plan.plan_content?.length || 0}</span>
                                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic font-serif">{t('strategy.daysWeek')}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Cleanup divider except last item */}
                                                        {idx !== history.length - 1 && (
                                                            <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-500">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[.4em] flex items-center gap-3 mb-6">
                                    <Activity size={14} /> {t('strategy.performanceSessionStream')}
                                </h4>
                                {isActivityLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                                        <Loader2 className="animate-spin text-blue-400" />
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{t('strategy.compilingMetrics')}</p>
                                    </div>
                                ) : activityHistory?.length === 0 ? (
                                    <div className="py-20 text-center bg-blue-400/5 border border-dashed border-blue-400/10 rounded-[2.5rem] flex flex-col items-center gap-4">
                                        <Activity size={32} className="text-blue-400/20" />
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest px-10 text-center">{t('strategy.noTrackedActivity')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activityHistory?.map((session: any, idx: number) => (
                                            <div key={idx} className="p-4 sm:p-6 transition-all group relative border-b border-white/[0.03] last:border-none">
                                                <div className="flex items-center justify-between mb-4 relative z-10">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[8px] sm:text-[9px] font-black text-blue-400/60 uppercase tracking-widest">
                                                            {t('strategy.trackedSession')}
                                                        </span>
                                                        <span className="text-[10px] sm:text-xs font-black text-white tracking-[0.2em] uppercase">
                                                            {new Date(session.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })} @ {format(new Date(session.created_at), 'HH:mm')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="px-3 py-1 rounded-full bg-blue-400/10 border border-blue-400/20 text-[8px] sm:text-[9px] font-black text-blue-400 uppercase">
                                                            {session.jumps} {t('strategy.jumpsLabel')}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-8 relative z-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-widest mb-1.5">{t('strategy.totalTime')}</span>
                                                        <span className="text-xs sm:text-sm font-black text-white">
                                                            {Math.floor(session.duration / 60)}m {session.duration % 60}s
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-widest mb-1.5">{t('strategy.activeTime')}</span>
                                                        <span className="text-xs sm:text-sm font-black text-orange-500/80">
                                                            {session.work_duration ? `${Math.floor(session.work_duration / 60)}m ${session.work_duration % 60}s` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-widest mb-1.5">{t('strategy.restTime')}</span>
                                                        <span className="text-xs sm:text-sm font-black text-red-500/40">
                                                            {session.rest_duration ? `${Math.floor(session.rest_duration / 60)}m ${session.rest_duration % 60}s` : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {(session.work_duration && session.duration) && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/[0.02]">
                                                        <div
                                                            className="h-full bg-blue-500/20"
                                                            style={{ width: `${(session.work_duration / session.duration) * 100}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Action Bar - Minimalist Pulsing Text */}
            {showGenerator && activeTab === 'strategy' && (
                <div className="shrink-0 flex justify-center items-center py-6 px-4 bg-transparent">
                    <button
                        onClick={() => {
                            if (sendPlanRef.current) {
                                sendPlanRef.current();
                            } else {
                                console.warn("sendPlanRef.current is null!");
                            }
                        }}
                        className="group flex items-center gap-3 transition-all active:scale-95"
                    >
                        <Send size={16} className="text-orange-500 animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.5em] animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">
                            {t('strategy.commitStrategy')}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};


// --- Strategy Hub Entry Point ---
export default function StrategyHub() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { userProfile } = useTheme();
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'coach' || userProfile?.role === 'head_coach';
    const { data: athletes, isLoading: isAthletesLoading } = useJumpRopeAdminStats();
    const [liveAthletes, setLiveAthletes] = useState<any[]>([]);

    useEffect(() => {
        if (athletes) {
            setLiveAthletes(athletes);
        }
    }, [athletes]);

    useEffect(() => {
        // Realtime monitoring for profiles presence removed to stabilize the system 
        // and eliminate 400 Bad Request errors. Data is fetched on mount.
        return () => { };
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
    const [autoOpenDetailGenerator, setAutoOpenDetailGenerator] = useState(false);

    const filteredAthletes = useMemo(() => {
        return liveAthletes.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [liveAthletes, searchQuery]);

    const [activeRemoteId, setActiveRemoteId] = useState<string | null>(null);

    if (isAthletesLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-20 gap-6">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                <p className="text-xs font-black text-orange-500/40 uppercase tracking-[.4em]">Loading Strategy Hub...</p>
            </div>
        );
    }

    // 🔑 Page Swap: if athlete selected, render full detail page instead of grid
    if (selectedAthlete) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <AthleteDetailModal
                    athlete={selectedAthlete}
                    onClose={() => {
                        setSelectedAthlete(null);
                        setAutoOpenDetailGenerator(false);
                    }}
                    autoOpenGenerator={autoOpenDetailGenerator}
                />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-4 sm:p-6 font-sans relative overflow-hidden bg-transparent min-h-screen">
            {/* Background Aesthetic */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-orange-500/[0.04] blur-[150px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col flex-1">
                {/* Header */}
                <div className="flex flex-col gap-0.5 pb-4 mb-4 -mt-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">
                            <span className="premium-gradient-text">
                                {t('allNavItems.strategyHub')}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex flex-col flex-1 space-y-10">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 sm:gap-16 px-2">
                        {([
                            { label: t('strategy.activeAthletes'), value: athletes?.length || 0, icon: Users, color: 'text-orange-500' },
                            { label: t('strategy.collectiveJumps'), value: athletes?.reduce((sum, a) => sum + a.totalJumps, 0).toLocaleString() || 0, icon: Trophy, color: 'text-blue-400' },
                            { label: 'Neural Status', value: 'OPTIMAL', icon: Activity, color: 'text-green-500' }
                        ] as const).map((stat, i) => (
                            <div key={i} className="flex items-center gap-8 sm:gap-16 relative">
                                <div className="flex flex-col group">
                                    <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.3em] mb-2 group-hover:text-white/30 transition-colors uppercase">{stat.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-2xl font-black tracking-tighter uppercase ${stat.color} drop-shadow-2xl`}>{stat.value}</span>
                                        <stat.icon size={16} className={`${stat.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
                                    </div>
                                </div>
                                {i < 2 && (
                                    <div className="hidden md:block absolute -right-4 sm:-right-8 top-1/2 -translate-y-1/2 w-px h-10 bg-gradient-to-b from-transparent via-white/[0.15] to-transparent rotate-[15deg]" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <div className="flex justify-center items-center gap-3">
                        <Search className="text-white/20" size={14} />
                        <div className="relative w-full max-w-xs">
                            <input
                                type="text"
                                placeholder=""
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 rounded-xl bg-white/[0.02] border border-white/30 px-4 text-[9px] font-black tracking-[0.2em] text-white outline-none focus:border-orange-500/50 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                    </div>

                    {/* Athlete Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredAthletes.map((athlete, i) => (
                            <div
                                key={athlete.userId}
                                onClick={() => setSelectedAthlete(athlete)}
                                className="p-5 rounded-[2rem] bg-slate-900/60 backdrop-blur-3xl border border-white/40 hover:bg-slate-900/80 hover:border-orange-500/80 transition-all cursor-pointer group animate-in slide-in-from-bottom-5 duration-500 shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:shadow-orange-500/10"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform shadow-inner shadow-white/5">
                                            {athlete.avatarUrl ? <img src={athlete.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={24} className="text-white/30" />}
                                        </div>
                                        {(() => {
                                            if (!athlete.lastActiveAt) return (
                                                <div className="flex flex-col">
                                                    <h3 className="text-[12px] font-black tracking-widest text-white uppercase truncate max-w-[100px] font-[var(--font-orbitron)]">{athlete.name}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/20">{t('strategy.offline')}</span>
                                                    </div>
                                                </div>
                                            );
                                            
                                            const lastDate = new Date(athlete.lastActiveAt).getTime();
                                            const now = Date.now();
                                            const diff = now - lastDate;
                                            const isLive = diff < 180000 && diff > -60000;
                                            
                                            return (
                                                <div className="flex flex-col">
                                                    <h3 className="text-[12px] font-black tracking-widest text-white uppercase truncate max-w-[100px] font-[var(--font-orbitron)] line-clamp-1">{athlete.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="relative">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-white/10'}`} />
                                                            {isLive && <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 blur-[3px] animate-pulse" />}
                                                        </div>
                                                        <span className={`text-[7px] font-black uppercase tracking-[0.3em] ${isLive ? 'text-emerald-400/90 animate-pulse' : 'text-white/20'}`}>
                                                            {isLive ? t('strategy.ready') : t('strategy.offline')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="px-3 py-1.5 bg-white/[0.05] border border-white/30 rounded-xl text-right shadow-sm">
                                        <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Verified</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="p-4 bg-black/40 border border-white/20 rounded-2xl flex flex-col items-center justify-center group-hover:bg-black/60 transition-colors shadow-inner shadow-blue-500/5">
                                        <span className="text-[6px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">{t('strategy.collectiveJumps')}</span>
                                        <span className="text-lg font-black text-blue-400 tabular-nums drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]">{athlete.totalJumps.toLocaleString()}</span>
                                    </div>
                                    <div className="p-4 bg-black/40 border border-white/20 rounded-2xl flex flex-col items-center justify-center group-hover:bg-black/60 transition-colors shadow-inner shadow-white/5">
                                        <span className="text-[6px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5">{t('strategy.sessions')}</span>
                                        <span className="text-lg font-black text-white tabular-nums tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{athlete.sessionsCount}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveRemoteId(activeRemoteId === athlete.userId ? null : athlete.userId);
                                        }}
                                        className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 hover:bg-orange-500 hover:text-black transition-all active:scale-95 group/remote shadow-lg shadow-orange-500/5"
                                        title="Remote Control"
                                    >
                                        <Settings2 size={18} className="group-hover/remote:rotate-90 transition-transform duration-500" />
                                    </button>
                                    
                                    <div className="flex items-center gap-3">
                                        {/* Quick Generate Plan Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAutoOpenDetailGenerator(true);
                                                setSelectedAthlete(athlete);
                                            }}
                                            title="Generate Smart Plan"
                                            className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500/60 hover:bg-red-500 hover:text-white hover:border-red-500/50 transition-all active:scale-95 shadow-lg shadow-red-500/5"
                                        >
                                            <span className="text-xl font-light leading-none">+</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Floating Remote Control Hub (Global Positioning) */}
                {activeRemoteId && (
                    <FloatingRemoteHub
                        athlete={athletes?.find(a => a.userId === activeRemoteId)}
                        onClose={() => setActiveRemoteId(null)}
                    />
                )}
            </div>

        </div>
    );
}
