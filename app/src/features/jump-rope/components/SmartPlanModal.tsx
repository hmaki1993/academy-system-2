import React, { useState, useEffect } from 'react';
import { X, Zap, Activity, Calculator, Send, Sparkles } from 'lucide-react';
import { useSmartPlan, TrainingMetric, GeneratedPlan } from '../../../hooks/useSmartPlan';

interface SmartPlanModalProps {
    studentId: string;
    studentName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function SmartPlanModal({ studentId, studentName, isOpen, onClose }: SmartPlanModalProps) {
    const { generateAIPlan, sendPlan, isGenerating, isSending } = useSmartPlan();
    
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

    // Auto-calculate BMR/TDEE preview
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
        // Merge edited content back into plan
        const finalPlan = { ...plan, weeklyPlan: editablePlan };
        await sendPlan(studentId, finalPlan);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-[#050505]" onClick={onClose} />
            
            <div className="relative w-full max-w-[500px] bg-zinc-950/90 border border-orange-500/20 rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-black tracking-widest uppercase text-white leading-none">Smart Plan</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mt-2">AI Generator for {studentName}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                            {(['en', 'ar'] as const).map(lang => (
                                <button
                                    key={lang}
                                    onClick={async () => {
                                        const newMetrics = {...metrics, language: lang};
                                        setMetrics(newMetrics);
                                        // Auto-regenerate if a plan is already visible
                                        if (plan) {
                                            const result = await generateAIPlan(studentId, newMetrics);
                                            setPlan(result);
                                            setEditablePlan(result.weeklyPlan);
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${metrics.language === lang ? 'bg-orange-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
                    {!plan ? (
                        <div className="space-y-6">
                            {/* Inputs Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">
                                        {metrics.language === 'ar' ? 'الوزن (كجم)' : 'Weight (KG)'}
                                    </label>
                                    <input 
                                        type="number" 
                                        value={metrics.weight}
                                        onChange={e => setMetrics({...metrics, weight: Number(e.target.value)})}
                                        className="w-full bg-white/[0.01] border border-white/5 rounded-2xl px-5 py-3 text-sm font-black text-white focus:border-orange-500/10 focus:bg-white/[0.03] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">
                                        {metrics.language === 'ar' ? 'الطول (سم)' : 'Height (CM)'}
                                    </label>
                                    <input 
                                        type="number" 
                                        value={metrics.height}
                                        onChange={e => setMetrics({...metrics, height: Number(e.target.value)})}
                                        className="w-full bg-white/[0.01] border border-white/5 rounded-2xl px-5 py-3 text-sm font-black text-white focus:border-orange-500/10 focus:bg-white/[0.03] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">
                                        {metrics.language === 'ar' ? 'العمر' : 'Age'}
                                    </label>
                                    <input 
                                        type="number" 
                                        value={metrics.age}
                                        onChange={e => setMetrics({...metrics, age: Number(e.target.value)})}
                                        className="w-full bg-white/[0.01] border border-white/5 rounded-2xl px-5 py-3 text-sm font-black text-white focus:border-orange-500/10 focus:bg-white/[0.03] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2 relative">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">
                                        {metrics.language === 'ar' ? 'أيام التدريب' : 'Days / Week'}
                                    </label>
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowDaysMenu(!showDaysMenu)}
                                            className="w-full bg-white/[0.01] border border-white/5 rounded-2xl px-5 py-3 text-sm font-black text-white focus:border-orange-500/10 focus:bg-white/[0.03] outline-none transition-all flex items-center justify-between group"
                                        >
                                            <span>{metrics.daysPerWeek} {metrics.language === 'ar' ? 'أيام' : 'Days'}</span>
                                            <Calculator size={14} className={`text-white/20 group-hover:text-orange-500 transition-all ${showDaysMenu ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showDaysMenu && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowDaysMenu(false)} />
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 z-50 shadow-2xl animate-in zoom-in-95 duration-200">
                                                    {[1,2,3,4,5,6,7].map(d => (
                                                        <button
                                                            key={d}
                                                            onClick={() => {
                                                                setMetrics({...metrics, daysPerWeek: d});
                                                                setShowDaysMenu(false);
                                                            }}
                                                            className={`w-full px-4 py-2.5 rounded-xl text-left text-[11px] font-black uppercase tracking-widest transition-all ${metrics.daysPerWeek === d ? 'bg-orange-500 text-black' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                                                        >
                                                            {d} Days
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Live Stats Preview - Premium Compact Version */}
                            <div className="p-4 rounded-[1.8rem] bg-white/[0.01] border border-white/5 flex items-center justify-around relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                
                                <div className="text-center relative z-10">
                                    <span className="block text-[6px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">
                                        {metrics.language === 'ar' ? 'معدل الأيض' : 'BMR'}
                                    </span>
                                    <span className="text-sm font-black text-white/80 tabular-nums">{bmrPreview}</span>
                                </div>
                                <div className="w-px h-6 bg-white/5" />
                                <div className="text-center relative z-10">
                                    <span className="block text-[6px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">
                                        {metrics.language === 'ar' ? 'إجمالي الطاقة' : 'TDEE'}
                                    </span>
                                    <span className="text-sm font-black text-white/80 tabular-nums">{tdeePreview}</span>
                                </div>
                                <div className="w-px h-6 bg-white/5" />
                                <div className="text-center relative z-10">
                                    <span className="block text-[6px] font-black uppercase tracking-[0.3em] text-orange-500/40 mb-1">
                                        {metrics.language === 'ar' ? 'هدف الحرق' : 'Burn Goal'}
                                    </span>
                                    <span className="text-sm font-black text-orange-500 tabular-nums">{Math.round(tdeePreview * 0.8)}</span>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-fit px-8 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_10px_30px_rgba(249,115,22,0.1)] transition-all hover:bg-orange-500 hover:text-black active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isGenerating ? <Activity className="animate-spin" size={14} /> : <Sparkles size={14} />}
                                    {metrics.language === 'ar' ? 'توليد خطة التدريب' : 'GENERATE PLAN'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
                            {/* Editable Plan Layout */}
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2 text-orange-500">
                                    <Zap size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                        {metrics.language === 'ar' ? 'الخطة جاهزة (اضغط للتعديل)' : 'Plan Ready (Click to edit)'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setPlan(null)}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/40"
                                    title="Regenerate"
                                >
                                    <Activity size={12} />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {editablePlan.map((d, i) => (
                                    <div key={i} className="p-5 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4 hover:border-orange-500/20 transition-all">
                                        <div className="flex items-center justify-between">
                                            <input 
                                                value={d.day}
                                                onChange={e => handleUpdateDay(i, 'day', e.target.value)}
                                                className="bg-transparent border-none p-0 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] w-1/2 focus:outline-none"
                                            />
                                            <input 
                                                value={d.focus}
                                                onChange={e => handleUpdateDay(i, 'focus', e.target.value)}
                                                className="bg-transparent border-none p-0 text-[8px] font-black text-white/30 uppercase tracking-[0.1em] text-right w-1/2 focus:outline-none"
                                            />
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {d.details.map((ex, j) => (
                                                <div key={j} className="flex items-center gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                                                    <input 
                                                        value={ex}
                                                        onChange={e => handleUpdateDetail(i, j, e.target.value)}
                                                        className="flex-1 bg-transparent border-none p-0 text-[11px] font-black text-white/80 focus:outline-none focus:text-white transition-colors"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center">
                                <button 
                                    onClick={handleSend}
                                    disabled={isSending}
                                    className="w-fit px-10 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_10px_30px_rgba(249,115,22,0.1)] transition-all hover:bg-orange-500 hover:text-black active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSending ? <Activity className="animate-spin" size={14} /> : <Send size={14} />}
                                    SEND TO {studentName.split(' ')[0]}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
