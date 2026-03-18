import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, User, Plus, Users, Wallet, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import GroupsList from '../components/GroupsList';
import LiveStudentsWidget from '../components/LiveStudentsWidget';
import GroupFormModal from '../components/GroupFormModal'; // Need this to create groups
import AddStudentForm from '../components/AddStudentForm'; // Need this to add students
import { useCurrency } from '../context/CurrencyContext';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';
import ConfirmModal from '../components/ConfirmModal';
import { RotateCcw, Trash2, TrendingUp, ChevronRight, Globe, Activity, ArrowUpRight, BrainCircuit, X } from 'lucide-react';
import FinancialProgressChart from '../components/FinancialProgressChart';
import PerformanceAnalyticsCard from '../components/PerformanceAnalyticsCard';
import { useFinancialTrends } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import AICoachAssistantModal from '../components/AICoachAssistantModal';

export default function HeadCoachDashboard() {
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();
    const { currency } = useCurrency();
    const { role, fullName } = useOutletContext<{ role: string, fullName: string }>() || { role: null, fullName: null };
    const navigate = useNavigate();

    // Check-in State
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [currentTime] = useState(new Date());
    const [dailyTotalSeconds, setDailyTotalSeconds] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [coachId, setCoachId] = useState<string | null>(null);
    const [savedSessions, setSavedSessions] = useState<any[]>([]);
    const { data: financialTrends } = useFinancialTrends();
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

    // Modals
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [loadingAttendanceHistory, setLoadingAttendanceHistory] = useState(false);


    // setInterval removed as PremiumClock handles it.
    // currentTime is kept static for the date display.

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
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch Coach Data
                    const { data: coachData } = await supabase
                        .from('coaches')
                        .select('id, pt_rate, salary')
                        .eq('profile_id', user.id)
                        .single();

                    if (coachData) {
                        setCoachId(coachData.id);

                        // Sync Attendance: Priority to OPEN sessions
                        let { data: attendance } = await supabase
                            .from('coach_attendance')
                            .select('*')
                            .eq('coach_id', coachData.id)
                            .is('check_out_time', null)
                            .maybeSingle();

                        if (!attendance) {
                            // If no active session, get latest closed record
                            const { data: latest } = await supabase
                                .from('coach_attendance')
                                .select('*')
                                .eq('coach_id', coachData.id)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            attendance = latest;
                        }

                        if (attendance) {
                            const start = new Date(attendance.check_in_time);

                            // Scenario A: Still checked in (no check_out_time) - Restore active session
                            if (!attendance.check_out_time) {
                                setIsCheckedIn(true);
                                setCheckInTime(format(start, 'HH:mm:ss'));
                                setElapsedTime(Math.floor((new Date().getTime() - start.getTime()) / 1000));

                                // Ensure local storage is in sync for the timer
                                localStorage.setItem(`checkInStart_${format(new Date(), 'yyyy-MM-dd')}`, JSON.stringify({
                                    timestamp: start.getTime(),
                                    recordId: attendance.id
                                }));
                            }
                            // Scenario B: Checked out TODAY - Show daily summary
                            else if (attendance.date === todayStr) {
                                setIsCheckedIn(false);
                                const end = new Date(attendance.check_out_time);
                                setDailyTotalSeconds(Math.floor((end.getTime() - start.getTime()) / 1000));
                            }
                            // Scenario C: Checked out on a previous day - Reset (default state)
                            else {
                                setIsCheckedIn(false);
                                setDailyTotalSeconds(0);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Initialization failed:', err);
            }
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
                    check_out_time: null, // Clear check-out time if re-checking in same day
                    status: 'present'
                }, { onConflict: 'coach_id,date' })
                .select().single();

            if (error) throw error;
            setIsCheckedIn(true);
            setCheckInTime(format(now, 'HH:mm:ss'));
            localStorage.setItem(`checkInStart_${todayStr}`, JSON.stringify({ timestamp: now.getTime(), recordId: data.id }));

            // 🚀 Send Notification to Admin/Reception
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('notifications').insert({
                    title: t('notifications.coachCheckedIn', { name: fullName }),
                    message: t('notifications.checkedInAt', { time: format(now, 'HH:mm:ss') }),
                    type: 'check_in',
                    related_coach_id: user.id,
                    target_role: 'admin_head_reception'
                });
            }

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

                // 🚀 Send Notification to Admin/Reception
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('notifications').insert({
                        title: t('notifications.coachCheckedOut', { name: fullName }),
                        message: t('notifications.checkedOutAt', { time: format(now, 'HH:mm:ss') }),
                        type: 'check_out',
                        related_coach_id: user.id,
                        target_role: 'admin_head_reception'
                    });
                }
            }
            setIsCheckedIn(false);
            setCheckInTime(null);
            setElapsedTime(0);
            localStorage.removeItem(`checkInStart_${today}`);
            toast.success(t('coach.checkOutSuccess'));
        } catch (error) {
            toast.error(t('common.error'));
        }
    };

    // --- Personal Dashboard Logic ---

    const fetchPersonalTodaySessions = async (id: string) => {
        try {
            // STRICTLY filter for THIS coach (Head Coach's personal sessions)
            const { data } = await supabase
                .from('pt_sessions')
                .select('*')
                .eq('coach_id', id)
                .order('created_at', { ascending: false })
                .limit(100);
            setSavedSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };




    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader
                title={t('dashboard.headCoachTitle', 'Head Coach Hub')}
                subtitle={t('dashboard.headCoachSubtitle', 'Academy Management & Live Analytics')}
            />
            {/* Business Intelligence Section (Admin Only) */}
            {role === 'admin' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trend Chart Card */}
                    <div
                        onClick={() => navigate('/app/finance')}
                        className="glass-card p-5 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden bg-white/[0.01] cursor-pointer transition-colors group"
                    >
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 backdrop-blur-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <TrendingUp className="w-5 h-5" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">{t('dashboard.businessHealth', 'Mottaba3 El Tamaren')}</h2>
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">Monthly Analytics</p>
                                </div>
                            </div>
                            <div className="p-2 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight className="w-5 h-5 text-white/50" />
                            </div>
                        </div>
                        <FinancialProgressChart
                            data={financialTrends || []}
                            currencyCode={currency.code}
                        />
                    </div>

                    {/* Performance Analytics Card */}
                    <div
                        onClick={() => navigate('/app/students')}
                        className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 duration-300 h-full"
                    >
                        <PerformanceAnalyticsCard
                            title="Top Groups by Participation"
                            totalLabel="Total Active Students"
                            totalValue={342}
                            segments={[
                                { label: 'Morning Warriors', value: 45, color: '#4a7c59' },
                                { label: 'Elite Pro', value: 30, color: '#8a9a5b' },
                                { label: 'Kids Academy', value: 15, color: '#dcd7c9' },
                                { label: 'Evening PT', value: 10, color: '#f2f0e9' }
                            ]}
                            activeSegmentLabel="Peak Performance"
                            activeSegmentValue="4.25%"
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attendance Card */}
                <div className="glass-card bg-primary/[0.03] group col-span-1 flex flex-col justify-between p-4 rounded-[1.5rem] relative overflow-hidden h-full">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-1000 border border-white/5 bg-white/5 backdrop-blur-xl`}>
                                <Clock className={`w-4 h-4 ${isCheckedIn ? 'text-primary animate-pulse' : 'text-rose-500'}`} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">{t('common.attendance')}</h2>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                                    <span className={`w-1 h-1 rounded-full ${isCheckedIn ? 'bg-primary animate-ping' : 'bg-rose-500'}`}></span>
                                    <span className={isCheckedIn ? 'text-primary' : 'text-rose-500'}>
                                        {isCheckedIn ? t('coaches.workingNow') : t('coaches.away')}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                setShowAttendanceHistory(true);
                                if (!coachId) return;
                                setLoadingAttendanceHistory(true);
                                try {
                                    const { data } = await supabase
                                        .from('coach_attendance')
                                        .select('*')
                                        .eq('coach_id', coachId)
                                        .order('date', { ascending: false })
                                        .limit(30);
                                    setAttendanceHistory(data || []);
                                } catch (e) {
                                    console.error(e);
                                } finally {
                                    setLoadingAttendanceHistory(false);
                                }
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg text-white/20 border border-white/5 hover:bg-white/10 hover:text-white transition-all group/hist"
                            title="View Attendance History"
                        >
                            <RotateCcw className="w-3.5 h-3.5 group-hover/hist:rotate-[-30deg] transition-transform" />
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-4 relative z-10">
                        {isCheckedIn ? (
                            <div className="text-2xl font-black text-white tracking-widest font-mono whitespace-nowrap">
                                {formatTimer(elapsedTime)}
                            </div>
                        ) : dailyTotalSeconds > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-2xl font-black text-primary/80 tracking-widest font-mono whitespace-nowrap">
                                    {formatTimer(dailyTotalSeconds)}
                                </div>
                                <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                                    <span className="text-[7px] font-black text-primary/60 uppercase tracking-[0.3em]">Done</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-4xl font-black text-white/10 tracking-widest font-mono whitespace-nowrap">00:00:00</div>
                        )}
                    </div>
                    <div className="pt-4 relative z-10">
                        <button
                            onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                            className={`w-full py-2 rounded-xl font-black uppercase tracking-[0.3em] text-[9px] flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-xl ${isCheckedIn
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'}`}
                        >
                            {isCheckedIn ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {isCheckedIn ? t('coach.checkOut') : t('coach.checkIn')}
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-4 rounded-[1.5rem] border border-white/5 shadow-premium relative overflow-hidden group col-span-1 bg-white/[0.01] flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-5 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 backdrop-blur-xl flex items-center justify-center text-white/40">
                                <Users className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">Quick Actions</h2>
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">Elite Management</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 relative z-10 flex-1">
                        <button
                            onClick={() => setIsAIAssistantOpen(true)}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <BrainCircuit className="w-4 h-4" />
                            </div>
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest group-hover:text-white transition-colors">AI Coach</span>
                        </button>
                        <button
                            onClick={() => setShowStudentModal(true)}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Plus className="w-4 h-4" />
                            </div>
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest group-hover:text-white transition-colors">Add Player</span>
                        </button>
                        <button
                            onClick={() => navigate('/app/evaluations')}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                <ClipboardCheck className="w-4 h-4" />
                            </div>
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest group-hover:text-white transition-colors">Evaluations</span>
                        </button>
                        <button
                            onClick={() => setShowGroupModal(true)}
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                                <Plus className="w-4 h-4" />
                            </div>
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest group-hover:text-white transition-colors">New Group</span>
                        </button>
                    </div>
                </div>

                {/* Live Floor View integrated into the main grid */}
                <div className="col-span-1 lg:col-span-2 h-full rounded-[2rem] overflow-hidden border border-white/5 shadow-premium">
                    <LiveStudentsWidget />
                </div>
            </div>





            {/* Modals */}

            {/* Modals */}
            {
                showGroupModal && (
                    <GroupFormModal
                        onClose={() => setShowGroupModal(false)}
                        onSuccess={() => {
                            setShowGroupModal(false);
                            // Trigger group list refresh ideally, but GroupsList has realtime
                            toast.success('Group created successfully');
                        }}
                    />
                )
            }

            {
                showStudentModal && (
                    <AddStudentForm
                        onClose={() => setShowStudentModal(false)}
                        onSuccess={() => {
                            setShowStudentModal(false);
                            toast.success('Student added successfully');
                        }}
                    />
                )
            }

            {
                isAIAssistantOpen && (
                    <AICoachAssistantModal
                        isOpen={isAIAssistantOpen}
                        onClose={() => setIsAIAssistantOpen(false)}
                    />
                )
            }

            {/* Attendance History Modal */}
            {showAttendanceHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowAttendanceHistory(false)}>
                    <div className="glass-card rounded-3xl w-full max-w-lg max-h-[70vh] flex flex-col shadow-2xl border border-white/20 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('common.attendance')} History</h2>
                                <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-1">Last 30 Sessions</p>
                            </div>
                            <button onClick={() => setShowAttendanceHistory(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {loadingAttendanceHistory ? (
                                <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest animate-pulse">{t('common.loading')}</div>
                            ) : attendanceHistory.length === 0 ? (
                                <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest italic">{t('common.noResults')}</div>
                            ) : (
                                <div className="space-y-3">
                                    {attendanceHistory.map((log) => (
                                        <div key={log.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between group">
                                            <div>
                                                <p className="text-xs font-black text-white/80">{log.date}</p>
                                                <p className="text-[10px] font-mono text-white/40 mt-1">
                                                    {log.check_in_time ? format(new Date(log.check_in_time), 'HH:mm:ss') : '--:--'} - {log.check_out_time ? format(new Date(log.check_out_time), 'HH:mm:ss') : 'LIVE'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${log.check_out_time ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/20 text-primary'}`}>
                                                    {log.status === 'absent' ? 'ABSENT' : log.check_out_time ? 'DONE' : 'WORKING'}
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
        </div>
    );
}

function formatTimer(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
