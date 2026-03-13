import { useState } from 'react';
import { Users, DollarSign, Medal, Calendar, TrendingUp, TrendingDown, Clock, Scale, ArrowUpRight, UserPlus, Sparkles, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useOutletContext, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from '../hooks/useData';

import CoachDashboard from './CoachDashboard';
import HeadCoachDashboard from './HeadCoachDashboard';
import ReceptionDashboard from './ReceptionDashboard';
import CleanerDashboard from './CleanerDashboard';
import StudentDashboard from './StudentDashboard';
import LiveStudentsWidget from '../components/LiveStudentsWidget';
import GroupsList from '../components/GroupsList';
import BatchAssessmentModal from '../components/BatchAssessmentModal';
import AssessmentHistoryModal from '../components/AssessmentHistoryModal';
import { useCurrency } from '../context/CurrencyContext';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';
import FinancialProgressChart from '../components/FinancialProgressChart';
import PerformanceAnalyticsCard from '../components/PerformanceAnalyticsCard';
import { useFinancialTrends } from '../hooks/useData';
import { Activity } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { playHoverSound } from '../utils/audio';

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { settings } = useTheme(); // Init hook
    const { role, fullName, userId } = useOutletContext<{ role: string, fullName: string, userId: string | null }>() || { role: null, fullName: null, userId: null };
    const { formatPrice } = useCurrency();
    const [showBatchTest, setShowBatchTest] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const { data: stats, isLoading: loading } = useDashboardStats();
    const { data: financialTrends } = useFinancialTrends();
    const { currency } = useCurrency();

    // Show loading while role is being determined
    if (!role) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Show Head Coach Dashboard
    if (role === 'head_coach') {
        return <HeadCoachDashboard />;
    }

    // Show Coach Dashboard for coaches only
    if (role === 'coach') {
        return <CoachDashboard />;
    }

    // Show Reception Dashboard
    if (role === 'reception' || role === 'receptionist') {
        return <ReceptionDashboard role={role} />;
    }

    // Show Cleaner Dashboard
    if (role === 'cleaner') {
        return <CleanerDashboard />;
    }

    // Show Student Dashboard
    if (role === 'student') {
        return <StudentDashboard />;
    }

    // If Admin or any other role, continue to show the main admin dashboard stats below

    // Default stats to avoid undefined errors during loading
    const displayStats = stats || {
        totalStudents: 0,
        activeCoaches: 0,
        totalGroups: 0,
        monthlyRevenue: 0,
        recentActivity: []
    };

    const statCards = [
        {
            label: t('dashboard.totalStudents'),
            value: displayStats.totalStudents,
            icon: Users,
            iconClass: 'text-primary',
            bgClass: 'bg-primary/10 border-primary/20 group-hover:bg-primary/20',
            trend: '+12% from last month',
            path: '/app/students'
        },
        {
            label: t('dashboard.monthlyRevenue'),
            value: formatPrice(displayStats.monthlyRevenue),
            icon: DollarSign,
            iconClass: 'text-accent',
            bgClass: 'bg-accent/10 border-accent/20 group-hover:bg-accent/20',
            trend: '+5% from last month',
            path: '/app/finance'
        },
        {
            label: t('dashboard.trainingGroups'),
            value: displayStats.totalGroups,
            icon: Scale,
            iconClass: 'text-primary',
            bgClass: 'bg-primary/10 border-primary/20 group-hover:bg-primary/20',
            trend: 'Optimized',
            path: '/app/schedule'
        },
        {
            label: t('dashboard.activeCoaches'),
            value: displayStats.activeCoaches,
            icon: Medal,
            iconClass: 'text-accent',
            bgClass: 'bg-accent/10 border-accent/20 group-hover:bg-accent/20',
            trend: 'Active Now',
            isLive: true,
            path: '/app/coaches'
        }
    ];

    console.log('Dashboard Render. Role:', role, 'FullName:', fullName, 'Stats:', stats, 'Loading:', loading);
    console.log('Is Reception?', role === 'reception');

    const timeAgo = (dateStr: string) => {
        const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000 / 60;
        if (diff < 60) return `${Math.floor(diff)}${t('common.minutesAgoShort')}`;
        if (diff < 1440) return `${Math.floor(diff / 60)}${t('common.hoursAgoShort')}`;
        return `${Math.floor(diff / 1440)}${t('common.daysAgoShort')}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 mb-8">
                <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{t('dashboard.welcomeBack', 'System Active')}</h2>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-tight">
                        {t('dashboard.greeting', 'Hello')}, <span className="premium-gradient-text">{fullName?.split(' ')[0] || 'Admin'}</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowBatchTest(true)}
                            onMouseEnter={playHoverSound}
                            className="group relative px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300"
                        >
                            <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest relative z-10">
                                <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
                                {t('dashboard.batchAssessment')}
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Standardized Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        onClick={() => stat.path && navigate(stat.path)}
                        onMouseEnter={playHoverSound}
                        className="glass-card p-5 md:p-6 group relative overflow-hidden bg-[#0a0c10]/40 backdrop-blur-xl border-white/5 hover:border-white/20 transition-all duration-300"
                    >
                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="flex flex-col gap-0.5">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{stat.label}</p>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                        {loading ? '...' : stat.value}
                                    </h3>
                                    {stat.isLive && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${stat.bgClass}`}>
                                <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between relative z-10 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                                <ArrowUpRight className="w-3 h-3 text-primary" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{stat.trend}</span>
                            </div>
                            <div className="p-1 rounded-md bg-white/5 text-white/20">
                                <Activity className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div
                    onClick={() => navigate('/app/finance')}
                    className="glass-card p-6 cursor-pointer hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold">{t('dashboard.businessHealth', 'Financial Trends')}</h2>
                    </div>
                    <FinancialProgressChart
                        data={financialTrends || []}
                        currencyCode={currency.code}
                    />
                </div>

                <div
                    onClick={() => navigate('/app/students')}
                    className="cursor-pointer"
                >
                    <PerformanceAnalyticsCard
                        title="Student Performance"
                        totalLabel="Total Students"
                        totalValue={displayStats.totalStudents}
                        segments={[
                            { label: 'Excellent', value: 40, color: '#10b981' },
                            { label: 'Good', value: 35, color: '#3b82f6' },
                            { label: 'Average', value: 15, color: '#f59e0b' },
                            { label: 'Needs Improvement', value: 10, color: '#ef4444' }
                        ]}
                        activeSegmentLabel="Peak Performance"
                        activeSegmentValue="4.25%"
                    />
                </div>
            </div>


            {/* Live Floor & Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Floor Widget */}
                <div className="lg:col-span-2 h-full min-h-[500px]">
                    <LiveStudentsWidget />
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-1 glass-card rounded-[2.5rem] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-surface-border flex items-center justify-between">
                        <h3 className="text-lg font-black text-base uppercase tracking-tight flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                            {t('dashboard.newJoiners')}
                        </h3>
                        <button
                            onClick={() => navigate('/app/students')}
                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-base transition-colors"
                        >
                            {t('dashboard.viewAll')}
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {loading ? (
                            <p className="text-muted text-sm font-black uppercase tracking-widest text-center py-6">{t('common.loading')}</p>
                        ) : displayStats.recentActivity.length === 0 ? (
                            <p className="text-muted text-sm font-black uppercase tracking-widest text-center py-6">{t('dashboard.noRecentActivity')}</p>
                        ) : (
                            displayStats.recentActivity.map((student: any) => (
                                <div key={student.id} className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10 transition-all duration-500 group cursor-pointer relative overflow-hidden">
                                     {/* Background Decorative Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative z-10">
                                        {student.full_name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1 relative z-10">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight truncate pr-2">{student.full_name}</p>
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full shrink-0">{timeAgo(student.created_at)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 w-full">
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest truncate">{t('dashboard.joined_label', 'New Member')}</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t('students.active')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white/10 group-hover:text-primary transition-all group-hover:bg-primary/10">
                                        <ArrowUpRight className="w-4 h-4" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <BatchAssessmentModal
                isOpen={showBatchTest}
                onClose={() => setShowBatchTest(false)}
                onSuccess={() => {
                    // Refetch data/stats if needed
                }}
                currentCoachId={null} // Pass null for admin to allow selecting any group
            />

            <AssessmentHistoryModal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                currentCoachId={null}
            />
        </div>
    );
}
