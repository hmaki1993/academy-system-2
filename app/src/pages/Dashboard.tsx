import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
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
const StudentDashboard = lazy(() => import('./EliteDashboard'));

import LiveStudentsWidget from '../components/LiveStudentsWidget';
import QuickAddStudentModal from '../components/QuickAddStudentModal';
import PremiumClock from '../components/PremiumClock';
import MinimalCountdown from '../components/MinimalCountdown';

import UpcomingAgendaWidget from '../components/UpcomingAgendaWidget';

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { role, fullName, userEmail, userId, isVerifiedStudent } = useOutletContext<{ role: string, fullName: string, userEmail: string | null, userId: string, isVerifiedStudent: boolean | null }>() || { role: null, fullName: null, userEmail: null, userId: null, isVerifiedStudent: null };
    const cleanName = fullName?.trim() || userEmail?.split('@')[0]?.trim() || 'Admin';
    const { formatPrice, currency } = useCurrency();
    const { userProfile } = useTheme();
    const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();
    const { onlineStudents, onlineCount } = usePresence();
    const [selectedMetric, setSelectedMetric] = useState<'Total Revenue' | 'Consultations' | 'PT Sessions' | 'Athletes' | null>(null);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

    // AI TRACKER REAL-TIME STATE
    const [scheduledStart, setScheduledStart] = useState<string | null>(null);
    const [planStatus, setPlanStatus] = useState<string | null>(null);

    const filteredDetails = useMemo(() => {
        if (!selectedMetric || !analytics) return [];
        if (selectedMetric === 'Total Revenue') return analytics.revenueDetails || [];
        if (selectedMetric === 'Consultations') return analytics.consultationDetails || [];
        if (selectedMetric === 'PT Sessions') return analytics.ptDetails || [];
        if (selectedMetric === 'Athletes') return analytics.athleteDetails || [];
        return [];
    }, [selectedMetric, analytics]);


    // 🛡️ MASTER NAME DERIVATION: Highly stabilized to avoid 'disappearing' name flash
    // We prioritize the context name which is already synced in the Layout.
    const displayFullName = (fullName || userProfile?.full_name || userEmail?.split('@')[0] || 'Admin').trim();
    const firstName = displayFullName.split(/\s+/)[0] || 'Admin';

    // RESTORE ROLE-BASED REDIRECTION (+ Student Fail-safe)
    const normalizedRole = role?.toLowerCase().trim();

    // IF ADMIN, SHOW IMMEDIATELY (Bypass student verification loader for better UX)
    if (normalizedRole === 'admin') {
        // Render below
    } else if (!role || isVerifiedStudent === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Syncing Intelligence...</p>
            </div>
        );
    }
    
    // PRIORITY 1: Explicit Staff Roles (Head Coach, Coach, Reception, Cleaner)
    if (normalizedRole === 'head_coach') return <HeadCoachDashboard />;
    if (normalizedRole === 'coach') return <CoachDashboard />;
    if (normalizedRole === 'reception' || normalizedRole === 'receptionist') return <ReceptionDashboard role={role} />;
    if (normalizedRole === 'cleaner') return <CleanerDashboard />;

    // PRIORITY 2: Admin check - If it's admin, stay here and DON'T go to Student Dashboard
    if (normalizedRole === 'admin') {
        // Continue to render the Admin Dashboard below
    } else {
        // PRIORITY 3: If verified as student in DB OR role is student, go to Student Dashboard
        if (isVerifiedStudent || normalizedRole === 'student' || normalizedRole === 'trainee') {
            return (
                <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>}>
                    <StudentDashboard />
                </Suspense>
            );
        }
    }

    const metrics = [
        {
            id: 'Total Revenue',
            label: 'Cycle Revenue',
            value: formatPrice(analytics?.totalRevenue || 0),
            subValue: 'Total Monthly Inbound',
            icon: DollarSign,
            color: 'text-white',
            glow: 'shadow-[0_0_50px_rgba(255,255,255,0.05)]',
            trend: 'Revenue Stream'
        },
        {
            id: 'Consultations',
            label: 'Consultations',
            value: analytics?.consultationCount || 0,
            subValue: 'Strategy Sessions',
            icon: Sparkles,
            color: 'text-emerald-400',
            glow: 'shadow-[0_0_50px_rgba(16,185,129,0.1)]',
            trend: 'Active Bookings'
        },
        {
            id: 'PT Sessions',
            label: 'PT Sessions',
            value: analytics?.ptCount || 0,
            subValue: 'Personal Training',
            icon: Medal,
            color: 'text-amber-400',
            glow: 'shadow-[0_0_50px_rgba(245,158,11,0.1)]',
            trend: 'Confirmed Missions'
        },
        {
            id: 'Athletes',
            label: 'Elite Athletes',
            value: analytics?.athleteCount || 0,
            subValue: 'Active Roster',
            icon: Users,
            color: 'text-blue-400',
            glow: 'shadow-[0_0_50px_rgba(59,130,246,0.1)]',
            trend: 'Total Strength'
        }
    ];

    return (
        <div className="min-h-screen pb-20 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 space-y-12">
                {/* Header Canvas - Anchored & Balanced Transformation */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-10 py-6 mb-8 border-b border-white/[0.03]">
                    <div className="flex flex-col gap-4">
                        {/* Greeting Cluster - Vertical Elite Hierarchy */}
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] md:text-[11px] font-black text-white/20 uppercase tracking-[0.8em] leading-none mb-1 select-none">
                                {t('dashboard.hello', 'Hello')}
                            </span>
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none italic">
                                <span className="premium-gradient-text drop-shadow-[0_15px_40px_rgba(255,255,255,0.3)]">
                                    {firstName}
                                </span>
                            </h1>
                        </div>

                    </div>

                    {/* Right-Side Chronology */}
                    <div className="flex items-center lg:justify-end">
                        <PremiumClock />
                    </div>
                </div>

                {/* Floating 4-Card Metrics Grid (No Cards/Backgrounds) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                    {metrics.map((stat, i) => (
                        <div
                            key={stat.id}
                            onClick={() => stat.id !== 'Athletes' ? setSelectedMetric(stat.id as any) : navigate(stat.path || '/')}
                            onMouseEnter={playHoverSound}
                            className="relative py-2 sm:py-4 px-1 sm:px-2 transition-all duration-500 cursor-pointer group flex flex-col items-center text-center sm:border-r sm:border-white/[0.03] last:border-r-0"
                        >
                            {/* Icon & Trend Row */}
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color} group-hover:scale-125 transition-transform duration-500`} />
                                <div className="text-[7px] sm:text-[8px] font-black text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    {stat.trend}
                                </div>
                            </div>
                            
                            <div className="space-y-0.5 sm:space-y-1">
                                <p className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] sm:tracking-[0.3em] group-hover:text-primary transition-colors">{stat.label}</p>
                                <h3 className="text-xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter tabular-nums group-hover:scale-105 transition-transform">
                                    {analyticsLoading ? '...' : stat.value}
                                </h3>
                                <p className="text-[7px] sm:text-[9px] font-bold text-white/5 uppercase tracking-widest">{stat.subValue}</p>
                            </div>

                            {/* Minimal Decorative Underline on Hover */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-700 opacity-20" />
                        </div>
                    ))}
                </div>

                {/* Main Content Grid: Balanced Live Floor & Agenda */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-10">
                    {/* Live Floor Area */}
                    <div className="min-h-[200px] flex flex-col">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.03]">
                            <div className="flex items-center gap-4">
                                <Globe className="w-5 h-5 text-primary animate-pulse" />
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-[0.2em] leading-none mb-1.5">Live Floor</h3>
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em]">Athlete Intelligence</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{onlineStudents.length} Online</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <LiveStudentsWidget onlineStudents={onlineStudents} />
                        </div>
                    </div>

                    {/* Elite Agenda */}
                    <div className="flex flex-col">
                        <UpcomingAgendaWidget />
                    </div>
                </div>


            </div>

            {/* Intelligence Overlay - Ultra Glassmorphism */}
            {selectedMetric && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-8">
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-2xl cursor-pointer"
                        onClick={() => setSelectedMetric(null)}
                    />
                    
                    <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0c0e14]/90 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col shadow-[0_50px_150px_rgba(0,0,0,0.8)]">
                        {/* High-End Header */}
                        <div className="p-8 sm:p-10 border-b border-white/[0.03] flex items-center justify-between relative z-10">
                            <div className="space-y-1">
                                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                    {selectedMetric} <span className="text-primary italic">Intelligence</span>
                                </h3>
                                <p className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Tactical Data Stream Audit</p>
                            </div>
                            <button 
                                onClick={() => setSelectedMetric(null)}
                                className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 rounded-2xl border border-white/5 hover:border-red-500/20 transition-all active:scale-90 flex items-center justify-center"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tactical Detail Feed */}
                        <div className="flex-1 overflow-y-auto p-8 sm:p-10 custom-scrollbar relative z-10">
                            {filteredDetails.length === 0 ? (
                                <div className="py-24 text-center">
                                    <p className="opacity-20 italic font-black uppercase tracking-[0.5em] text-[10px]">No active data streams detected</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredDetails.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between py-6 border-b border-white/[0.03] hover:translate-x-1 transition-all group">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-3">
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{item.date}</p>
                                                    {item.extra && (
                                                        <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest px-2 py-0.5 rounded bg-white/5">{item.extra}</span>
                                                    )}
                                                </div>
                                                <p className="text-base sm:text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                                                    {item.student_name || item.name}
                                                </p>
                                                <p className="text-[8px] sm:text-[10px] font-bold text-white/20 uppercase tracking-widest">{item.notes || `STATUS: ${item.status || 'ACTIVE'}`}</p>
                                            </div>
                                            <div className="text-right">
                                                {item.amount !== undefined ? (
                                                    <p className="text-xl sm:text-3xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]">
                                                        {currency.code} {item.amount}
                                                    </p>
                                                ) : (
                                                    <div className={`px-4 py-2 rounded-xl border font-black text-[9px] uppercase tracking-widest ${
                                                        item.status === 'PAID' || item.status === 'CONFIRMED' || item.status === 'COMPLETED' 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                            : 'bg-white/5 text-white/40 border-white/5'
                                                    }`}>
                                                        {item.status}
                                                    </div>
                                                )}
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
