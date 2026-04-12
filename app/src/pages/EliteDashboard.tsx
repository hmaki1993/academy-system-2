import { useState, useEffect } from 'react';
import { 
    Wallet, TrendingUp, Activity, Target, ListChecks, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCurrency } from '../context/CurrencyContext';
import { playHoverSound } from '../utils/audio';
import MinimalCountdown from '../components/MinimalCountdown';

export default function EliteDashboard() {
    const { currency } = useCurrency();
    const [loading, setLoading] = useState(true);

    const [studentName, setStudentName] = useState('');
    const [attendedSessions, setAttendedSessions] = useState(0);
    const [ptSpent, setPtSpent] = useState(0);
    const [consSpent, setConsSpent] = useState(0);
    const [trainingPlan, setTrainingPlan] = useState<any[]>([]);
    const [planStatus, setPlanStatus] = useState<string | null>(null);
    const [scheduledStart, setScheduledStart] = useState<string | null>(null);
    const [ptSubscription, setPtSubscription] = useState<any>(null);
    const [ptHistory, setPtHistory] = useState<any[]>([]);
    const [consHistory, setConsHistory] = useState<any[]>([]);
    const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
    const [activeModal, setActiveModal] = useState<'pt' | 'cons' | 'money' | null>(null);


    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                let { data: student } = await supabase
                    .from('students')
                    .select('*, pt_subscriptions(*)')
                    .eq('profile_id', user.id)
                    .maybeSingle();

                if (!student) {
                    const { data: fallback } = await supabase
                        .from('students')
                        .select('*, pt_subscriptions(*)')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    student = fallback;
                }

                if (!student) {
                    setLoading(false);
                    return;
                }

                setStudentName(student.full_name);
                
                const activePt = student.pt_subscriptions?.find((s: any) => s.status === 'active') || 
                               student.pt_subscriptions?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                setPtSubscription(activePt);

                const [
                    { data: ptSessions },
                    { data: consRequests },
                    { data: payments },
                    { data: planData }
                ] = await Promise.all([
                    supabase.from('pt_sessions').select('*').eq('subscription_id', activePt?.id).order('date', { ascending: false }),
                    supabase.from('consultation_requests').select('*').eq('email', user.email).order('created_at', { ascending: false }),
                    supabase.from('payments').select('*').eq('student_id', student.id).order('payment_date', { ascending: false }),
                    supabase.from('training_plans').select('plan_content, status, scheduled_start').eq('student_id', student.id).maybeSingle()
                ]);

                setPtHistory(ptSessions || []);
                setConsHistory(consRequests || []);
                setPaymentsHistory(payments || []);
                setAttendedSessions(ptSessions?.length || 0);
                setPtSpent(payments?.filter(p => p.type?.toLowerCase().includes('pt')).reduce((sum, p) => sum + (p.amount || 0), 0) || 0);
                setConsSpent(payments?.filter(p => p.type?.toLowerCase().includes('consultation')).reduce((sum, p) => sum + (p.amount || 0), 0) || 0);
                
                // Robust plan extraction (handle direct array or { weeklyPlan: [...] } wrapper)
                const rawPlan = planData?.plan_content;
                const extractedPlan = Array.isArray(rawPlan) ? rawPlan : (rawPlan?.weeklyPlan || []);
                
                setTrainingPlan(extractedPlan);
                setPlanStatus(planData?.status || null);
                setScheduledStart(planData?.scheduled_start || null);

                const channel = supabase.channel(`student-live-${student.id}`)
                    .on('postgres_changes' as any, { event: '*', table: 'training_plans', filter: `student_id=eq.${student.id}` }, (payload: any) => {
                        const newRaw = payload.new?.plan_content;
                        const newExtracted = Array.isArray(newRaw) ? newRaw : (newRaw?.weeklyPlan || []);
                        
                        setPlanStatus(payload.new?.status || null);
                        setScheduledStart(payload.new?.scheduled_start || null);
                        setTrainingPlan(newExtracted);
                    }).subscribe();

                return channel;

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        let activeChannel: any;
        const syncData = async () => {
            await fetchAllData().then(channel => {
                if (channel) activeChannel = channel;
            });
        };

        syncData();

        // 🟢 Presence Pulse: Update last_active_at every 45s to stay "online" in Coach Hub
        const updatePresence = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
            }
        };

        // Update immediately on load
        updatePresence();

        const pulseInterval = setInterval(updatePresence, 45000); 

        const pollInterval = setInterval(() => {
            // Only fetch the highly dynamic parts periodically
            const refreshDynamicData = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data: student } = await supabase.from('students').select('id').eq('profile_id', user.id).maybeSingle();
                if (student) {
                    const { data: planData } = await supabase.from('training_plans').select('status, scheduled_start').eq('student_id', student.id).maybeSingle();
                    if (planData) {
                        setPlanStatus(planData.status);
                        setScheduledStart(planData.scheduled_start);
                    }
                }
            };
            refreshDynamicData();
        }, 10000); // Poll every 10s for maximum responsiveness

        return () => { 
            if (activeChannel) supabase.removeChannel(activeChannel); 
            clearInterval(pollInterval);
            clearInterval(pulseInterval);
        };
    }, []);

    if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-12 pb-20 relative px-4 sm:px-8">
            {/* Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
            </div>

            {/* Header Canvas */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 py-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(var(--color-primary),1)]" />
                            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Intelligence Center</h2>
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-tight italic">
                        <span className="premium-gradient-text">{studentName.split(' ')[0]}</span>
                    </h1>
                </div>

                {/* REAL-TIME SESSION WIDGET */}
                {scheduledStart && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-1000 mt-4">
                        <MinimalCountdown targetDate={scheduledStart} status={planStatus} />
                    </div>
                )}
            </div>

            {/* ULTRA-MINIMAL COMPACT STATS ROW */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-12 py-8 border-y border-white/[0.03] px-4 font-mono">
                
                {/* PT SESSIONS */}
                <button onClick={() => setActiveModal('pt')} className="flex items-center gap-6 group text-left outline-none">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-black transition-all">
                        <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">PT Sessions</span>
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums italic leading-none">
                                {attendedSessions}
                            </h3>
                            <span className="text-[14px] text-white/20 font-black italic">/ {ptSubscription?.sessions_total || 0}</span>
                        </div>
                    </div>
                </button>

                <div className="hidden md:block w-px h-8 bg-white/[0.05]" />

                {/* Consultations */}
                <button onClick={() => setActiveModal('cons')} className="flex items-center gap-6 group text-left outline-none">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition-all">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Consultations</span>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums italic leading-none">
                                {consHistory.length}
                            </h3>
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">TASKS</span>
                        </div>
                    </div>
                </button>

                <div className="hidden md:block w-px h-8 bg-white/[0.05]" />

                {/* Total Invested */}
                <button onClick={() => setActiveModal('money')} className="flex items-center gap-6 group text-left outline-none">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <Wallet className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Total Invested</span>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums italic leading-none">
                                {(ptSpent + consSpent).toLocaleString()}
                            </h3>
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{currency.code}</span>
                        </div>
                    </div>
                </button>
            </div>

            {/* Glass Modal Implementation */}
            {activeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
                    <div className="relative w-full max-w-lg bg-[#0b0e18]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${
                                    activeModal === 'pt' ? 'bg-indigo-500/10 text-indigo-400' :
                                    activeModal === 'cons' ? 'bg-amber-500/10 text-amber-500' :
                                    'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                    {activeModal === 'pt' ? <Activity size={20} /> : 
                                     activeModal === 'cons' ? <TrendingUp size={20} /> : 
                                     <Wallet size={20} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                                        {activeModal === 'pt' ? 'PT Session History' : 
                                         activeModal === 'cons' ? 'Consultation Logs' : 
                                         'Investment Breakdown'}
                                    </h2>
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[.2em]">Detailed Analytics</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveModal(null)} className="p-2 transition-all hover:scale-110 active:scale-95 group">
                                <Activity className="w-4 h-4 text-red-500 group-hover:text-red-400" style={{ transform: 'rotate(45deg)', display: 'none' }} />
                                <div className="relative w-3.5 h-3.5">
                                    <div className="absolute inset-0 w-full h-[1.5px] bg-red-500 rounded-full rotate-45 top-1/2 -translate-y-1/2" />
                                    <div className="absolute inset-0 w-full h-[1.5px] bg-red-500 rounded-full -rotate-45 top-1/2 -translate-y-1/2" />
                                </div>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
                            {activeModal === 'pt' && (
                                ptHistory.length > 0 ? ptHistory.map((session, i) => (
                                    <div key={i} className="flex items-center justify-between py-4 border-b border-white/[0.03] last:border-none">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-black text-white uppercase italic">{new Date(session.date || session.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Training Session Complete</span>
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-3 py-1 rounded-full border border-indigo-500/10">VERIFIED</span>
                                    </div>
                                )) : <p className="text-center py-10 text-[10px] font-black text-white/10 uppercase tracking-[.3em]">No session logs found</p>
                            )}

                            {activeModal === 'cons' && (
                                consHistory.length > 0 ? consHistory.map((req, i) => (
                                    <div key={i} className="flex items-center justify-between py-4 border-b border-white/[0.03] last:border-none">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-black text-white uppercase italic">{new Date(req.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Consultation Request</span>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                            req.status === 'completed' ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' :
                                            req.status === 'pending' ? 'text-amber-500 bg-amber-500/5 border-amber-500/10' :
                                            'text-white/20 bg-white/5 border-white/10'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </div>
                                )) : <p className="text-center py-10 text-[10px] font-black text-white/10 uppercase tracking-[.3em]">No consultation logs found</p>
                            )}

                            {activeModal === 'money' && (
                                paymentsHistory.length > 0 ? paymentsHistory.map((pay, i) => (
                                    <div key={i} className="flex items-center justify-between py-4 border-b border-white/[0.03] last:border-none">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-black text-white uppercase italic">{new Date(pay.payment_date || pay.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{pay.description || pay.type || 'Standard Transaction'}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-black text-emerald-400 tabular-nums italic">-{pay.amount.toLocaleString()} {currency.code}</span>
                                            <span className="text-[8px] font-bold text-white/10 uppercase tracking-tighter italic">CONFIRMED</span>
                                        </div>
                                    </div>
                                )) : <p className="text-center py-10 text-[10px] font-black text-white/10 uppercase tracking-[.3em]">No transaction logs found</p>
                            )}
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="p-8 bg-white/[0.01] border-t border-white/5 flex justify-center">
                            <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em] italic">Elite Intelligence Protocol v2.5</span>
                        </div>
                    </div>
                </div>
            )}


            {/* Strategic Blueprint (Coach Assignment) */}
            <div className="relative z-10 space-y-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse"><Target className="w-6 h-6 text-primary" /></div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Strategic Blueprint</h2>
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Protocol v2.4 Active</p>
                    </div>
                </div>

                {trainingPlan.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16 relative">
                        {/* THE STRATEGIC DIVIDER (Vertical line for desktop) */}
                        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-x-1/2" />
                        
                        {trainingPlan.map((step, idx) => {
                            // Robust key detection for Elite Experience
                            const phaseTitle = step.day || step.phase || step.title || step.label || `PHASE ${String.fromCharCode(65 + idx)}`;
                            const subFocus = step.focus || null;
                            const tasks = step.details || step.tasks || step.steps || step.items || [];
                            
                            return (
                                <div key={idx} onMouseEnter={playHoverSound} className="group relative flex flex-col transition-all duration-700">
                                    <div className="flex flex-col gap-1 mb-6 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_15px_rgba(var(--color-primary),0.8)]" />
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-tight italic leading-none">{phaseTitle}</h3>
                                                {subFocus && (
                                                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] mt-1 block">{subFocus}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4 relative z-10 pl-6 border-l border-white/5 ml-[3px]">
                                        {Array.isArray(tasks) && tasks.map((task: any, tIdx: number) => {
                                            const taskContent = typeof task === 'string' ? task : (task.description || task.text || task.title || JSON.stringify(task));
                                            return (
                                                <div key={tIdx} className="flex items-start gap-4 group/item">
                                                    <div className="w-1 h-1 rounded-full bg-white/10 group-hover/item:bg-primary transition-all shrink-0 mt-1.5" />
                                                    <span className="text-sm font-medium text-white/40 group-hover/item:text-white transition-colors leading-relaxed">
                                                        {taskContent}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Mobile Divider */}
                                    {idx < trainingPlan.length - 1 && (
                                        <div className="lg:hidden w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mt-12" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-[3rem] bg-white/[0.01]">
                        <ListChecks className="w-16 h-16 text-white/10 mb-6" />
                        <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px]">Awaiting Strategic Instruction</p>
                    </div>
                )}
            </div>
        </div>
    );
}
