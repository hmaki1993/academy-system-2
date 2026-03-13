import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, subMonths, addMonths, isSameMonth, isSameDay, startOfDay } from 'date-fns';
import { X, ChevronLeft, ChevronRight, Calendar, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

interface PremiumCalendarModalProps {
    subscriptionId: string;
    studentName: string;
    onClose: () => void;
    onRefresh?: () => void;
}

export default function PremiumCalendarModal({ subscriptionId, studentName, onClose, onRefresh }: PremiumCalendarModalProps) {
    const { userProfile } = useTheme();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [newDate, setNewDate] = useState('');
    const [updating, setUpdating] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<any>(null);
    const [selectedDateForAdd, setSelectedDateForAdd] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
        fetchSubscription();
    }, [currentMonth, subscriptionId]);

    const fetchSubscription = async () => {
        try {
            const { data, error } = await supabase
                .from('pt_subscriptions')
                .select('*, students(full_name)')
                .eq('id', subscriptionId)
                .single();
            if (error) throw error;
            setSubscription(data);
        } catch (error) {
            console.error('Error fetching subscription:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);

            const { data, error } = await supabase
                .from('pt_sessions')
                .select('*')
                .eq('subscription_id', subscriptionId)
                .gte('date', format(start, 'yyyy-MM-dd'))
                .lte('date', format(end, 'yyyy-MM-dd'));

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const handleSessionClick = (session: any) => {
        setSelectedSession(session);
        setNewDate(session.date);
    };

    const handleUpdateSession = async () => {
        if (!selectedSession || !newDate) return;

        try {
            setUpdating(true);
            const loadingToast = toast.loading('Updating session...');

            // Preserve the original time but change the date
            const originalCreatedAt = new Date(selectedSession.created_at);
            const timeStr = format(originalCreatedAt, 'HH:mm:ss');
            const newCreatedAt = new Date(`${newDate}T${timeStr}`).toISOString();

            const { error } = await supabase
                .from('pt_sessions')
                .update({
                    date: newDate,
                    created_at: newCreatedAt
                })
                .eq('id', selectedSession.id);

            if (error) throw error;

            toast.success('Session updated', { id: loadingToast });
            setSelectedSession(null);
            fetchHistory();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error('Failed to update session');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteSession = async () => {
        if (!selectedSession || !subscription) return;

        try {
            setUpdating(true);
            const loadingToast = toast.loading('Deleting session...');

            // 1. Delete session record
            const { error: deleteError } = await supabase
                .from('pt_sessions')
                .delete()
                .eq('id', selectedSession.id);

            if (deleteError) throw deleteError;

            // 2. Increment sessions_remaining
            const newRemaining = (subscription.sessions_remaining || 0) + 1;
            const { error: subError } = await supabase
                .from('pt_subscriptions')
                .update({
                    sessions_remaining: newRemaining,
                    status: 'active', // If it was expired, it's now active again
                    updated_at: new Date().toISOString()
                })
                .eq('id', subscription.id);

            if (subError) throw subError;

            toast.success('Session deleted', { id: loadingToast });
            setSelectedSession(null);
            fetchHistory();
            fetchSubscription();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Failed to delete session');
        } finally {
            setUpdating(false);
        }
    };

    const handleRecordNewSession = async () => {
        if (!selectedDateForAdd || !subscription) return;

        if (subscription.sessions_remaining <= 0) {
            toast.error('No sessions remaining in this subscription');
            setSelectedDateForAdd(null);
            return;
        }

        try {
            setUpdating(true);
            const loadingToast = toast.loading('Recording session...');

            // 1. Record the session
            const studentData = Array.isArray(subscription.students) ? subscription.students[0] : subscription.students;
            const studentName = (studentData?.full_name || subscription.student_name || '').trim();

            // Align with scheduled time if present for that day
            const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const selectedDate = new Date(selectedDateForAdd);
            const dayName = dayMap[selectedDate.getDay()];
            const schedule = studentData?.training_schedule?.find((s: any) => s.day === dayName);

            let sessionDateTime = `${selectedDateForAdd}T12:00:00`;
            if (schedule && schedule.start) {
                sessionDateTime = `${selectedDateForAdd}T${schedule.start}:00`;
            }

            const payload: any = {
                coach_id: subscription.coach_id,
                date: selectedDateForAdd,
                sessions_count: 1,
                student_name: studentName,
                subscription_id: subscription.id,
                coach_share: subscription.coach_share,
                created_at: new Date(sessionDateTime).toISOString()
            };

            const { error: sessionError } = await supabase.from('pt_sessions').insert(payload);
            if (sessionError) throw sessionError;

            // 2. Decrement remaining
            const newRemaining = subscription.sessions_remaining - 1;
            const { error: subError } = await supabase
                .from('pt_subscriptions')
                .update({
                    sessions_remaining: newRemaining,
                    status: newRemaining === 0 ? 'expired' : subscription.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', subscription.id);

            if (subError) throw subError;

            toast.success('Session recorded!', { id: loadingToast });
            setSelectedDateForAdd(null);
            fetchHistory();
            fetchSubscription();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error recording session:', error);
            toast.error('Failed to record session');
        } finally {
            setUpdating(false);
        }
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const blanks = Array(startDay).fill(null);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="glass-card w-full max-w-md rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 bg-[#0a0c10]/80 relative">
                {/* Visual Header Decoration */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50"></div>

                <div className="p-6 border-b border-white/5 flex items-center justify-between relative">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"></div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                PT Training Journey
                            </h2>
                        </div>
                        <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[9px] ml-3.5">{studentName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-500 transition-all border border-white/5 hover:border-rose-500/20 active:scale-90"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all hover:scale-105"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h3>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all hover:scale-105"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="h-[250px] flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
                                <div key={i} className="text-center text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">
                                    {day}
                                </div>
                            ))}

                            {blanks.map((_, i) => (
                                <div key={`blank-${i}`} className="aspect-square opacity-0" />
                            ))}

                            {monthDays.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const daySessions = history.filter(h => h.date === dateStr);
                                const isAttended = daySessions.length > 0;
                                const isCurrentToday = isToday(day);

                                // Permission Logic
                                const isCoach = userProfile?.role === 'coach' || userProfile?.role === 'head_coach';

                                // Enhanced Record/Edit logic
                                const subStartRaw = subscription?.start_date || subscription?.created_at;
                                const subStart = subStartRaw ? new Date(subStartRaw) : null;
                                const isBeforeStart = subStart ? startOfDay(day) < startOfDay(subStart) : false;
                                const isFuture = day > new Date();
                                const canAdd = !isAttended && isCoach && !isBeforeStart && !isFuture && (subscription?.sessions_remaining > 0);
                                const canEdit = isAttended && isCoach;

                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => {
                                            if (canEdit) handleSessionClick(daySessions[0]);
                                            else if (canAdd) setSelectedDateForAdd(dateStr);
                                        }}
                                        disabled={(!canEdit && !canAdd) && !isAttended}
                                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all duration-500 relative group/day
                                            ${isCurrentToday ? 'border-primary ring-1 ring-primary/30 ring-offset-2 ring-offset-[#0a0c10]' : ''}
                                            ${isAttended
                                                ? 'bg-emerald-500/20 backdrop-blur-md border-emerald-500/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] z-10 ' + (canEdit ? 'cursor-pointer hover:bg-emerald-500/30' : 'cursor-default')
                                                : canAdd
                                                    ? 'bg-white/5 border-white/5 text-white/40 cursor-pointer hover:bg-white/10 hover:border-white/20'
                                                    : 'bg-white/5 border-white/5 text-white/10 cursor-default'}`}
                                    >
                                        <span className={`text-xs font-black ${isAttended ? 'text-white' : ''}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {isAttended && canEdit && (
                                            <div className="absolute top-1 right-1 opacity-0 group-hover/day:opacity-100 transition-opacity">
                                                <Edit2 className="w-2.5 h-2.5 text-white/90" />
                                            </div>
                                        )}
                                        {isAttended && (
                                            <div className="absolute bottom-1.5 flex gap-0.5 justify-center w-full">
                                                {daySessions.map((_, idx) => (
                                                    <div key={idx} className="w-0.5 h-0.5 rounded-full bg-white/80"></div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tooltip on hover */}
                                        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-[7px] font-black uppercase tracking-widest text-white opacity-0 group-hover/day:opacity-100 pointer-events-none transition-all scale-90 group-hover/day:scale-100 z-[1001] whitespace-nowrap shadow-2xl">
                                            {isAttended ? (
                                                <div className="flex flex-col gap-1">
                                                    <span>{canEdit ? 'Edit PT • ' : ''}{daySessions.length} Session{daySessions.length > 1 ? 's' : ''}</span>
                                                </div>
                                            ) : canAdd ? (
                                                <span>Record PT Session</span>
                                            ) : isBeforeStart ? (
                                                <span>Before Enrollment</span>
                                            ) : (
                                                <span>{format(day, 'd')}</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-8">
                        <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl relative overflow-hidden group/stat">
                            <div className="absolute -right-4 -top-4 w-12 h-12 bg-primary/10 rounded-full blur-xl group-hover/stat:scale-150 transition-transform duration-700"></div>
                            <div className="text-2xl font-black text-primary tracking-tighter">
                                {history.length}
                            </div>
                            <div className="text-[8px] font-black text-primary/50 uppercase tracking-[0.2em] mt-0.5">PT Sessions This Month</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl relative overflow-hidden group/stat">
                            <div className="absolute -right-4 -top-4 w-12 h-12 bg-white/5 rounded-full blur-xl group-hover/stat:scale-150 transition-transform duration-700"></div>
                            <div className="text-2xl font-black text-white/40 tracking-tighter">
                                {monthDays.length > 0 ? Math.round((history.length / monthDays.length) * 100) : 0}%
                            </div>
                            <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-0.5">Consistency Rate</div>
                        </div>
                    </div>
                </div>

                {/* Record New Session Dialog */}
                {selectedDateForAdd && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="glass-card w-full max-w-xs rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 bg-[#0a0c10]/95 p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6 transform rotate-3">
                                <Calendar className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Record Session</h3>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-8">
                                {format(new Date(selectedDateForAdd), 'EEEE, MMMM do')}
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleRecordNewSession}
                                    disabled={updating}
                                    className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    {updating ? 'Recording...' : 'Confirm Record'}
                                </button>
                                <button
                                    onClick={() => setSelectedDateForAdd(null)}
                                    className="w-full py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Session Modal */}
                {selectedSession && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="glass-card w-full max-w-xs rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 bg-[#0a0c10]/95 p-8">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                                <Edit2 className="w-5 h-5 text-primary" />
                                Edit PT Session
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">New Date</label>
                                    <input
                                        type="date"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-primary/50 transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleUpdateSession}
                                        disabled={updating}
                                        className="w-full py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                                    >
                                        {updating ? 'Updating...' : 'Save Changes'}
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={handleDeleteSession}
                                        disabled={updating}
                                        className="w-full py-4 rounded-2xl bg-rose-500/10 text-rose-500 font-black uppercase tracking-widest text-[10px] border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-95"
                                    >
                                        Delete Session
                                    </button>

                                    <button
                                        onClick={() => setSelectedSession(null)}
                                        className="w-full py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
