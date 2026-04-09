import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle, Clock, Shield, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import PremiumCalendarModal from '../components/PremiumCalendarModal';
import PageHeader from '../components/PageHeader';
import { playHoverSound } from '../utils/audio';
import { format } from 'date-fns';

export default function StudentDashboard() {
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();
    const { fullName } = useOutletContext<{ fullName: string, role: string }>();
    
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);
    const [ptSubscription, setPtSubscription] = useState<any>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [attendedSessions, setAttendedSessions] = useState(0);
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

                if (activePtSub) {
                    setPtSubscription(activePtSub);
                    const { count: ptCount } = await supabase
                        .from('pt_sessions')
                        .select('*', { count: 'exact', head: true })
                        .eq('subscription_id', activePtSub.id);
                    setAttendedSessions(ptCount || 0);
                } else if (student) {
                    const { count } = await supabase
                        .from('student_attendance')
                        .select('*', { count: 'exact', head: true })
                        .eq('student_id', student.id)
                        .in('status', ['present', 'completed']);
                    setAttendedSessions(count || 0);
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
    }, [fullName]);

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
    const sessionsRemaining = isPtOnly ? (ptSubscription?.sessions_remaining || 0) : (studentData?.sessions_remaining || 0);
    const planName = isPtOnly ? 'PT Package' : (studentData?.subscription_plans?.name || 'Standard Plan');
    const schedules = parseSchedule(studentData?.training_schedule || '');
    const groupName = isPtOnly ? 'Personal Training' : 'Group Training';
    const coachName = ptSubscription?.coaches?.full_name || studentData?.coaches?.full_name || 'Coach';
    const displayFullName = studentData?.full_name || fullName || 'Player Profile';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <PageHeader
                title={`${t('dashboard.welcome')}, ${displayFullName.split(' ')[0]}`}
                subtitle={t('dashboard.studentSubtitle', 'Player Hub & Session Analytics')}
            >
                <div className="flex items-center gap-3 px-6 py-3 bg-black/20 border border-white/5 rounded-full shadow-inner backdrop-blur-xl shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{format(new Date(), 'dd MMMM yyyy')}</span>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onMouseEnter={playHoverSound} className="glass-card bg-primary/[0.03] p-6 rounded-[2rem] border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Attended</p>
                        <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-white tracking-tighter">{attendedSessions}</h3>
                        <span className="text-[10px] font-bold text-white/20 uppercase">Total Sessions</span>
                    </div>
                </div>

                <div onMouseEnter={playHoverSound} className="glass-card bg-accent/[0.03] p-6 rounded-[2rem] border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Remaining</p>
                        <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-white tracking-tighter">{sessionsRemaining}</h3>
                        <span className="text-[10px] font-bold text-white/20 uppercase">{planName}</span>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/5 shadow-premium relative overflow-hidden group bg-white/[0.01]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-white/5"><Sparkles className="w-8 h-8" /></div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">Training <span className="premium-gradient-text">Journey</span></h2>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md">Active</span>
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-3 h-3" /> {groupName} • {coachName}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowCalendar(true)} className="group/btn px-6 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center gap-3 hover:scale-105 transition-all">
                        <Calendar className="w-4 h-4" /> View Full Journey <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                    </button>
                </div>
            </div>

            <div className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/5">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">My Schedule</h3>
                {schedules.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {schedules.map((s: any, i: number) => (
                            <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/5">
                                <h4 className="font-black text-white uppercase text-sm mb-3">{s.day}</h4>
                                <div className="flex justify-between items-center text-xs font-black text-primary">
                                    <span className="text-white/20 uppercase tracking-widest text-[10px]">Time:</span>
                                    <span>{formatTime(s.startTime)} - {formatTime(s.endTime)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-white/20 font-black uppercase text-xs">No specific schedule assigned</p>
                    </div>
                )}
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
