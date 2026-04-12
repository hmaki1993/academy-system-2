import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle, Clock, Shield, MapPin, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import PremiumCalendarModal from '../components/PremiumCalendarModal';
import PageHeader from '../components/PageHeader';
import { playHoverSound } from '../utils/audio';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import SmartTrackerWidget from '../components/SmartTrackerWidget';
import PremiumClock from '../components/PremiumClock';

export default function StudentDashboard() {
    const { t, i18n } = useTranslation();
    const { settings, userProfile } = useTheme();
    const { fullName } = useOutletContext<{ fullName: string, role: string }>();
    
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);
    const [ptSubscription, setPtSubscription] = useState<any>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [sessionsRemaining, setSessionsRemaining] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [ptSessionsCount, setPtSessionsCount] = useState(0);
    const [consultationsCount, setConsultationsCount] = useState(0);
    const [showCalendar, setShowCalendar] = useState(false);

    useEffect(() => {
        const fetchStudentData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Fetch Student Basic Data (Using simple query to avoid 400 errors)
                const { data: student, error: studentError } = await supabase
                    .from('students')
                    .select('*')
                    .eq('profile_id', user.id)
                    .maybeSingle();

                if (studentError) console.error('Error fetching student:', studentError);

                let activePtSub = null;
                let foundStudent = student;

                if (student) {
                    setStudentData(student);

                    // 2. Fetch PT Subscription
                    const { data: ptSubs } = await supabase
                        .from('pt_subscriptions')
                        .select('*, coaches(full_name)')
                        .eq('student_id', student.id)
                        .order('created_at', { ascending: false });

                    activePtSub = ptSubs && ptSubs.length > 0 ? ptSubs[0] : null;
                } else {
                    // Fallback for Guest PTs
                    const { data: directPtSubs } = await supabase
                        .from('pt_subscriptions')
                        .select('*, coaches(full_name)')
                        .or(`user_id.eq.${user.id},student_name.ilike.%${fullName}%`) // Use OR for better fallback
                        .order('created_at', { ascending: false });

                    if (directPtSubs && directPtSubs.length > 0) {
                        activePtSub = directPtSubs[0];
                        setStudentData({
                            full_name: activePtSub.student_name || fullName || 'Player Profile',
                            sessions_remaining: activePtSub.sessions_remaining,
                        });
                        foundStudent = true;
                    }
                }

                const currentProfileName = userProfile?.full_name || user.user_metadata?.full_name || student?.full_name || fullName || 'Player Profile';

                // 3. Fetch Master HUD Data (Payments, PT sessions, Consultations)
                const [{ data: paymentData }, { count: sessionsCount }, { count: cCount }] = await Promise.all([
                    supabase.from('payments').select('amount').eq('student_id', student?.id),
                    supabase.from('pt_sessions').select('*', { count: 'exact', head: true }).ilike('student_name', `%${currentProfileName}%`),
                    supabase.from('consultation_requests').select('*', { count: 'exact', head: true }).ilike('full_name', `%${currentProfileName}%`)
                ]);

                if (paymentData) {
                    const total = paymentData.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
                    setTotalPaid(total);
                }
                setPtSessionsCount(sessionsCount || 0);
                setConsultationsCount(cCount || 0);

                if (student) {
                    setSessionsRemaining(student.sessions_remaining || 0);
                } else if (activePtSub) {
                    setSessionsRemaining(activePtSub.sessions_remaining || 0);
                }

                if (!foundStudent && !activePtSub) {
                    setFetchError('No active record found.');
                }
            } catch (err) {
                console.error('Catch error in dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();

        fetchStudentData();
    }, [fullName, userProfile?.full_name]);

    const parseSchedule = (scheduleValue: any) => {
        if (!scheduleValue) return [];
        if (Array.isArray(scheduleValue)) return scheduleValue.map(s => ({ day: s.day, startTime: s.start, endTime: s.end }));
        if (typeof scheduleValue === 'string') {
            return scheduleValue.split('|').map(s => {
                const parts = s.split(':');
                if (parts.length >= 5) return { day: parts[0], startTime: `${parts[1]}:${parts[2]}`, endTime: `${parts[3]}:${parts[4]}` };
                return { day: parts[0], startTime: parts[1], endTime: parts[2] };
            });
        }
        return [];
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr || timeStr.toLowerCase().includes('undefined')) return '';
        const parts = timeStr.split(':');
        let hour = parseInt(parts[0]);
        let minute = parts[1] || '00';
        if (isNaN(hour)) return '';
        const ampm = hour >= 12 ? (i18n.language === 'ar' ? 'م' : 'PM') : (i18n.language === 'ar' ? 'ص' : 'AM');
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minute} ${ampm}`;
    };

    if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>;

    const isPtOnly = !!ptSubscription && !studentData?.group_id;
    const planName = isPtOnly ? 'PT Package' : (studentData?.subscription_plans?.name || 'Standard Plan');
    const schedules = parseSchedule(studentData?.training_schedule || '');
    const groupName = isPtOnly ? 'Personal Training' : 'Group Training';
    const coachName = ptSubscription?.coaches?.full_name || studentData?.coaches?.full_name || 'Coach';
    
    // 🛡️ MASTER NAME DERIVATION: Centralized source of truth
    const displayFullName = userProfile?.full_name || studentData?.full_name || fullName || 'Player Profile';

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20 relative">
            {/* Elite Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px] animate-pulse" />
            </div>

            {/* Header Canvas - Elite Transformation */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 py-6 mb-12">
                <div className="flex flex-col gap-6">
                    {/* Header Breadcrumb & Greeting */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(var(--color-primary),0.8)]" />
                            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">
                                {t('dashboard.studentSubtitle', 'Player Hub & Intelligence')}
                            </h2>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 ml-1">
                                <span className="text-[11px] font-black text-primary uppercase tracking-[0.5em] drop-shadow-[0_0_8px_rgba(var(--color-primary),0.3)]">{t('dashboard.hello', 'Hello')}</span>
                                <div className="h-[1px] w-8 bg-gradient-to-r from-primary/40 to-transparent" />
                            </div>
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-tight animate-in fade-in zoom-in-95 duration-1000">
                                <span className="premium-gradient-text drop-shadow-[0_10px_20px_rgba(var(--color-primary),0.15)] opacity-90">
                                    {displayFullName.split(' ')[0]}
                                </span>
                            </h1>
                        </div>
                    </div>

                    {/* Status Badges Row */}
                    <div className="flex flex-wrap items-center gap-3 opacity-0 animate-in fade-in slide-in-from-left-12 duration-1000 delay-500 fill-mode-forwards">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 backdrop-blur-md">
                            <Shield className="w-3.5 h-3.5 text-primary animate-pulse" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Verified Athlete</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Elite Status</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <PremiumClock />
                </div>
            </div>

   

            {/* Core Analytics HUD - Circular Seals Rebirth */}
            <div className="relative z-10 flex flex-wrap justify-center gap-6 md:gap-12 pb-12 overflow-visible">
                {[
                    { label: t('dashboard.feesPaid', 'Money Paid'), value: totalPaid, color: 'text-emerald-400', suffix: ' EGP' },
                    { label: t('dashboard.ptSessions', 'PT Sessions'), value: ptSessionsCount, color: 'text-primary' },
                    { label: t('dashboard.consultations', 'Consultations'), value: consultationsCount, color: 'text-amber-400' },
                    { label: t('dashboard.eliteRank', 'Elite Rank'), value: studentData?.current_training_level || 1, color: 'text-blue-400', prefix: 'lvl ' }
                ].map((stat, i) => (
                    <div key={i} className="flex flex-col items-center gap-6 group/seal animate-in fade-in zoom-in duration-1000" style={{ animationDelay: `${i * 150}ms` }}>
                        <div className="relative">
                            {/* Matrix Glow Ring */}
                            <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl group-hover/seal:bg-white/10 transition-all duration-700" />
                            <div className="absolute -inset-2 bg-gradient-to-br from-white/10 to-transparent rounded-full opacity-20 group-hover/seal:opacity-40 transition-opacity" />
                            
                            <div className={`w-28 h-28 md:w-36 md:h-36 rounded-full border border-white/10 flex flex-col items-center justify-center bg-[#0a0c10]/40 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-700 group-hover/seal:border-white/30 group-hover/seal:scale-110 group-hover/seal:-translate-y-2`}>
                                {/* Internal HUD Lines */}
                                <div className="absolute inset-0 border-[0.5px] border-white/5 rounded-full scale-90" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-0 group-hover/seal:opacity-100 transition-opacity" />
                                
                                <div className="relative z-10 flex flex-col items-center">
                                    <span className={`text-2xl md:text-4xl font-black ${stat.color} tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>
                                        {stat.prefix}{stat.value}{stat.suffix}
                                    </span>
                                </div>

                                {/* Bottom Glow Line */}
                                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 ${stat.color.replace('text-', 'bg-')} blur-md opacity-20`} />
                            </div>
                        </div>
                        <div className="space-y-2 text-center">
                            <span className="block text-[9px] md:text-[11px] font-black uppercase tracking-[0.4em] text-white/40 group-hover/seal:text-primary transition-colors duration-500">
                                {stat.label}
                            </span>
                            <div className="flex justify-center gap-1">
                                <div className="h-[2px] w-1 bg-white/10 rounded-full" />
                                <div className="h-[2px] w-8 bg-white/5 rounded-full group-hover/seal:w-12 group-hover/seal:bg-primary/40 transition-all duration-700" />
                                <div className="h-[2px] w-1 bg-white/10 rounded-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

   

            {showCalendar && ptSubscription && (
                <PremiumCalendarModal
                    subscriptionId={ptSubscription.id}
                    studentName={displayFullName}
                    onClose={() => setShowCalendar(false)}
                />
            )}
        </div>
    );
}
