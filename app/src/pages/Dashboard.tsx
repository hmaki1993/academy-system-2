import { useState, useMemo } from 'react';
import { Users, DollarSign, Medal, TrendingUp, Sparkles, Activity, Clock, ArrowUpRight, ChevronRight, Zap, X, Globe } from 'lucide-react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminAnalytics, RevenueDetail } from '../hooks/useAdminAnalytics';
import { usePresence } from '../hooks/usePresence';
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
    const { role, fullName, userEmail } = useOutletContext<{ role: string, fullName: string, userEmail: string | null }>() || { role: null, fullName: null, userEmail: null };
    const cleanName = fullName?.trim() || userEmail?.split('@')[0]?.trim() || 'Admin';
    const { formatPrice, currency } = useCurrency();
    const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();
    const { onlineStudents, onlineCount } = usePresence();
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState<'PT' | 'Consultation' | 'Total' | null>(null);

    const filteredDetails = useMemo(() => {
        if (!selectedMetric || !analytics?.details) return [];
        if (selectedMetric === 'Total') return analytics.details;
        return analytics.details.filter(d => d.type === selectedMetric);
    }, [selectedMetric, analytics]);

    // RESTORE ROLE-BASED REDIRECTION
    if (!role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Syncing Intelligence...</p>
            </div>
        );
    }

    const normalizedRole = role.toLowerCase().trim();
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
                {/* Header Canvas - More Compact */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-2">
                    <div className="space-y-0 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative h-4 w-1 overflow-hidden rounded-full bg-white/5">
                                <div className="absolute inset-0 bg-primary animate-pulse" />
                            </div>
                            <h2 className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em] transition-colors group-hover:text-primary/40 duration-700">
                                {t('dashboard.welcomeBack', 'System Intelligence Active')}
                            </h2>
                        </div>
                        
                        <div className="relative">
                            <span className="block text-[8px] font-black text-white/30 uppercase tracking-[0.5em] mb-1 ml-0.5 animate-in fade-in slide-in-from-left-4 duration-1000">
                                {t('dashboard.hello', 'Hello')}
                            </span>
                            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-tight animate-in fade-in zoom-in-95 duration-1000">
                                    <span className="premium-gradient-text drop-shadow-[0_10px_30px_rgba(var(--color-primary),0.2)]">
                                        {cleanName.split(' ')[0]}
                                    </span>
                                </h1>
                                <div className="flex flex-col gap-1.5 mb-2 opacity-0 animate-in fade-in slide-in-from-left-8 duration-1000 delay-500 fill-mode-forwards">
                                    <div className="h-[1px] w-16 bg-gradient-to-r from-primary to-transparent rounded-full shadow-[0_0_10px_rgba(var(--color-primary),0.4)]" />
                                    <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.8em] ml-0.5">Elite Perspective</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        {/* Clock and Button removed per request for extreme minimalism */}
                    </div>
                </div>

                {/* Metrics Matrix - Unified Revenue Hub & Roster */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Unified Revenue Intelligence Hub - Minimalist Floating Mode */}
                    <div
                        onClick={() => setSelectedMetric('Total')}
                        onMouseEnter={playHoverSound}
                        className="relative group py-3 px-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-all duration-500 cursor-pointer active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="text-primary group-hover:scale-110 transition-transform">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] leading-none">Revenue Hub</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">Global Growth Statistics</p>
                            </div>
                        </div>

                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter tabular-nums leading-none">
                            {analyticsLoading ? '...' : formatPrice(analytics?.totalRevenue || 0)}
                        </h3>

                        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.03]">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">PT</span>
                                <span className="text-sm md:text-lg font-black text-white/60">{analyticsLoading ? '...' : formatPrice(analytics?.ptRevenue || 0)}</span>
                            </div>
                            <div className="flex items-baseline gap-2 border-l border-white/[0.03] pl-6">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">CONSULT</span>
                                <span className="text-sm md:text-lg font-black text-white/60">{analyticsLoading ? '...' : formatPrice(analytics?.consultationRevenue || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Athlete Network Hub - Minimalist Floating Mode */}
                    <div
                        onClick={() => navigate('/strategy-hub')}
                        onMouseEnter={playHoverSound}
                        className="relative group py-3 px-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.03] transition-all duration-500 cursor-pointer active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="text-white/30 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] leading-none">Athlete Network</p>
                                <p className="text-[8px] font-bold text-white/10 uppercase tracking-[0.2em]">Active Roster Pulse</p>
                            </div>
                        </div>

                        <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
                            {analyticsLoading ? '...' : analytics?.athleteCount}
                        </h3>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.03]">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Live Sync Active</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            </div>
                            <div className="flex items-center gap-1.5 opacity-40">
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Roster</span>
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dynamic Command Center: Live Floor & Upcoming Agenda (Weightless) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-stretch py-12 border-b border-white/[0.03]">
                    {/* Live Floor Area */}
                    <div className="lg:col-span-2 relative group">
                        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/[0.03]">
                            <div className="text-primary group-hover:scale-110 transition-transform">
                                <Globe className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">Live Floor</h3>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Active Presence Tracking</p>
                            </div>
                            {onlineStudents.length > 0 && (
                                <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full ml-auto">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{onlineStudents.length} Online</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <LiveStudentsWidget onlineStudents={onlineStudents} />
                        </div>
                    </div>

                    {/* Upcoming Agenda Area */}
                    <div className="relative group lg:border-l lg:border-white/[0.03] lg:pl-12">
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
