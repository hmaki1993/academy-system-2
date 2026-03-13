import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Wallet, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useCurrency } from '../context/CurrencyContext';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';

const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function CleanerDashboard() {
    const { t } = useTranslation();
    const { settings } = useTheme();
    const { currency } = useCurrency();
    const { fullName, userId } = useOutletContext<{ fullName: string, userId: string | null }>() || { fullName: null, userId: null };

    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [dailyTotalSeconds, setDailyTotalSeconds] = useState(0);
    const [coachId, setCoachId] = useState<string | null>(null);
    const [baseSalary, setBaseSalary] = useState<number>(0);
    const [syncLoading, setSyncLoading] = useState(true);

    useEffect(() => {
        let interval: any;
        if (isCheckedIn) {
            interval = setInterval(() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const startTime = localStorage.getItem(`checkInStart_${today}`);
                if (startTime) {
                    const params = JSON.parse(startTime);
                    const now = new Date().getTime();
                    setElapsedTime(Math.floor((now - params.timestamp) / 1000));
                }
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isCheckedIn]);

    useEffect(() => {
        const initializeDashboard = async () => {
            setSyncLoading(true);
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: coachData } = await supabase
                        .from('coaches')
                        .select('id, salary')
                        .eq('profile_id', user.id)
                        .single();

                    if (coachData) {
                        setCoachId(coachData.id);
                        setBaseSalary(Number(coachData.salary) || 0);

                        let { data: attendance } = await supabase
                            .from('coach_attendance')
                            .select('*')
                            .eq('coach_id', coachData.id)
                            .is('check_out_time', null)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (!attendance) {
                            const { data: latest } = await supabase
                                .from('coach_attendance')
                                .select('*')
                                .eq('coach_id', coachData.id)
                                .eq('date', todayStr)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            attendance = latest;
                        }

                        if (attendance) {
                            const start = new Date(attendance.check_in_time);
                            if (!attendance.check_out_time) {
                                setIsCheckedIn(true);
                                setElapsedTime(Math.floor((new Date().getTime() - start.getTime()) / 1000));
                                localStorage.setItem(`checkInStart_${format(new Date(), 'yyyy-MM-dd')}`, JSON.stringify({
                                    timestamp: start.getTime(),
                                    recordId: attendance.id
                                }));
                            } else if (attendance.date === todayStr) {
                                const end = new Date(attendance.check_out_time);
                                setDailyTotalSeconds(Math.floor((end.getTime() - start.getTime()) / 1000));
                            }
                        }
                    }
                }
            } catch (err: any) {
                console.error('Initialization failed:', err);
            }
            setSyncLoading(false);
        };

        initializeDashboard();
    }, []);

    const handleCheckIn = async () => {
        if (!coachId) return toast.error(t('common.error'));
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        try {
            const { data, error } = await supabase
                .from('coach_attendance')
                .upsert({
                    coach_id: coachId,
                    date: todayStr,
                    check_in_time: now.toISOString(),
                    check_out_time: null,
                    status: 'present'
                }, { onConflict: 'coach_id,date' })
                .select().single();

            if (error) throw error;
            setIsCheckedIn(true);
            localStorage.setItem(`checkInStart_${todayStr}`, JSON.stringify({ timestamp: now.getTime(), recordId: data.id }));

            await supabase.from('notifications').insert({
                title: t('notifications.coachCheckedIn', { name: fullName }),
                message: t('notifications.checkedInAt', { time: format(now, 'HH:mm:ss') }),
                type: 'check_in',
                related_coach_id: userId,
                target_role: 'admin_head_reception'
            });

            toast.success(t('coach.checkInSuccess'));
        } catch (error: any) {
            toast.error(error.message || t('common.error'));
        }
    };

    const handleCheckOut = async () => {
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const savedStart = localStorage.getItem(`checkInStart_${today}`);
        try {
            if (savedStart) {
                const { recordId, timestamp } = JSON.parse(savedStart);
                await supabase.from('coach_attendance').update({ check_out_time: now.toISOString() }).eq('id', recordId);
                setDailyTotalSeconds(Math.floor((now.getTime() - timestamp) / 1000));

                await supabase.from('notifications').insert({
                    title: t('notifications.coachCheckedOut', { name: fullName }),
                    message: t('notifications.checkedOutAt', { time: format(now, 'HH:mm:ss') }),
                    type: 'check_out',
                    related_coach_id: userId,
                    target_role: 'admin_head_reception'
                });
            }
            setIsCheckedIn(false);
            setElapsedTime(0);
            localStorage.removeItem(`checkInStart_${today}`);
            toast.success(t('coach.checkOutSuccess'));
        } catch (error) {
            toast.error(t('common.error'));
        }
    };

    if (syncLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Premium Welcome Header */}
            <div className="relative group p-5 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] bg-white/[0.02] border border-white/5 backdrop-blur-md overflow-hidden mb-8 transition-all hover:border-white/10 shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 animate-in fade-in duration-700">
                    <div className="text-center sm:text-left w-full">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-2">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4">
                            <span className="text-white/40 font-medium lowercase italic">{t('dashboard.welcome')},</span>
                            <span className="premium-gradient-text">{fullName || 'CLEANER'}! 👋</span>
                        </h1>
                    </div>

                    {settings.clock_position === 'dashboard' && (
                        <PremiumClock className="!bg-white/[0.03] !border-white/10 !rounded-full !shadow-lg backdrop-blur-xl" />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Attendance Card */}
                <div className="glass-card p-5 sm:p-6 rounded-[2rem] border border-white/10 shadow-premium relative overflow-hidden group">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl transition-all duration-700"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Shift Clock</h2>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isCheckedIn ? 'bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></span>
                                <span className={isCheckedIn ? 'text-emerald-400' : 'text-rose-500'}>
                                    {isCheckedIn ? 'Clocked In' : 'Clocked Out'}
                                </span>
                            </p>
                        </div>
                        <div className="p-3 bg-primary/20 rounded-xl text-primary border border-white/5">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6 relative z-10">
                        <div className="text-4xl sm:text-5xl font-black text-white tracking-widest font-mono">
                            {isCheckedIn ? formatTimer(elapsedTime) : dailyTotalSeconds > 0 ? formatTimer(dailyTotalSeconds) : '00:00:00'}
                        </div>

                        <button
                            onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] shadow-2xl ${isCheckedIn
                                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20'
                                : 'bg-white text-black border border-transparent hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'}`}
                        >
                            {isCheckedIn ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                            {isCheckedIn ? 'End Shift' : 'Start Shift'}
                        </button>
                    </div>
                </div>

                {/* Salary Card */}
                <div className="glass-card p-5 sm:p-6 rounded-[2rem] border border-white/10 shadow-premium relative overflow-hidden group">
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl transition-all duration-700"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Monthly Salary</h2>
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">Current Period</p>
                        </div>
                        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500 border border-white/5">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="flex flex-col justify-center items-center h-full relative z-10 pb-2 pt-2">
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-5xl sm:text-6xl font-black text-amber-500 tracking-tighter">{baseSalary.toLocaleString()}</h3>
                            <span className="text-sm font-black text-white/20 uppercase tracking-widest">{currency.code}</span>
                        </div>
                        <div className="mt-4 px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">
                            Base Monthly Pay
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
