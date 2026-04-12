import { useState, useEffect } from 'react';
import { Activity, Lock, Unlock, Play, ChevronRight, Zap, Target, Clock as ClockIcon, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { playHoverSound } from '../utils/audio';

interface SmartPlan {
    id: string;
    status: 'idle' | 'live' | 'paused' | 'scheduled' | 'sent' | 'restarting';
    target_jumps: number | null;
    target_time: number | null;
    scheduled_start: string | null;
    updated_at: string;
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
    const [timeLeft, setTimeLeft] = useState<{h: string, m: string, s: string} | null>(null);

    useEffect(() => {
        const calculate = () => {
            const diff = new Date(targetDate).getTime() - new Date().getTime();
            if (diff <= 0) return setTimeLeft(null);
            
            const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
            const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
            setTimeLeft({ h, m, s });
        };
        
        calculate();
        const timer = setInterval(calculate, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) return (
         <div className="flex flex-col items-end gap-2">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.4em]">Strategy Active</span>
            <div className="flex items-center gap-3 px-5 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-[11px] font-black text-white tracking-widest uppercase">Proceed to Hub</span>
            </div>
         </div>
    );

    return (
        <div className="flex flex-col items-end gap-3">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Strategy Deployment</span>
            <div className="flex items-center gap-2.5">
                {[
                    { label: 'H', val: timeLeft.h },
                    { label: 'M', val: timeLeft.m },
                    { label: 'S', val: timeLeft.s }
                ].map((unit, i) => (
                    <div key={i} className="flex flex-col items-center">
                        <div className="px-2.5 py-1.5 bg-white/5 rounded-xl border border-white/10 min-w-[38px] flex items-center justify-center">
                            <span className="text-base font-black text-white tracking-tighter tabular-nums">{unit.val}</span>
                        </div>
                        <span className="text-[6px] font-black text-white/20 uppercase tracking-widest mt-1">{unit.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SmartTrackerWidget() {
    const [plan, setPlan] = useState<SmartPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [studentId, setStudentId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Get student ID
                const { data: student } = await supabase
                    .from('students')
                    .select('id')
                    .eq('profile_id', user.id)
                    .maybeSingle();

                if (!student) {
                    setLoading(false);
                    return;
                }
                setStudentId(student.id);

                // 2. Initial fetch
                const getLatestPlan = async () => {
                    const { data } = await supabase
                        .from('training_plans')
                        .select('*')
                        .eq('student_id', student.id)
                        .order('updated_at', { ascending: false })
                        .limit(1);
                    
                    if (data && data.length > 0) {
                        setPlan(data[0] as SmartPlan);
                    }
                };

                await getLatestPlan();
                setLoading(false);

                // 3. Real-time subscription
                const channel = supabase.channel(`smart-plan-${student.id}`)
                    .on('postgres_changes' as any, { 
                        event: '*', 
                        table: 'training_plans', 
                        filter: `student_id=eq.${student.id}` 
                    }, () => getLatestPlan())
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            } catch (err) {
                console.error('Error in SmartTrackerWidget:', err);
                setLoading(false);
            }
        };

        fetchPlan();
    }, []);

    if (loading) return (
        <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] flex items-center justify-center min-h-[160px]">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );

    const isLive = plan?.status === 'live' || plan?.status === 'sent';
    const isPaused = plan?.status === 'paused';
    const isScheduled = plan?.status === 'scheduled';

    return (
        <div onMouseEnter={playHoverSound} className="relative py-8 px-4 overflow-hidden group transition-all duration-700">
            {/* Atmospheric Depth - Minimalist Glow Only */}
            <div className={`absolute -right-12 -bottom-12 w-48 h-48 rounded-full blur-[100px] transition-all duration-1000 ${isLive ? 'bg-emerald-500/5 opacity-40' : 'bg-primary/5 opacity-10'}`} />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-7">
                    <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center border transition-all duration-1000 ${
                        isLive 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.15)] group-hover:scale-105' 
                            : 'bg-white/5 border-white/10 text-white/10'
                    }`}>
                        {isLive ? (
                            <div className="relative">
                                <Unlock className="w-8 h-8 animate-pulse" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                            </div>
                        ) : (
                            <Lock className="w-8 h-8" />
                        )}
                    </div>
                    
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">AI <span className="premium-gradient-text">Command</span></h3>
                            {isLive && (
                                <div className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Live Link</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Activity size={12} className={isLive ? 'text-emerald-400' : 'text-white/20'} />
                                <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${isLive ? 'text-emerald-400/80' : 'text-white/20'}`}>
                                    {isLive ? 'Strategy Synced' : 'Encryption Locked'}
                                </span>
                            </div>
                            
                            {plan?.target_jumps && (
                                <div className="flex items-center gap-2 pl-4 border-l border-white/5">
                                    <Target size={12} className="text-white/20" />
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">{plan.target_jumps} Mission Goal</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {isLive ? (
                        <Link 
                            to="/app/training"
                            className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl hover:shadow-white/10"
                        >
                            <Play fill="currentColor" className="w-4 h-4" /> Start Training Hub <ArrowRight className="w-5 h-5" />
                        </Link>
                    ) : isScheduled && plan?.scheduled_start ? (
                         <CountdownTimer targetDate={plan.scheduled_start} />
                    ) : (
                        <div className="flex flex-col items-end gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                            <p className="text-[10px] font-black text-white uppercase tracking-[0.6em] text-right">Awaiting Remote Signal</p>
                            <div className="h-0.5 w-24 bg-gradient-to-l from-white/20 to-transparent" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
