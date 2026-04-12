import { useState, useMemo, useEffect } from 'react';
import { Users, DollarSign, Medal, TrendingUp, Sparkles, Activity, Clock, ArrowUpRight, ChevronRight, Zap, X, Globe } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAdminAnalytics, RevenueDetail } from '../hooks/useAdminAnalytics';
import { usePresence } from '../hooks/usePresence';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { playHoverSound } from '../utils/audio';

import CoachDashboard from './CoachDashboard';
import HeadCoachDashboard from './HeadCoachDashboard';
import ReceptionDashboard from './ReceptionDashboard';
import CleanerDashboard from './CleanerDashboard';
import StudentDashboard from './StudentDashboard';

import LiveStudentsWidget from '../components/LiveStudentsWidget';
import QuickAddStudentModal from '../components/QuickAddStudentModal';
import PremiumClock from '../components/PremiumClock';

import UpcomingAgendaWidget from '../components/UpcomingAgendaWidget';

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { role, fullName, userEmail, userId } = useOutletContext<{ role: string, fullName: string, userEmail: string | null, userId: string }>() || { role: null, fullName: null, userEmail: null, userId: null };
    const cleanName = fullName?.trim() || userEmail?.split('@')[0]?.trim() || 'Admin';
    const { formatPrice, currency } = useCurrency();
    const { userProfile } = useTheme();
    const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();
    const { onlineStudents, onlineCount } = usePresence();
    const [selectedMetric, setSelectedMetric] = useState<'PT' | 'Consultation' | 'Total' | null>(null);
    const [isVerifiedStudent, setIsVerifiedStudent] = useState<boolean | null>(null);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

    const filteredDetails = useMemo(() => {
        if (!selectedMetric || !analytics?.details) return [];
        if (selectedMetric === 'Total') return analytics.details;
        return analytics.details.filter(d => d.type === selectedMetric);
    }, [selectedMetric, analytics]);

    // HEALING REDIRECTION: Check if user exists in Students table regardless of profile role
    useEffect(() => {
        const checkStudentStatus = async () => {
            if (!userId) return;
            try {
                const { data } = await supabase
                    .from('students')
                    .select('id')
                    .eq('profile_id', userId)
                    .maybeSingle();
                
                setIsVerifiedStudent(!!data);
            } catch (err) {
                console.error('Error verifying student status:', err);
                setIsVerifiedStudent(false); // Fallback to role-based
            }
        };

        checkStudentStatus();
    }, [userId]);

    // 🛡️ MASTER NAME DERIVATION: 
    // Priorities: 1. DB/Context Name, 2. Layout Context Name, 3. Email Prefix, 4. Admin
    const displayFullName = userProfile?.full_name || fullName || userEmail?.split('@')[0]?.trim() || 'Admin';
    const firstName = displayFullName.split(' ')[0];

    // RESTORE ROLE-BASED REDIRECTION (+ Student Fail-safe)
    if (!role || isVerifiedStudent === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Syncing Intelligence...</p>
            </div>
        );
    }

    const normalizedRole = role.toLowerCase().trim();
    
    // PRIORITY 1: If verified as student in DB, always go to Student Dashboard
    if (isVerifiedStudent) return <StudentDashboard />;

    // PRIORITY 2: Role-based routing for staff
    if (normalizedRole === 'head_coach') return <HeadCoachDashboard />;
    if (normalizedRole === 'coach') return <CoachDashboard />;
    if (normalizedRole === 'reception' || normalizedRole === 'receptionist') return <ReceptionDashboard role={role} />;
    if (normalizedRole === 'cleaner') return <CleanerDashboard />;
    if (normalizedRole === 'student' || normalizedRole === 'trainee') return <StudentDashboard />;

    const metrics = [
        {
            id: 'Total',
            label: 'Cycle Revenue',
            value: formatPrice(analytics?.totalRevenue || 0),
            subValue: 'Total Inbound',
            icon: DollarSign,
            color: 'text-white',
            glow: 'shadow-[0_0_50px_rgba(255,255,255,0.1)]',
            trend: '+14.2%'
        },
        {
            id: 'PT',
            label: 'PT Revenue',
            value: formatPrice(analytics?.ptRevenue || 0),
            subValue: 'Private Sessions',
            icon: Medal,
            color: 'text-amber-400',
            glow: 'shadow-[0_0_50px_rgba(245,158,11,0.15)]',
            trend: 'Elite Yield'
        },
        {
            id: 'Consultation',
            label: 'Consultations',
            value: formatPrice(analytics?.consultationRevenue || 0),
            subValue: 'Elite Strategy',
            icon: Sparkles,
            color: 'text-primary',
            glow: 'shadow-[0_0_50px_rgba(var(--primary-rgb,16,185,129),0.15)]',
            trend: 'Direct Booking'
        },
        {
            id: 'Athletes',
            label: 'Athletes',
            value: analytics?.athleteCount || 0,
            subValue: 'Total Strength',
            icon: Users,
            color: 'text-white/60',
            glow: 'shadow-[0_0_50px_rgba(255,255,255,0.05)]',
            trend: 'Active Roster',
            path: '/app/students'
        }
    ];

    return (
        <div className="min-h-screen pb-20 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 space-y-8">
                {/* Header Canvas - Elite Transformation */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-6 mb-12">
                <div className="flex flex-col gap-6">
                    {/* Header Breadcrumb & Greeting */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(var(--color-primary),0.8)]" />
                            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">
                                {t('dashboard.welcomeBack', 'Intelligence Active')}
                            </h2>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 ml-1">
                                <span className="text-[11px] font-black text-primary uppercase tracking-[0.5em] drop-shadow-[0_0_8px_rgba(var(--color-primary),0.3)]">{t('dashboard.hello', 'Hello')}</span>
                                <div className="h-[1px] w-8 bg-gradient-to-r from-primary/40 to-transparent" />
                            </div>
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-tight animate-in fade-in zoom-in-95 duration-1000">
                                <span className="premium-gradient-text drop-shadow-[0_10px_20px_rgba(var(--color-primary),0.15)] opacity-90">
                                    {firstName}
                                </span>
                            </h1>
                        </div>
                    </div>

                    {/* Status Badges Row */}
                    <div className="flex flex-wrap items-center gap-3 opacity-0 animate-in fade-in slide-in-from-left-12 duration-1000 delay-500 fill-mode-forwards">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 backdrop-blur-md">
                            <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Elite Perspective</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                            <Activity className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Intelligence Active</span>
                        </div>
                    </div>
                </div>

                    <div className="flex items-center gap-6">
                        <PremiumClock />
                    </div>
                </div>

                {/* Metrics Matrix - Unified Revenue Hub & Roster */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Unified Revenue Intelligence Hub */}
                    <div
                        onClick={() => setSelectedMetric('Total')}
                        onMouseEnter={playHoverSound}
                        className="glass-card relative group py-8 px-8 bg-white/[0.01] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.02] transition-all duration-700 cursor-pointer active:scale-[0.98] shadow-premium h-full"
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-white/5 group-hover:scale-110 transition-transform duration-700">
                                    <DollarSign className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[12px] font-black text-primary uppercase tracking-[0.4em] leading-none">Financial Intelligence</p>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Live Revenue Stream</p>
                                </div>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                                <ArrowUpRight className="w-5 h-5 text-white/40" />
                            </div>
                        </div>

                        <div className="flex items-baseline gap-4 mb-2">
                           <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter tabular-nums leading-none">
                                {analyticsLoading ? '...' : formatPrice(analytics?.totalRevenue || 0)}
                            </h3>
                            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md">+14% Goal</span>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-white/[0.05]">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">PT Vertical</span>
                                </div>
                                <p className="text-xl md:text-2xl font-black text-white/80 tabular-nums">
                                    {analyticsLoading ? '...' : formatPrice(analytics?.ptRevenue || 0)}
                                </p>
                            </div>
                            <div className="space-y-2 border-l border-white/5 pl-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Consultations</span>
                                </div>
                                <p className="text-xl md:text-2xl font-black text-white/80 tabular-nums">
                                    {analyticsLoading ? '...' : formatPrice(analytics?.consultationRevenue || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Athlete Network Hub */}
                    <div
                        onClick={() => navigate('/app/students')}
                        onMouseEnter={playHoverSound}
                        className="glass-card relative group py-8 px-8 bg-white/[0.01] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.02] transition-all duration-700 cursor-pointer active:scale-[0.98] shadow-premium h-full"
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-white/5 rounded-2xl text-white/30 border border-white/5 group-hover:scale-110 transition-transform duration-700">
                                    <Users className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[12px] font-black text-white/40 uppercase tracking-[0.4em] leading-none">Athlete Network</p>
                                    <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.2em]">Active Roster Intelligence</p>
                                </div>
                            </div>
                             <div className="p-3 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                                <ArrowUpRight className="w-5 h-5 text-white/40" />
                            </div>
                        </div>

                        <div className="flex items-baseline gap-4 mb-2">
                            <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter tabular-nums leading-none">
                                {analyticsLoading ? '...' : analytics?.athleteCount}
                            </h3>
                            <span className="text-xs font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">Live Pulse</span>
                        </div>

                        <div className="flex items-center justify-between mt-8 pt-8 border-t border-white/[0.05]">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#050505] bg-white/10 flex items-center justify-center overflow-hidden">
                                            <Activity className="w-4 h-4 text-white/20" />
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-[#050505] bg-primary flex items-center justify-center text-[10px] font-black text-white">+</div>
                                </div>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Top Performers</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-[0_0_20px_rgba(var(--color-primary),0.3)]">
                                    <ChevronRight className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Strategy Hub Hub - The Central Command (Middle Overlay) */}
                <div
                    onClick={() => navigate('/app/strategy-hub')}
                    onMouseEnter={playHoverSound}
                    className="relative group py-10 px-10 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-[3rem] hover:bg-emerald-500/[0.06] hover:border-emerald-500/20 transition-all duration-700 cursor-pointer overflow-hidden active:scale-95 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
                >
                    <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] opacity-40 group-hover:opacity-70 transition-opacity duration-1000" />
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
                        <div className="flex items-center gap-10">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-all duration-1000">
                                <Sparkles className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">Elite Strategy Hub</h3>
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active System</span>
                                    <p className="text-[12px] font-black text-white/30 uppercase tracking-[0.4em]">Integrated Intelligence Dashboard</p>
                                </div>
                            </div>
                        </div>
                        <button className="flex items-center gap-4 px-10 py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:scale-105 transition-all shadow-2xl">
                            Enter CommandCenter <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Bottom Intelligence Grid: Live Floor & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
                    {/* Live Floor Area - Takes up 2 columns */}
                    <div className="lg:col-span-2 glass-card p-8 rounded-[3rem] border border-white/5 bg-white/[0.01] min-h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <Globe className="w-6 h-6 text-primary animate-pulse" />
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">Live Floor</h3>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Real-time Athlete Presence</p>
                                </div>
                            </div>
                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{onlineStudents.length} Athletes Online</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <LiveStudentsWidget onlineStudents={onlineStudents} />
                        </div>
                    </div>

                    {/* Recent Agenda Area - Sidebar */}
                    <div className="lg:col-span-1 glass-card p-8 rounded-[3rem] border border-white/5 bg-white/[0.01]">
                         <div className="flex items-center gap-4 mb-8 pb-4 border-b border-white/5">
                            <Clock className="w-6 h-6 text-amber-500" />
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">Elite Agenda</h3>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Upcoming Missions</p>
                            </div>
                        </div>
                        <UpcomingAgendaWidget />
                    </div>
                </div>
            </div>

            {/* Financial Detail Intelligence Overlay - Ultra Glassmorphism */}
            {selectedMetric && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-8 animate-in fade-in duration-500">
                    <div 
                        className="absolute inset-0 bg-black/10 backdrop-blur-md cursor-pointer"
                        onClick={() => setSelectedMetric(null)}
                    />
                    
                    <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0c0e14] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-700 shadow-[0_50px_100px_rgba(0,0,0,0.6)]">
                        {/* Interior Glass Glows */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                        
                        {/* High-End Header */}
                        <div className="p-6 sm:p-10 border-b border-white/5 flex items-center justify-between relative z-10">
                            <div className="space-y-1">
                                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter leading-tight">
                                    {selectedMetric} Intelligence
                                </h3>
                                <p className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Detailed Transaction Audit</p>
                            </div>
                            <button 
                                onClick={() => setSelectedMetric(null)}
                                className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl border border-red-500/20 transition-all active:scale-90"
                            >
                                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        {/* Transaction Feed */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar relative z-10">
                            {filteredDetails.length === 0 ? (
                                <div className="py-20 text-center opacity-20 italic font-black uppercase tracking-widest text-[9px]">No data streams detected</div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredDetails.map((item, i) => (
                                        <div key={item.id} className="flex items-center justify-between py-6 sm:py-8 border-b border-white/[0.03] hover:translate-x-1 transition-all group">
                                            <div className="space-y-1 sm:space-y-2">
                                                <p className="text-[8px] sm:text-[9px] font-black text-primary uppercase tracking-widest">{item.date}</p>
                                                <p className="text-sm sm:text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.student_name}</p>
                                                <p className="text-[7px] sm:text-[9px] font-bold text-white/10 uppercase tracking-widest">{item.notes || 'System Audit Trail'}</p>
                                            </div>
                                            <div className="text-right space-y-2 sm:space-y-3">
                                                <p className="text-lg sm:text-3xl font-black text-white tracking-tighter tabular-nums">
                                                    {currency.code} {item.amount}
                                                </p>
                                                <div className="px-3 sm:px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full inline-block">
                                                    <span className="text-[7px] sm:text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">{item.type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <QuickAddStudentModal
                isOpen={isQuickAddOpen}
                onClose={() => setIsQuickAddOpen(false)}
                onSuccess={() => { }}
            />
        </div>
    );
}
