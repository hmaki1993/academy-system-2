
import React, { useState, useMemo } from 'react';
import { 
    Users, Trophy, Activity, Sparkles, Search, 
    LayoutDashboard, PlayCircle, User, Calendar, 
    ChevronRight, Info, History, ArrowRight,
    Weight, Ruler, UserCircle2, Loader2, Lock, Zap,
    Clock, Flame, CheckCircle2, X, Calculator, Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useJumpRopeAdminStats, useJumpRopeAccess, useTrainingPlanHistory, useAthleteActivityHistory } from '../../hooks/useData';
import { useTheme } from '../../context/ThemeContext';
import { formatDistanceToNow, format } from 'date-fns';
import { useSmartPlan, TrainingMetric, GeneratedPlan } from '../../hooks/useSmartPlan';

// --- Sub-Component: Inline Smart Plan Generator ---
const InlineSmartPlan = ({ studentId, studentName, onClose }: { studentId: string, studentName: string, onClose: () => void }) => {
    const { generateAIPlan, sendPlan, sendDirectTargets, isGenerating, isSending } = useSmartPlan();
    const [metrics, setMetrics] = useState<TrainingMetric>({
        age: 25,
        weight: 70,
        height: 165,
        daysPerWeek: 3,
        gender: 'female',
        language: 'en'
    });

    const [plan, setPlan] = useState<GeneratedPlan | null>(null);
    const [editablePlan, setEditablePlan] = useState<GeneratedPlan['weeklyPlan']>([]);
    const [showDaysMenu, setShowDaysMenu] = useState(false);
    
    // Session Targets State - Start empty for cleaner UX
    const [targetJumps, setTargetJumps] = useState<number | ''>('');
    const [targetTime, setTargetTime] = useState<number | ''>('');

    const bmrPreview = Math.round((10 * metrics.weight) + (6.25 * metrics.height) - (5 * metrics.age) - 161);
    const tdeePreview = Math.round(bmrPreview * 1.375);

    const handleGenerate = async () => {
        const result = await generateAIPlan(studentId, metrics);
        setPlan(result);
        setEditablePlan(result.weeklyPlan);
    };

    const handleUpdateDay = (index: number, field: string, value: string) => {
        const newPlan = [...editablePlan];
        newPlan[index] = { ...newPlan[index], [field]: value };
        setEditablePlan(newPlan);
    };

    const handleUpdateDetail = (dayIndex: number, detailIndex: number, value: string) => {
        const newPlan = [...editablePlan];
        const newDetails = [...newPlan[dayIndex].details];
        newDetails[detailIndex] = value;
        newPlan[dayIndex] = { ...newPlan[dayIndex], details: newDetails };
        setEditablePlan(newPlan);
    };

    const handleSend = async () => {
        if (!plan) return;
        const finalPlan = { 
            ...plan, 
            weeklyPlan: editablePlan,
            targetJumps: targetJumps === '' ? undefined : targetJumps,
            targetTime: targetTime === '' ? undefined : targetTime
        };
        await sendPlan(studentId, finalPlan);
        onClose();
    };

    const handleDirectSend = async () => {
        if (targetJumps === '' && targetTime === '') {
            // No toast import visible in view_file, but useSmartPlan uses it. 
            // I'll assume it's available or just try sending.
            return;
        }
        await sendDirectTargets(studentId, targetTime, targetJumps);
        onClose();
    };

    const isAr = metrics.language === 'ar';

    // Auto-regenerate on language change if plan exists for seamless "wow" experience
    React.useEffect(() => {
        if (plan) {
            handleGenerate();
        }
    }, [metrics.language]);


    return (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col items-center justify-center gap-4 py-8 relative">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase leading-none drop-shadow-2xl">
                            {isAr ? 'محرك الاستراتيجية' : 'Strategy Engine'}
                        </h1>
                        <div className="h-1 w-12 bg-orange-500 rounded-full mt-2" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.6em]">
                        {isAr ? `تصميم استراتيجية عصبية لـ ${studentName}` : `Generating Neural Strategy for ${studentName}`}
                    </p>
                    {/* Centered Premium Timestamp */}
                    <div className="px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-3xl flex items-center gap-3">
                        <Clock size={10} className="text-orange-500/40" />
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] tabular-nums">
                            {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            <span className="mx-2 text-white/10">@</span>
                            {new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                    </div>
                </div>

                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <div className="flex bg-white/5 p-1 rounded-xl backdrop-blur-xl border border-white/10">
                        {(['en', 'ar'] as const).map(lang => (
                            <button
                                key={lang}
                                onClick={() => setMetrics({...metrics, language: lang})}
                                className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${metrics.language === lang ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {!plan ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                    {/* Inputs - Refined & Compact Premium */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: isAr ? 'الوزن (كجم)' : 'Weight (kg)', value: metrics.weight, key: 'weight' },
                            { label: isAr ? 'الطول (سم)' : 'Height (cm)', value: metrics.height, key: 'height' },
                            { label: isAr ? 'العمر' : 'Age', value: metrics.age, key: 'age' }
                        ].map(m => (
                            <div key={m.key} className="group/input space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover/input:text-orange-500/50 transition-colors ml-2">{m.label}</label>
                                <div className="relative">
                                    <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500/0 via-orange-500/20 to-orange-500/0 rounded-xl opacity-0 group-hover/input:opacity-100 transition-opacity blur-[2px]" />
                                    <input 
                                        type="number"
                                        value={m.value || ''}
                                        onChange={e => setMetrics({...metrics, [m.key]: e.target.value === '' ? '' : Number(e.target.value)})}
                                        className="w-full h-12 bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-xl px-5 text-lg font-black text-white outline-none focus:border-orange-500/40 focus:bg-white/[0.04] transition-all relative z-10"
                                    />
                                </div>
                            </div>
                        ))}
                        <div className="group/input space-y-2 relative">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover/input:text-orange-500/50 transition-colors ml-2">{isAr ? 'أيام التدريب' : 'Days / Week'}</label>
                            <div className="relative">
                                <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500/0 via-orange-500/20 to-orange-500/0 rounded-xl opacity-0 group-hover/input:opacity-100 transition-opacity blur-[2px]" />
                                <button 
                                    onClick={() => setShowDaysMenu(!showDaysMenu)}
                                    className="w-full h-12 bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-xl px-5 text-lg font-black text-white flex items-center justify-between hover:bg-white/[0.04] transition-all relative z-10"
                                >
                                    <span className="tabular-nums">{metrics.daysPerWeek || ''}</span>
                                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                                        <Calculator size={14} />
                                    </div>
                                </button>
                            </div>
                            
                            {showDaysMenu && (
                                <div className="absolute top-full left-0 right-0 mt-0 bg-[#0a0a0b]/90 backdrop-blur-[60px] border border-white/10 rounded-b-2xl p-2 z-50 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-300 origin-top overflow-hidden">
                                    <div className="space-y-0.5 relative z-10">
                                        {[1,2,3,4,5,6,7].map(d => (
                                            <button 
                                                key={d} 
                                                onClick={() => { setMetrics({...metrics, daysPerWeek: d}); setShowDaysMenu(false); }} 
                                                className="w-full px-4 py-2.5 rounded-xl text-left text-xs font-black text-white/40 hover:bg-orange-500/10 hover:text-orange-500 transition-all flex items-center justify-between group/item"
                                            >
                                                <span className="tracking-wider uppercase">{d} {isAr ? 'أيام' : 'Days'}</span>
                                                <div className="flex items-center gap-2">
                                                    {metrics.daysPerWeek === d && <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />}
                                                    <ChevronRight size={12} className="opacity-0 group-hover/item:opacity-100 -translate-x-1 group-hover/item:translate-x-0 transition-all" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Divider for Targets */}
                        <div className="col-span-2 pt-4 border-t border-white/5 mt-2">
                            <h5 className="text-[10px] font-black text-orange-500 uppercase tracking-[.6em] mb-4 flex items-center gap-3">
                                <Trophy size={14} /> {isAr ? 'أهداف الجلسة' : 'Session Targets'}
                            </h5>
                        </div>

                        {/* Session Targets Inputs */}
                        <div className="group/input space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover/input:text-orange-500/50 transition-colors ml-2">{isAr ? 'عدد النطات' : 'Target Jumps'}</label>
                            <div className="relative">
                                <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500/0 via-orange-500/20 to-orange-500/0 rounded-xl opacity-0 group-hover/input:opacity-100 transition-opacity blur-[2px]" />
                                <input 
                                    type="number"
                                    value={targetJumps || ''}
                                    onChange={e => setTargetJumps(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-12 bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-xl px-5 text-lg font-black text-white outline-none focus:border-orange-500/40 focus:bg-white/[0.04] transition-all relative z-10"
                                />
                            </div>
                        </div>

                        <div className="group/input space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover/input:text-orange-500/50 transition-colors ml-2">{isAr ? 'الوقت (دقايق)' : 'Target Time'}</label>
                            <div className="relative">
                                <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500/0 via-orange-500/20 to-orange-500/0 rounded-xl opacity-0 group-hover/input:opacity-100 transition-opacity blur-[2px]" />
                                <input 
                                    type="number"
                                    value={targetTime || ''}
                                    onChange={e => setTargetTime(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full h-12 bg-white/[0.02] border border-white/5 backdrop-blur-3xl rounded-xl px-5 text-lg font-black text-white outline-none focus:border-orange-500/40 focus:bg-white/[0.04] transition-all relative z-10"
                                />
                            </div>
                        </div>

                        {/* Direct Broadcast Quick Action */}
                        <div className="col-span-2 pt-2">
                            <button 
                                onClick={handleDirectSend}
                                disabled={isSending}
                                className="w-full h-12 group/btn relative overflow-hidden rounded-2xl transition-all duration-500 active:scale-95 disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-blue-600/40 to-cyan-600/20 opacity-40 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                <div className="absolute inset-0 border border-cyan-500/30 group-hover/btn:border-cyan-500/50 rounded-2xl transition-all" />
                                <div className="relative flex items-center justify-center gap-3 py-3">
                                    <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover/btn:scale-110 transition-transform">
                                        <Zap size={14} fill="currentColor" />
                                    </div>
                                    <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] group-hover/btn:tracking-[0.4em] transition-all">
                                        {isSending ? (isAr ? 'جاري البث...' : 'Broadcasting...') : (isAr ? 'بث الأهداف مباشرة' : 'Direct Broadcast')}
                                    </span>
                                </div>
                            </button>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] text-center mt-3 animate-pulse">
                                {isAr ? '* يقوم هذا الإجراء بتحديث أهداف المتدرب فوراً دون الحاجة لخطة' : '* This action updates the trainee\'s goals instantly without a full plan'}
                            </p>
                        </div>
                    </div>

                    {/* Preview Area - Ultra Compact Premium */}
                    <div className="flex flex-col justify-between p-5 rounded-[2rem] bg-gradient-to-br from-orange-500/[0.04] via-transparent to-transparent border border-white/5 backdrop-blur-[60px] shadow-xl relative overflow-hidden group min-h-[11rem]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full animate-pulse group-hover:bg-orange-500/20 transition-all duration-1000" />
                        
                        <div className="flex items-center justify-around relative z-10 w-full mt-2">
                            <div className="text-center group-hover:scale-105 transition-transform duration-500">
                                <span className="block text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">BMR</span>
                                <span className="text-xl font-black text-white tracking-widest leading-none">{bmrPreview}</span>
                            </div>
                            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                            <div className="text-center group-hover:scale-105 transition-transform duration-500 delay-100">
                                <span className="block text-[8px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">TDEE</span>
                                <span className="text-xl font-black text-white tracking-widest leading-none">{tdeePreview}</span>
                            </div>
                            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                            <div className="text-center group-hover:scale-110 transition-transform duration-700 delay-200">
                                <span className="block text-[9px] font-black uppercase tracking-[0.4em] text-orange-500/40 mb-2">{isAr ? 'الهدف' : 'TARGET'}</span>
                                <span className="text-2xl font-black text-orange-500 shadow-orange-500/20 drop-shadow-lg leading-none tabular-nums">{Math.round(tdeePreview * 0.8)}</span>
                            </div>
                        </div>
                        
                        <div className="flex justify-center w-full relative z-10 mb-1">
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-fit px-8 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-black uppercase tracking-[0.4em] hover:bg-orange-500 hover:text-black transition-all backdrop-blur-3xl disabled:opacity-50 flex items-center justify-center gap-2.5 relative overflow-hidden group/btn shadow-lg shadow-orange-500/5"
                            >
                                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                                {isGenerating ? <Activity size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {isAr ? 'بناء الخطة' : 'Build Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between px-4 pt-16 pb-6">
                        <div className="flex items-center gap-5">
                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse" />
                            <span className="text-base font-black text-green-500 uppercase tracking-[.5em]">{isAr ? 'تم تجميع الاستراتيجية العصبية' : 'Neural Strategem Compiled'}</span>
                        </div>
                        <button onClick={() => setPlan(null)} className="text-xs font-black text-white/30 uppercase hover:text-orange-500 transition-colors tracking-[0.3em]">{isAr ? 'إعادة المحاولة' : 'REGENERATE'}</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        {editablePlan.map((d, i) => (
                            <div key={i} className="group/card p-8 rounded-[2.5rem] bg-gradient-to-br from-white/[0.02] to-transparent border border-white/5 backdrop-blur-3xl hover:border-orange-500/30 transition-all flex flex-col gap-6 relative overflow-hidden shadow-2xl">
                                {/* Premium Card Glow */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/5 blur-[40px] rounded-full group-hover/card:bg-orange-500/10 transition-all duration-700" />
                                
                                <div className="flex items-center justify-between border-b border-white/5 pb-4 relative z-10">
                                    <div className="flex items-center gap-3 w-1/2">
                                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 group-hover/card:scale-110 transition-transform">
                                            <Sparkles size={14} />
                                        </div>
                                        <input value={d.day} onChange={e => handleUpdateDay(i, 'day', e.target.value)} className="bg-transparent text-sm font-black text-orange-500 uppercase tracking-widest outline-none w-full" />
                                    </div>
                                    <input value={d.focus} onChange={e => handleUpdateDay(i, 'focus', e.target.value)} className="bg-transparent text-[11px] font-black text-white/30 uppercase outline-none text-right w-1/2 tracking-widest" />
                                </div>
                                <div className="space-y-4 relative z-10">
                                    {d.details.map((ex, j) => (
                                        <div key={j} className="flex items-center gap-4 group/item">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500/20 group-hover/card:bg-orange-500 transition-colors shadow-[0_0_8px_rgba(249,115,22,0)] group-hover/card:shadow-orange-500/40" />
                                            <input value={ex} onChange={e => handleUpdateDetail(i, j, e.target.value)} className="bg-transparent text-xs font-black text-white/60 outline-none w-full focus:text-white transition-colors tracking-wide" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center pt-14 pb-8">
                        <button 
                            onClick={handleSend}
                            disabled={isSending}
                            className="w-fit px-10 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-[0.4em] hover:bg-orange-500 hover:text-black transition-all backdrop-blur-3xl disabled:opacity-50 flex items-center justify-center gap-4 relative overflow-hidden group shadow-lg"
                        >
                            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                            <Send size={16} /> {isAr ? 'اعتماد الاستراتيجية في القاعدة' : 'Commit Strategy to Database'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-Component: Athlete Detail Modal ---
const AthleteDetailModal = ({ athlete, onClose, autoOpenGenerator = false }: { athlete: any, onClose: () => void, autoOpenGenerator?: boolean }) => {
    const [showGenerator, setShowGenerator] = useState(autoOpenGenerator);
    const [activeTab, setActiveTab] = useState<'strategy' | 'activity'>('strategy');
    const { data: history, isLoading: isHistoryLoading } = useTrainingPlanHistory(athlete.userId);
    const { data: activityHistory, isLoading: isActivityLoading } = useAthleteActivityHistory(athlete.userId);

    return (
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-400 overflow-y-scroll custom-scrollbar font-sans">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.2); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(249,115,22,0.4); }
            `}</style>
            
            <div className="flex-1 flex flex-col max-w-[1800px] mx-auto w-full relative">
                {/* Header */}
                <div className="p-4 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-6 sm:gap-0 min-h-[7rem]">
                    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12 flex-1 w-full sm:w-auto">
                        <div className="flex items-center gap-4 sm:gap-6 sm:pr-12 sm:border-r sm:border-white/5 h-auto sm:h-12">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
                                {athlete.avatarUrl ? <img src={athlete.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={24} className="text-orange-500/40" />}
                            </div>
                            <div className="flex flex-col justify-center text-center sm:text-left">
                                <h3 className="text-xl sm:text-2xl font-black tracking-tighter text-white uppercase leading-none">{athlete.name}</h3>
                                <div className="flex flex-col mt-1.5 gap-1">
                                    <span className="text-[7px] sm:text-[8px] font-black text-orange-500 uppercase tracking-[0.3em]">Athlete Profile</span>
                                    <div className="flex items-center gap-4 text-[7px] font-black text-white/30 uppercase tracking-widest">
                                        {athlete.email && <span>{athlete.email}</span>}
                                        {athlete.phone && <span className="text-green-500/50">WhatsApp: {athlete.phone}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Balanced Distributed Stats - Responsive */}
                        <div className="flex-1 flex items-center justify-between sm:justify-around px-0 sm:px-4 w-full sm:w-auto gap-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-[.3em] sm:tracking-[.4em] mb-1 sm:mb-2">Jumps</span>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="text-sm sm:text-xl font-black text-blue-400 leading-none">{athlete.totalJumps || 0}</span>
                                    <Trophy size={12} className="text-blue-400/20" />
                                </div>
                            </div>
                            
                            <div className="w-px h-6 sm:h-8 bg-white/5" />
                            
                            <div className="flex flex-col items-center">
                                <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-[.3em] sm:tracking-[.4em] mb-1 sm:mb-2">Last Training</span>
                                <div className="flex items-center gap-1 sm:gap-2 text-white/50">
                                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider">{athlete.lastSession ? format(new Date(athlete.lastSession), 'MMM do') : 'N/A'}</span>
                                    <History size={10} className="opacity-20" />
                                </div>
                            </div>
                            
                            <div className="w-px h-6 sm:h-8 bg-white/5" />
                            
                            <div className="flex flex-col items-center">
                                <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-[.3em] sm:tracking-[.4em] mb-1 sm:mb-2">Load</span>
                                <div className="flex items-center gap-1 sm:gap-2 text-orange-500/80">
                                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider">{athlete.sessionsCount} Ses</span>
                                    <Activity size={10} className="opacity-20" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="sm:pl-12 absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto">
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 rounded-xl bg-white/0 border border-white/0 flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-300 group"
                        >
                            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-10 custom-scrollbar">
                    {/* Full Width Content Container for Immersive View */}
                    <div className="max-w-[1700px] mx-auto space-y-6 sm:space-y-10 pb-32">
                        {/* Tab Navigation + Quick Generate */}
                        <div className="flex items-center justify-center gap-3 sm:scale-110">
                            <div className="flex items-center gap-1 sm:gap-2 p-1 bg-white/5 rounded-2xl w-full sm:w-fit">
                                <button 
                                    onClick={() => setActiveTab('strategy')}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[.1em] sm:tracking-[.2em] transition-all ${activeTab === 'strategy' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/10' : 'text-white/40 hover:text-white/70 border border-transparent'}`}
                                >
                                    Strategy
                                </button>
                                <button 
                                    onClick={() => setActiveTab('activity')}
                                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[.1em] sm:tracking-[.2em] transition-all ${activeTab === 'activity' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10' : 'text-white/40 hover:text-white/70 border border-transparent'}`}
                                >
                                    Activity
                                </button>
                            </div>
                            {/* Quick Generate Plan Button */}
                            <button
                                onClick={() => setShowGenerator(true)}
                                title="Generate Smart Plan"
                                className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400/70 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 transition-all active:scale-90 shrink-0"
                            >
                                <span className="text-lg font-black leading-none">+</span>
                            </button>
                        </div>
                        
                        {activeTab === 'strategy' ? (
                            <div className="animate-in fade-in duration-500">
                                {showGenerator ? (
                                    <InlineSmartPlan
                                        studentId={athlete.userId}
                                        studentName={athlete.name}
                                        onClose={() => setShowGenerator(false)}
                                    />
                                ) : (
                                    <>
                                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[.4em] flex items-center gap-3 mb-6">
                                            <History size={14} /> Training Plan Archives
                                        </h4>
                                        
                                        {isHistoryLoading ? (
                                            <div className="flex flex-col items-center justify-center py-10 gap-4">
                                                <Loader2 className="animate-spin text-orange-500" />
                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Retrieving archives...</p>
                                            </div>
                                        ) : history?.length === 0 ? (
                                            <div className="py-20 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4">
                                                <Sparkles size={32} className="text-white/10" />
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest px-10">No historical strategies found for this athlete.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {history?.map((plan: any, idx: number) => (
                                                    <div key={idx} className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">
                                                                    {idx === 0 ? 'Current Active Strategy' : `Version ${history.length - idx}`}
                                                                </span>
                                                                <span className="text-xs font-black text-white tracking-widest uppercase">
                                                                    {format(new Date(plan.created_at), 'MMMM do, yyyy')}
                                                                </span>
                                                            </div>
                                                            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                                                <Flame size={14} />
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black text-white/20 uppercase">Daily Goal</span>
                                                                <span className="text-xs font-black text-white">{plan.target_calories} KCAL</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black text-white/20 uppercase">Intensity</span>
                                                                <span className="text-xs font-black text-white uppercase">{plan.plan_content?.length} Days/Week</span>
                                                            </div>
                                                        </div>
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
                                    <Activity size={14} /> Performance Session Stream
                                </h4>
                                {isActivityLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-4">
                                        <Loader2 className="animate-spin text-blue-400" />
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Compiling metrics...</p>
                                    </div>
                                ) : activityHistory?.length === 0 ? (
                                    <div className="py-20 text-center bg-blue-400/5 border border-dashed border-blue-400/10 rounded-[2.5rem] flex flex-col items-center gap-4">
                                        <Activity size={32} className="text-blue-400/20" />
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest px-10 text-center">No tracked activity logged for this athlete.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activityHistory?.map((session: any, idx: number) => (
                                            <div key={idx} className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all group overflow-hidden relative">
                                                <div className="flex items-center justify-between mb-4 relative z-10">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                                            TRACKED SESSION
                                                        </span>
                                                        <span className="text-xs font-black text-white tracking-widest uppercase">
                                                            {format(new Date(session.created_at), 'MMMM do, yyyy @ HH:mm')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="px-3 py-1 rounded-full bg-blue-400/10 border border-blue-400/20 text-[9px] font-black text-blue-400 uppercase">
                                                            {session.jumps} JUMPS
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-4 relative z-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Total Time</span>
                                                        <span className="text-xs font-black text-white">
                                                            {Math.floor(session.duration/60)}m {session.duration%60}s
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Active Time</span>
                                                        <span className="text-xs font-black text-orange-500">
                                                            {session.work_duration ? `${Math.floor(session.work_duration/60)}m ${session.work_duration%60}s` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1">Rest Time</span>
                                                        <span className="text-xs font-black text-red-500">
                                                            {session.rest_duration ? `${Math.floor(session.rest_duration/60)}m ${session.rest_duration%60}s` : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {(session.work_duration && session.duration) && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                                                        <div 
                                                            className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
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
        </div>
    );
};


// --- Strategy Workplace Feature Component ---
export default function StrategyWorkplace() {
    const navigate = useNavigate();
    const { userProfile } = useTheme();
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'coach' || userProfile?.role === 'head_coach';
    const { data: athletes, isLoading: isAthletesLoading } = useJumpRopeAdminStats();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
    const [autoOpenDetailGenerator, setAutoOpenDetailGenerator] = useState(false);

    const filteredAthletes = useMemo(() => {
        if (!athletes) return [];
        return athletes.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [athletes, searchQuery]);

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
                                Strategy Hub
                            </span>
                        </h1>
                    </div>
                    <p className="text-muted text-[7px] font-black tracking-[0.2em] uppercase flex items-center gap-2 mt-1.5 opacity-60">
                        <span className="w-3 h-[1px] bg-primary/50 inline-block"></span>
                        Neural Training Engine and Athlete Strategic Planning
                    </p>
                </div>

                <div className="flex flex-col flex-1 space-y-10">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Active Athletes', value: athletes?.length || 0, icon: Users, color: 'text-orange-500' },
                            { label: 'Collective Jumps', value: athletes?.reduce((sum, a) => sum + a.totalJumps, 0).toLocaleString() || 0, icon: Trophy, color: 'text-blue-400' },
                            { label: 'Neural Status', value: 'OPTIMAL', icon: Activity, color: 'text-green-500' }
                        ].map((stat, i) => (
                            <div key={i} className="p-4 px-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-3xl relative overflow-hidden group">
                                <div className={`absolute top-0 right-0 p-3 opacity-[0.4] ${stat.color} group-hover:scale-110 transition-transform`}><stat.icon size={32} /></div>
                                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-1 block">{stat.label}</span>
                                <span className={`text-xl font-black tracking-tighter ${stat.color}`}>{stat.value}</span>
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
                                className="w-full h-9 rounded-xl bg-white/[0.02] border border-white/5 px-4 text-[9px] font-black tracking-[0.2em] text-white outline-none focus:border-orange-500/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* Athlete Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredAthletes.map((athlete, i) => (
                            <div 
                                key={athlete.userId}
                                onClick={() => setSelectedAthlete(athlete)}
                                className="p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] hover:border-orange-500/30 transition-all cursor-pointer group animate-in slide-in-from-bottom-5 duration-500"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                            {athlete.avatarUrl ? <img src={athlete.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={20} className="text-white/20" />}
                                        </div>
                                        {(() => {
                                            const isLive = athlete.lastActiveAt && (Date.now() - new Date(athlete.lastActiveAt).getTime() < 300000);
                                            return (
                                                <div className="flex flex-col">
                                                    <h3 className="text-[11px] font-black tracking-widest text-white uppercase truncate max-w-[100px]">{athlete.name}</h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className="relative">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-cyan-400 animate-pulse' : 'bg-white/10'}`} />
                                                            {isLive && <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-cyan-400 blur-[2px] animate-pulse" />}
                                                        </div>
                                                        <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${isLive ? 'text-cyan-400/80 animate-pulse' : 'text-white/20'}`}>
                                                            {isLive ? 'Training Now' : 'Offline'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-right">
                                        <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">Verified</span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col items-center justify-center">
                                        <span className="text-[6px] font-black text-white/20 uppercase tracking-widest mb-1">Total Jumps</span>
                                        <span className="text-xs font-black text-blue-400 tracking-tighter">{athlete.totalJumps.toLocaleString()}</span>
                                    </div>
                                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col items-center justify-center">
                                        <span className="text-[6px] font-black text-white/20 uppercase tracking-widest mb-1">Sessions</span>
                                        <span className="text-xs font-black text-white tracking-widest">{athlete.sessionsCount}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                        Control <ChevronRight size={10} />
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {/* Quick Generate Plan Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAutoOpenDetailGenerator(true);
                                                setSelectedAthlete(athlete);
                                            }}
                                            title="Generate Smart Plan"
                                            className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400/60 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 transition-all active:scale-90"
                                        >
                                            <span className="text-sm font-black leading-none">+</span>
                                        </button>
                                        <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                            <Sparkles size={10} className="text-orange-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
