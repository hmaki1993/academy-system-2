import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BrainCircuit,
    Trash2,
    Sparkles,
    History,
    PlusCircle,
    X,
    Loader2,
    Target,
    Activity,
    Save,
    Printer,
    Clock,
    ShieldAlert,
    ChevronDown
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { generateTrainingPlan } from '../services/smartService';
import { useTheme } from '../context/ThemeContext';
import { handleSmartError } from '../utils/smartUtils';
import toast from 'react-hot-toast';

interface EliteCoachAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function CustomSelect({ label, value, options, onChange, allowCustom = false }: { label: string, value: string, options: { value: string, label: string }[], onChange: (val: string) => void, allowCustom?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customValue, setCustomValue] = useState('');

    const selectedOption = options.find(opt => opt.value === value);
    const displayLabel = selectedOption ? selectedOption.label : (value || 'Select...');

    const handleSelect = (val: string) => {
        if (val === 'custom') {
            setIsCustomMode(true);
            setIsOpen(false);
        } else {
            setIsCustomMode(false);
            onChange(val);
            setIsOpen(false);
        }
    };

    if (isCustomMode) {
        return (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">{label}</label>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Neural Input Mode</span>
                </div>
                
                <div className="relative group/input flex items-center gap-1 bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-1.5 focus-within:border-primary/40 focus-within:shadow-[0_0_20px_rgba(var(--primary-rgb,16,185,129),0.1)] transition-all duration-500">
                    <input 
                        type="text" 
                        value={customValue}
                        autoFocus
                        onChange={(e) => setCustomValue(e.target.value)}
                        placeholder="Custom..."
                        className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white outline-none appearance-none placeholder:text-white/10 font-bold selection:bg-primary/20 min-w-0"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (customValue.trim()) onChange(customValue.trim());
                                setIsCustomMode(false);
                            }
                        }}
                    />
                    
                    <div className="flex items-center gap-1 pr-0.5">
                        <button 
                            onClick={() => {
                                if (customValue.trim()) onChange(customValue.trim());
                                setIsCustomMode(false);
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/20 hover:border-primary rounded-lg transition-all duration-300 shadow-lg group/submit shrink-0"
                        >
                            <PlusCircle className="w-4 h-4 group-hover/submit:scale-110 transition-transform" />
                        </button>
                        
                        <button 
                            onClick={() => setIsCustomMode(false)}
                            className="w-7 h-7 flex items-center justify-center bg-white/[0.03] hover:bg-rose-500/10 text-white/30 hover:text-rose-500 border border-white/5 hover:border-rose-500/20 rounded-lg transition-all duration-300 group/cancel shrink-0"
                        >
                            <X className="w-4 h-4 group-hover/cancel:rotate-90 transition-transform" />
                        </button>
                    </div>

                    {/* Subtle underline glow */}
                    <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-700" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="block text-[9px] font-black uppercase tracking-widest text-primary/70 ml-1">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-1.5 text-sm text-white flex items-center justify-between group hover:border-white/20 transition-all outline-none"
                >
                    <span className="truncate">{displayLabel}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0d161a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {options.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full px-4 py-3 text-sm text-left transition-colors flex items-center justify-between group/opt ${
                                            value === opt.value ? 'bg-primary/20 text-primary' : 'text-white/60 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        {opt.label}
                                        {value === opt.value && <div className="w-1 h-1 rounded-full bg-primary" />}
                                    </button>
                                ))}
                                {allowCustom && (
                                    <button
                                        type="button"
                                        onClick={() => handleSelect('custom')}
                                        className="w-full px-4 py-3 text-sm text-left text-primary/60 hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-2 border-t border-white/5 mt-1"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        Add Custom...
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function EliteCoachAssistantModal({ isOpen, onClose }: EliteCoachAssistantModalProps) {
    const { t } = useTranslation();
    const { settings } = useTheme();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [savedPlans, setSavedPlans] = useState<any[]>([]);
    const [view, setView] = useState<'generator' | 'history'>('generator');
    const [focusedDrill, setFocusedDrill] = useState<any>(null);
    const [retryTimer, setRetryTimer] = useState<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('ai_training_plans');
        if (saved) setSavedPlans(JSON.parse(saved));
    }, []);

    const saveToLocalStorage = (plans: any[]) => {
        localStorage.setItem('ai_training_plans', JSON.stringify(plans));
        setSavedPlans(plans);
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Retry timer countdown
    useEffect(() => {
        if (retryTimer === null) return;
        if (retryTimer <= 0) {
            setRetryTimer(null);
            return;
        }

        const timer = setInterval(() => {
            setRetryTimer(prev => (prev && prev > 0) ? prev - 1 : null);
        }, 1000);

        return () => clearInterval(timer);
    }, [retryTimer]);

    const handleSavePlan = () => {
        if (!result) return;
        
        const isDuplicate = savedPlans.some(p => p.title === result.title && p.overview === result.overview);
        if (isDuplicate) {
            toast.error("This plan is already in your history!");
            return;
        }

        const newPlan = {
            ...result,
            id: Date.now().toString(),
            date: new Date().toISOString(),
            metadata: { ageGroup, skillLevel, focusArea }
        };
        saveToLocalStorage([newPlan, ...savedPlans]);
        toast.success("Plan saved to history!");
    };

    const deletePlan = (id: string) => {
        const filtered = savedPlans.filter(p => p.id !== id);
        saveToLocalStorage(filtered);
        toast.success("Plan removed from history");
    };

    // Form State
    const [ageGroup, setAgeGroup] = useState('10');
    const [skillLevel, setSkillLevel] = useState('Beginner');
    const [focusArea, setFocusArea] = useState('Core Strength & Flexibility');
    const [duration, setDuration] = useState('2');
    const [weaknesses, setWeaknesses] = useState('');
    const [planLanguage, setPlanLanguage] = useState('Arabic');
    const [sessionsPerWeek, setSessionsPerWeek] = useState('3');

    const handleGenerate = async () => {
        const age = parseInt(ageGroup);
        if (isNaN(age) || age < 4 || age > 80) {
            toast.error("Please enter a valid age (4-80)!");
            return;
        }

        if (retryTimer && retryTimer > 0) {
            toast.error(`Please wait ${retryTimer}s before retrying.`);
            return;
        }

        const apiKey = settings.api_keys?.smart || 'AIzaSyBilFTTvflCz5EoNv07xIbBCw7t7OYt5lY';
        if (!apiKey) {
            toast.error("Smart Engine Key missing!");
            return;
        }

        setLoading(true);
        setResult(null);
        try {
            const plan = await generateTrainingPlan({
                ageGroup,
                skillLevel,
                focusArea,
                durationWeeks: parseInt(duration),
                weaknesses: weaknesses || 'None specified',
                apiKey: apiKey,
                language: planLanguage,
                sessionsPerWeek: parseInt(sessionsPerWeek)
            });
            setResult(plan);
            toast.success("Training Plan Generated Successfully!");
        } catch (error: any) {
            const parsedError = handleSmartError(error);
            toast.error(parsedError.message);
            
            if (parsedError.retryAfterSeconds) {
                setRetryTimer(parsedError.retryAfterSeconds);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-hidden ai-coach-portal">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    /* NUCLEAR OPTION: Hide EVERYTHING in the body EXCEPT the portal */
                    body > *:not(.ai-coach-portal) { display: none !important; }
                    
                    /* Reset the Portal for Print */
                    .ai-coach-portal { 
                        display: block !important; 
                        position: relative !important;
                        height: auto !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }
                    
                    /* Ensure the fixed/90vh modal container expands */
                    .print-wrapper {
                        display: block !important;
                        position: relative !important;
                        top: auto !important;
                        left: auto !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        min-height: 100% !important;
                        background: #0a1215 !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        overflow: visible !important;
                    }

                    .print-content {
                        display: block !important;
                        background: #0a1215 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        height: auto !important;
                    }

                    /* Important: Target the scrollable results area specifically */
                    [class*="overflow-y-auto"], 
                    .custom-scrollbar,
                    .flex-1 {
                        display: block !important;
                        position: relative !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: transparent !important;
                    }

                    /* Elements to definitely hide */
                    .no-print, 
                    .no-print *, 
                    button, 
                    nav, 
                    .sidebar, 
                    aside, 
                    .modal-close, 
                    .backdrop-blur-xl, 
                    .flex-shrink-0,
                    [class*="bg-black/80"] {
                        display: none !important;
                    }

                    html, body {
                        background: #0a1215 !important;
                        color: white !important;
                        height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color: white !important;
                    }

                    /* Flatten loops and scrollables */
                    .overflow-y-auto, .custom-scrollbar {
                        overflow: visible !important;
                        height: auto !important;
                    }
                }
            `}} />
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-700 no-print" onClick={onClose} />
            
            <div className="relative w-full max-w-6xl h-[95vh] bg-[#0a1215] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 print-wrapper">
                <div className="flex-1 flex flex-col overflow-hidden print-content">                {/* Header */}
                <div className="flex-shrink-0 relative z-10 px-6 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.2)]">
                                <BrainCircuit className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    Smart Assist
                                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[7px] tracking-[0.2em]">PRO</span>
                                </h2>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-1 no-print">
                            <button
                                onClick={() => setView('generator')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    view === 'generator' ? 'text-primary border border-primary/20' : 'text-white/30 hover:text-white/60 border border-transparent'
                                }`}
                            >
                                <Sparkles className="w-3 h-3" /> Generator
                            </button>
                            <button
                                onClick={() => setView('history')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                    view === 'history' ? 'text-primary border border-primary/20' : 'text-white/30 hover:text-white/60 border border-transparent'
                                }`}
                            >
                                <History className="w-3 h-3" /> History
                                {savedPlans.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 transition-all border-none no-print">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-0 flex flex-col lg:flex-row">
                    {view === 'generator' ? (
                        <>
                            {/* Generator Sidebar */}
                            <div className="w-full lg:w-[260px] flex-shrink-0 border-r border-white/5 p-4 bg-black/20 no-print flex flex-col">
                                <div className="space-y-2.5 flex-1 overflow-hidden flex flex-col">
                                    <div className="space-y-2 flex-1 overflow-hidden">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Configuration</h3>
                                        
                                        <div className="space-y-2.5">
                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1 ml-1">Athlete Age</label>
                                                <input 
                                                    type="number" 
                                                    value={ageGroup} 
                                                    onChange={e => setAgeGroup(e.target.value)} 
                                                    placeholder="Age"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-1.5 text-sm text-white focus:border-primary/50 outline-none transition-all"
                                                />
                                            </div>

                                            <CustomSelect 
                                                label="Skill Level"
                                                value={skillLevel}
                                                onChange={setSkillLevel}
                                                allowCustom
                                                options={[
                                                    { value: 'Beginner', label: 'Beginner' },
                                                    { value: 'Intermediate', label: 'Intermediate' },
                                                    { value: 'Advanced', label: 'Advanced' },
                                                    { value: 'Elite', label: 'Elite' }
                                                ]}
                                            />

                                            <CustomSelect 
                                                label="Focus Area"
                                                value={focusArea}
                                                onChange={setFocusArea}
                                                allowCustom
                                                options={[
                                                    { value: 'Core & Flexibility', label: 'Core & Flexibility' },
                                                    { value: 'Floor Routine', label: 'Floor Routine' },
                                                    { value: 'Vault', label: 'Vault' },
                                                    { value: 'Uneven Bars', label: 'Uneven Bars' },
                                                    { value: 'Balance Beam', label: 'Balance Beam' },
                                                    { value: 'Pommel/Rings', label: 'Pommel/Rings' },
                                                    { value: 'Trampoline & Air Time', label: 'Trampoline' },
                                                    { value: 'Strength & Conditioning', label: 'Strength/Cond.' },
                                                    { value: 'Routine Visualization', label: 'Visual/Mental' }
                                                ]}
                                            />

                                            <CustomSelect 
                                                label="Training Frequency"
                                                value={sessionsPerWeek}
                                                onChange={setSessionsPerWeek}
                                                options={[
                                                    { value: '2', label: '2 Sessions / Wk' },
                                                    { value: '3', label: '3 Sessions / Wk' },
                                                    { value: '4', label: '4 Sessions / Wk' },
                                                    { value: '5', label: '5 Sessions / Wk' },
                                                    { value: '6', label: '6 Sessions / Wk' }
                                                ]}
                                            />

                                            <CustomSelect 
                                                label="Duration"
                                                value={duration}
                                                onChange={setDuration}
                                                allowCustom
                                                options={[
                                                    { value: '1', label: '1 Week' },
                                                    { value: '2', label: '2 Weeks' },
                                                    { value: '4', label: '4 Weeks' }
                                                ]}
                                            />

                                            <CustomSelect 
                                                label="Plan Language"
                                                value={planLanguage}
                                                onChange={setPlanLanguage}
                                                options={[
                                                    { value: 'Arabic', label: 'اللغة العربية (مصر)' },
                                                    { value: 'English', label: 'English (US)' }
                                                ]}
                                            />

                                            <div>
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1 ml-1">Weaknesses</label>
                                                <textarea 
                                                    value={weaknesses}
                                                    onChange={e => setWeaknesses(e.target.value)}
                                                    placeholder="Add details..."
                                                    className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-4 py-1.5 text-xs text-white focus:border-primary/50 outline-none transition-colors resize-none placeholder:text-white/10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={loading || (retryTimer !== null && retryTimer > 0)}
                                        className="w-fit px-8 mx-auto py-2 rounded-lg bg-transparent hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-rose-500 hover:text-rose-400 font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 backdrop-blur-xl group/btn disabled:opacity-50 mt-1 flex-shrink-0"
                                    >
                                        {retryTimer !== null && retryTimer > 0 ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span className="text-[10px]">Wait {retryTimer}s</span>
                                            </>
                                        ) : loading ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <>
                                                <Sparkles className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                                <span className="text-[10px]">Generate</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Main Results Panel */}
                            <div className="flex-1 bg-black/40 relative overflow-y-auto custom-scrollbar p-8">
                                {loading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a1215]/90 backdrop-blur-sm z-20">
                                        <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                                            <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-primary/30 border-l-transparent rounded-full animate-spin"></div>
                                            <BrainCircuit className="w-8 h-8 text-primary animate-pulse" />
                                        </div>
                                        <h3 className="text-lg font-black text-white tracking-widest uppercase animate-pulse text-center">Architecting Solution</h3>
                                        <p className="text-[10px] text-primary/70 uppercase tracking-[0.2em] font-black mt-2">Integrating progressions...</p>
                                    </div>
                                )}

                                {!result && !loading && (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                        <Target className="w-16 h-16 mb-6" />
                                        <h3 className="text-lg font-black uppercase tracking-widest mb-2">Awaiting Parameters</h3>
                                        <p className="text-xs max-w-[200px]">Define the training constraints in the lateral panel.</p>
                                    </div>
                                )}

                                {result && !loading && (
                                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 pb-12">
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="flex-1">
                                                <h1 className="text-xl sm:text-2xl font-black text-white mb-3 leading-tight tracking-tight">{result.title}</h1>
                                                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-white/60 text-sm leading-relaxed glass-morphism">
                                                    {result.overview}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 no-print">
                                                {savedPlans.some(p => p.title === result.title) ? (
                                                    <div className="p-3 rounded-xl text-emerald-500 border border-emerald-500/20 flex items-center justify-center" title="Already Saved">
                                                        <Save className="w-5 h-5" />
                                                    </div>
                                                ) : (
                                                    <button onClick={handleSavePlan} className="p-3 rounded-xl hover:bg-primary/10 text-primary border border-primary/20 transition-all active:scale-95 group">
                                                        <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                                    </button>
                                                )}
                                                <button onClick={() => window.print()} className="p-3 rounded-xl hover:bg-white/5 text-white/60 border border-white/10 transition-all">
                                                    <Printer className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-12">
                                            {result.weeks?.map((week: any, idx: number) => (
                                                <div key={idx} className="space-y-6 break-inside-avoid">
                                                    <div className="flex items-center gap-4 border-b border-primary/20 pb-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-lg">
                                                            {week.week_number}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-white uppercase tracking-widest">{week.focus}</h3>
                                                            <p className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] mt-0.5">Tactical Phase Lifecycle</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                                        {week.days?.map((day: any, dIdx: number) => (
                                                            <div key={dIdx} className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 relative group hover:border-primary/20 transition-all flex flex-col">
                                                                <div className="flex items-center justify-between mb-6">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-black text-[10px] uppercase tracking-[0.2em] border border-emerald-500/20">
                                                                            Day {day.day_number}
                                                                        </div>
                                                                        <h4 className="text-sm font-black text-white/90">{day.daily_focus}</h4>
                                                                    </div>
                                                                    <Activity className="w-4 h-4 text-white/10 group-hover:text-primary transition-colors" />
                                                                </div>

                                                                <div className="space-y-4 flex-1">
                                                                    {day.drills?.map((drill: any, drIdx: number) => (
                                                                        <div 
                                                                            key={drIdx} 
                                                                            onClick={() => setFocusedDrill(drill)}
                                                                            className="p-5 rounded-2xl bg-black/40 border border-white/5 hover:bg-primary/[0.05] hover:border-primary/30 transition-all cursor-pointer group/drill"
                                                                        >
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                                                <h5 className="text-[11px] font-black text-white uppercase group-hover/drill:text-primary transition-colors">{drill.name}</h5>
                                                                            </div>
                                                                            <p className="text-[10px] text-white/40 leading-relaxed mb-4 italic">"{drill.coach_cue}"</p>
                                                                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                                                <span className="text-[9px] font-black text-primary/70 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded">{drill.sets_reps}</span>
                                                                                <div className="flex items-center gap-1 text-[9px] font-black text-white/20 uppercase group-hover/drill:text-white/40 transition-colors">
                                                                                    <Clock className="w-3 h-3" /> {drill.rest}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {result.safety_notes && (
                                            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex gap-4 items-start animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.1)] break-inside-avoid">
                                                <ShieldAlert className="w-6 h-6 text-rose-500 flex-shrink-0" />
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 mb-2">Protocol & Safety</h4>
                                                    <p className="text-xs text-rose-100/70 leading-relaxed font-medium">{result.safety_notes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col bg-black/40 overflow-hidden">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Elite Motion Assistant</h2>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-black mt-1">Access previously generated tactical plans</p>
                                </div>
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                    {savedPlans.length} Records Found
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                                {savedPlans.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center grayscale">
                                        <History className="w-16 h-16 mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No plans in archive yet</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {savedPlans.map((plan) => (
                                            <div key={plan.id} className="group relative p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-primary/30 hover:bg-primary/[0.02] transition-all flex flex-col">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="px-2 py-0.5 rounded-md bg-white/10 text-[8px] font-black text-white/40 uppercase tracking-widest">
                                                        {new Date(plan.date).toLocaleDateString()}
                                                    </div>
                                                    <button 
                                                        onClick={() => deletePlan(plan.id)}
                                                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/10 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <h4 className="text-sm font-black text-white/90 mb-2 group-hover:text-primary transition-colors line-clamp-2">{plan.title}</h4>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="text-[8px] font-black uppercase text-white/30 px-2 py-0.5 rounded bg-white/5 border border-white/5">{plan.metadata?.skillLevel}</span>
                                                    <span className="text-[8px] font-black uppercase text-white/30 px-2 py-0.5 rounded bg-white/5 border border-white/5">{plan.metadata?.focusArea}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setResult(plan);
                                                        setView('generator');
                                                    }}
                                                    className="mt-auto w-full py-2 rounded-xl bg-white/5 hover:bg-primary hover:text-black font-black text-[9px] uppercase tracking-widest transition-all"
                                                >
                                                    View Blueprint
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Drill Focus Overlay */}
            {focusedDrill && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-8 no-print">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => setFocusedDrill(null)} />
                    <div className="relative w-full max-w-2xl bg-[#0a1215]/80 border border-white/10 rounded-[3rem] p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 flex flex-col items-center text-center">
                        <button 
                            onClick={() => setFocusedDrill(null)}
                            className="absolute top-8 right-8 p-3 rounded-full bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all border border-white/5"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-8 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.2)]">
                            <Activity className="w-10 h-10" />
                        </div>

                        <h3 className="text-3xl font-black text-white uppercase tracking-widest mb-4 leading-tight">{focusedDrill.name}</h3>
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className="px-4 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-[0.2em]">
                                {focusedDrill.sets_reps}
                            </div>
                            <div className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock className="w-4 h-4" /> {focusedDrill.rest} Rest
                            </div>
                        </div>

                        <div className="w-full max-w-md p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-3 text-left">Coach's Technical Cue</h4>
                            <p className="text-lg text-white/90 font-medium italic leading-relaxed text-left">
                                "{focusedDrill.coach_cue}"
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setFocusedDrill(null)}
                            className="mt-12 px-10 py-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.3)]"
                        >
                            Back to Blueprint
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>,
    document.body
    );
}
