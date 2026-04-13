import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, endOfWeek } from 'date-fns';
import { enUS, ar } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, Users, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Trash2, CalendarDays, LogOut, RefreshCw, Sparkles, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import GroupCard from '../components/GroupCard';
import GroupDetailsModal from '../components/GroupDetailsModal';
import GroupFormModal from '../components/GroupFormModal';
import ConfirmModal from '../components/ConfirmModal';
import AddSessionForm from '../components/AddSessionForm';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';
import { syncAllStudentsToGroups } from '../services/groupService';

interface Session {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    day_of_week: string;
    coach_id: string;
    coaches: {
        full_name: string;
        role?: string;
    };
    capacity: number;
    name?: string;
    schedule_key?: string;
}

type ViewMode = 'day' | 'week' | 'month';

export default function Schedule() {
    const { t, i18n } = useTranslation();
    const { role } = useOutletContext<{ role: string }>() || { role: null };
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    // Admin Actions State
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [groupToDelete, setGroupToDelete] = useState<any>(null);

    // Attendance State
    const [attendanceToday, setAttendanceToday] = useState<any>(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [coachId, setCoachId] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

    // Hoisted functions
    const fetchSessions = async (silent = false) => {
        if (!silent) setLoading(true);

        try {
            let query = supabase
                .from('training_groups')
                .select(`
    *,
    coaches(full_name, role),
    students(id, full_name, birth_date)
        `);

            // If user is a simple coach, only show THEIR groups
            if (role === 'coach') {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: coachData } = await supabase
                        .from('coaches')
                        .select('id')
                        .eq('profile_id', user.id)
                        .single();

                    if (coachData) {
                        query = query.eq('coach_id', coachData.id);
                    }
                }
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading schedule:', error);
            } else {
                let filtered = data as any || [];
                if (role === 'head_coach') {
                    filtered = filtered.filter((session: any) => {
                        const coachRole = session.coaches?.role?.toLowerCase().trim();
                        return coachRole !== 'reception' && coachRole !== 'receptionist' && coachRole !== 'cleaner';
                    });
                }
                setSessions(filtered);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceStatus = async () => {
        setAttendanceLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // 1. Get Coach ID
            const { data: coachData } = await supabase
                .from('coaches')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (coachData) {
                setCoachId(coachData.id);
                // 2. Check today's attendance
                const today = new Date().toISOString().split('T')[0];
                const { data: attendance } = await supabase
                    .from('coach_attendance')
                    .select('*')
                    .eq('coach_id', coachData.id)
                    .eq('date', today)
                    .single();

                setAttendanceToday(attendance);
            }
        }
        setAttendanceLoading(false);
    };

    useEffect(() => {
        fetchSessions();
        if (role === 'coach') {
            fetchAttendanceStatus();
        }

        // Realtime subscription removed to stop 400 Bad Request limits.
        // Data is fetched on mount and can be re-fetched after actions.
        return () => { };
    }, [role]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (attendanceToday && attendanceToday.check_in_time && !attendanceToday.check_out_time) {
            const startTime = new Date(attendanceToday.check_in_time).getTime();

            const updateTimer = () => {
                const now = new Date().getTime();
                const diff = now - startTime;

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} `
                );
            };

            updateTimer();
            interval = setInterval(updateTimer, 1000);
        }

        return () => clearInterval(interval);
    }, [attendanceToday]);

    const handleCheckIn = async () => {
        if (!coachId) return;
        setAttendanceLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('coach_attendance')
            .insert({
                coach_id: coachId,
                date: today,
                check_in_time: new Date().toISOString()
            })
            .select()
            .single();

        if (error) console.error('Check-in failed:', error);
        else setAttendanceToday(data);
        setAttendanceLoading(false);
    };

    const handleCheckOut = async () => {
        if (!attendanceToday) return;
        setAttendanceLoading(true);

        const { data, error } = await supabase
            .from('coach_attendance')
            .update({ check_out_time: new Date().toISOString() })
            .eq('id', attendanceToday.id)
            .select()
            .single();

        if (error) console.error('Check-out failed:', error);
        else setAttendanceToday(data);
        setAttendanceLoading(false);
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        if (viewMode === 'day') {
            setCurrentDate(d => direction === 'next' ? addDays(d, 1) : addDays(d, -1));
        } else if (viewMode === 'week') {
            setCurrentDate(d => direction === 'next' ? addDays(d, 7) : addDays(d, -7));
        } else {
            setCurrentDate(d => direction === 'next' ? addDays(d, 30) : addDays(d, -30)); // Simple month nav
        }
    };

    const getSessionsForDay = (date: Date) => {
        // Use 3-letter day name (sat, sun, mon...) to match the database schedule_key
        const dayAbbr = format(date, 'eee').toLowerCase();
        return sessions.filter(s => {
            if (!s.schedule_key) return false;
            const parts = s.schedule_key.toLowerCase().split('|');
            return parts.some(p => p.startsWith(dayAbbr));
        });
    };

    const handleDeleteGroup = async () => {
        if (!groupToDelete) return;

        const { error } = await supabase.from('training_groups').delete().eq('id', groupToDelete.id);

        if (error) {
            console.error('Error deleting group:', error);
            toast.error('Failed to delete group');
        } else {
            toast.success('Group deleted');
            fetchSessions(true);
        }
        setGroupToDelete(null);
    };

    const renderHeader = () => (
        <div className="flex flex-col gap-6 mb-8">
            <PageHeader
                title={t('dashboard.schedule')}
                subtitle={format(currentDate, 'MMMM yyyy', { locale: i18n.language === 'ar' ? ar : enUS })}
            >
                {/* View Switcher & Date Nav Combined */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex p-1 bg-[#0a0c10]/40 backdrop-blur-xl rounded-xl border border-white/5 shadow-2xl">
                        {['month', 'week', 'day'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode as ViewMode)}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === mode ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                            >
                                {t(`dashboard.${mode}`)}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-[#0a0c10]/40 backdrop-blur-xl rounded-xl border border-white/5 shadow-2xl">
                        <button onClick={() => navigateDate('prev')} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all active:scale-90 border border-transparent hover:border-white/10">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 min-w-[120px] text-center">
                            <span className="font-black text-white uppercase tracking-widest text-[9px]">
                                {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMM dd, yyyy')}
                            </span>
                        </div>
                        <button onClick={() => navigateDate('next')} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all active:scale-90 border border-transparent hover:border-white/10">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {(role === 'admin' || role === 'head_coach') && (
                        <button
                            onClick={() => {
                                setEditingGroup(null);
                                setShowGroupModal(true);
                            }}
                            className="h-12 px-6 rounded-xl bg-primary hover:bg-primary-dark text-black font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-primary/20"
                        >
                            <Plus className="w-4 h-4" />
                            {t('dashboard.createGroup')}
                        </button>
                    )}
                </div>
            </PageHeader>

            {/* Coach Attendance Section */}
            {role === 'coach' && (
                <div className="glass-card p-5 rounded-2xl border border-white/10 shadow-lg overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl border ${!attendanceToday ? 'bg-white/5 border-white/10' : attendanceToday.check_out_time ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-primary/10 border-primary/20 animate-pulse'}`}>
                                <Clock className={`w-6 h-6 ${!attendanceToday ? 'text-white/20' : attendanceToday.check_out_time ? 'text-emerald-400' : 'text-primary'}`} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-1">{t('common.attendanceStatus')}</span>
                                <h4 className="text-xl font-black text-white tracking-tighter uppercase">
                                    {!attendanceToday ? t('common.notCheckedIn') : attendanceToday.check_out_time ? t('common.shiftCompleted') : t('common.currentlyWorking')}
                                </h4>
                            </div>
                        </div>

                        {!attendanceToday ? (
                            <button
                                onClick={handleCheckIn}
                                disabled={attendanceLoading}
                                className="h-14 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center gap-3 group/btn"
                            >
                                <Sparkles className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                                {t('common.checkIn')}
                            </button>
                        ) : !attendanceToday.check_out_time ? (
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="px-8 py-4 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-4 group/time">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                        <span className="text-2xl font-mono font-black text-emerald-400 tracking-tighter shadow-glow">
                                            {elapsedTime}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCheckOut}
                                    disabled={attendanceLoading}
                                    className="h-14 px-8 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 shadow-xl shadow-rose-500/20 flex items-center gap-3 group/btn"
                                >
                                    <LogOut className="w-5 h-5 group-hover/btn:-translate-x-1 transition-transform" />
                                    {t('common.out')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-emerald-500/5 px-6 py-3 rounded-2xl border border-emerald-500/10">
                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">
                                        {format(new Date(attendanceToday.check_in_time), 'HH:mm')} - {format(new Date(attendanceToday.check_out_time), 'HH:mm')}
                                    </span>
                                    <span className="text-[12px] font-bold text-white/40 uppercase tracking-tighter italic">
                                        Good job today!
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 6 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 });
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="overflow-x-auto pb-6 custom-scrollbar animate-in slide-in-from-bottom-8 duration-700">
                <div className="grid grid-cols-7 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/10 min-w-[1000px] shadow-2xl backdrop-blur-md">
                    {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                        <div key={day} className="bg-[#0a0c10]/80 py-6 text-center text-[10px] font-black text-white/20 uppercase tracking-[0.4em] border-b border-white/5">
                            {t(`students.days.${day.toLowerCase()}`)}
                        </div>
                    ))}
                    {days.map((day: Date) => {
                        const isToday = isSameDay(day, new Date());
                        const daySessions = getSessionsForDay(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);

                        return (
                            <div
                                key={day.toString()}
                                className={`bg-[#0a0c10]/40 min-h-[110px] p-4 relative group hover:bg-white/[0.05] transition-all duration-500 cursor-pointer border-r border-b border-white/5 ${!isCurrentMonth ? 'opacity-20 bg-black/80' : ''}`}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setViewMode('day');
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-black tracking-tighter inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-500 ${isToday ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-110' : isCurrentMonth ? 'text-white/60 group-hover:text-white' : 'text-white/20'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {daySessions.length > 0 && isCurrentMonth && (
                                        <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                                            {daySessions.length}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-6 space-y-1.5 flex flex-col">
                                    {daySessions.slice(0, 3).map((session, idx) => {
                                        const dayAbbr = format(day, 'eee').toLowerCase();
                                        const scheduleEntry = session.schedule_key?.toLowerCase().split('|').find((s: string) => s.startsWith(dayAbbr));
                                        const startTime = scheduleEntry?.split(':')[1] || '';

                                        return (
                                            <div
                                                key={session.id || idx}
                                                className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all w-full group/item overflow-hidden relative"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedGroup(session);
                                                }}
                                            >
                                                <div className="flex items-center justify-between gap-2 overflow-hidden relative z-10">
                                                    <p className="text-[9px] font-black text-white/90 uppercase truncate tracking-tighter leading-none">
                                                        {session.name || session.title}
                                                    </p>
                                                    {startTime && <span className="text-[8px] font-mono font-bold text-primary shrink-0 opacity-60">{startTime}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {daySessions.length > 3 && (
                                        <div className="text-[9px] font-black text-white/10 group-hover:text-primary transition-colors uppercase tracking-widest text-center mt-2">
                                            + {daySessions.length - 3} MORE
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate, { weekStartsOn: 6 });
        const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));
        const dayNames = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

        return (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    const daySessions = getSessionsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate); // Added for consistency with the provided snippet

                    return (
                        <div key={i} className={`flex flex-col gap-3 group/day ${isToday ? 'relative' : ''}`}>
                            {isToday && (
                                <div className="absolute -inset-0.5 bg-gradient-to-b from-primary to-accent rounded-2xl blur opacity-30"></div>
                            )}
                            <div
                                className={`relative z-10 text-center p-4 rounded-2xl cursor-pointer transition-all duration-500 hover:-translate-y-1 ${isToday ? 'bg-gradient-to-b from-primary to-primary/80 text-white shadow-[0_10px_40px_rgba(var(--primary),0.3)] border border-white/20' : 'bg-[#0a0c10]/40 backdrop-blur-xl border border-white/5 hover:border-primary/30 hover:bg-white/5'}`}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setViewMode('day');
                                }}
                            >
                                <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 transition-colors ${isToday ? 'text-white/90' : 'text-white/30 group-hover/day:text-white/60'}`}>{t(`students.days.${format(day, 'eee').toLowerCase()}`)}</p>
                                <p className={`text-xl font-black tracking-tighter transition-colors ${isToday ? 'text-white scale-110 origin-center' : 'text-white/80 group-hover/day:text-white'}`}>{format(day, 'dd')}</p>

                                {/* Dot indicator for sessions */}
                                {daySessions.length > 0 && !isToday && (
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                        <div className="w-1 h-1 rounded-full bg-primary/50 group-hover/day:bg-primary shadow-glow"></div>
                                    </div>
                                )}
                            </div>

                            {/* Sessions List for Desktop (Hidden ideally if just a selector, but keeping for functionality if user relies on column view) */}
                            <div className="relative z-10 space-y-3 hidden md:block">
                                {daySessions.map((session, idx) => (
                                    <div
                                        key={session.id || idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedGroup(session);
                                        }}
                                        className="bg-[#0a0c10]/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 hover:border-primary/40 hover:bg-white/5 transition-all duration-300 cursor-pointer group/session hover:translate-x-1"
                                    >
                                        <h4 className="font-black text-white text-xs group-hover/session:text-primary transition-colors uppercase tracking-tight line-clamp-2 leading-relaxed">{session.title || session.name}</h4>
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                                                <Users className="w-2.5 h-2.5 text-white/40" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 group-hover/session:text-white/60 transition-colors">
                                                {session.coaches?.full_name?.split(' ')[0]}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const daySessions = getSessionsForDay(currentDate);

        return (
            <div className="w-full max-w-5xl mx-auto animate-in zoom-in-95 duration-500">
                <div className="bg-[#0a0c10]/40 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="font-black text-lg md:text-xl text-white uppercase tracking-tighter flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-accent rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                                <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-white" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[7px] md:text-[9px] font-black text-white/30 tracking-[0.3em] md:tracking-[0.4em] uppercase">{t('dashboard.selectedDate')}</span>
                                <span className="text-sm md:text-xl">{format(currentDate, 'EEEE, MMMM do', { locale: i18n.language === 'ar' ? ar : enUS })}</span>
                            </div>
                        </h3>
                    </div>

                    <div className="divide-y divide-white/5 relative z-10">
                        {daySessions.length === 0 ? (
                            <div className="py-32 text-center flex flex-col items-center gap-6">
                                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-inner">
                                    <Sparkles className="w-10 h-10 text-white/10" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white/20 uppercase tracking-[0.2em] mb-2">{t('dashboard.noScheduledGroups')}</h3>
                                    <p className="text-white/10 font-bold uppercase tracking-widest text-xs">{t('dashboard.freeDayNote')}</p>
                                </div>
                            </div>
                        ) : (
                            daySessions.map((session, idx) => (
                                <div
                                    key={session.id || idx}
                                    className="p-4 md:p-8 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-10 hover:bg-white/[0.02] transition-all cursor-pointer group relative overflow-hidden"
                                    onClick={() => setSelectedGroup(session)}
                                >
                                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    {(() => {
                                        const dayAbbr = format(currentDate, 'eee').toLowerCase();
                                        const scheduleEntry = session.schedule_key?.toLowerCase().split('|').find((s: string) => s.startsWith(dayAbbr));
                                        const timeStr = scheduleEntry?.split(':')[1] || '00:00';

                                        // Simple parsing to show AM/PM
                                        const [h, m] = timeStr.split(':').map(Number);
                                        const ampm = h >= 12 ? 'PM' : 'AM';
                                        const displayH = h % 12 || 12;
                                        const displayM = String(m || 0).padStart(2, '0');

                                        return (
                                            <div className="text-center w-full sm:min-w-[120px] sm:w-auto bg-white/[0.02] p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 group-hover:border-primary/20 group-hover:bg-primary/10 transition-all shadow-lg flex sm:flex-col justify-between items-center sm:justify-center">
                                                <p className="font-black text-white/40 text-[9px] md:text-xs uppercase tracking-widest group-hover:text-primary/60 transition-colors">Start Time</p>
                                                <p className="font-black text-white text-base md:text-2xl tracking-tighter group-hover:text-primary transition-colors">
                                                    {displayH}:{displayM} <span className="text-[10px] md:text-sm text-white/20">{ampm}</span>
                                                </p>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex-1">
                                        <h4 className="text-lg md:text-2xl font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight mb-2 md:mb-4">{session.title || session.name}</h4>
                                        <div className="flex flex-wrap items-center gap-3 md:gap-6">
                                            <div className="flex items-center gap-2 md:gap-3 bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-white/5">
                                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center border border-white/10">
                                                    <User className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                                                </div>
                                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/60">
                                                    {session.coaches?.full_name?.split(' ')[0]}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/30">
                                                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                                {t('dashboard.activeSession')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden sm:block p-4 rounded-2xl bg-white/5 text-white/10 group-hover:text-primary group-hover:bg-primary/10 transition-all border border-white/5 group-hover:border-primary/20 rotate-45 group-hover:rotate-0 duration-500">
                                        <ArrowRight className="w-6 h-6" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {renderHeader()}

            {loading ? (
                <div className="text-white/40 italic">{t('common.loading')}</div>
            ) : (
                <>
                    {/* View Switcher */}
                    {viewMode === 'month' && renderMonthView()}
                    {viewMode === 'week' && renderWeekView()}
                    {viewMode === 'day' && renderDayView()}

                    {/* Group Grid (Available in all views or just a specific section? Currently replacing the session list if Admin wants to manage) */}
                    <div className="mt-8">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-gradient-to-b from-primary to-accent rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]"></span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">{t('dashboard.allGroups')}</span>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sessions.map((session: any) => (
                                <GroupCard
                                    key={session.id}
                                    group={session}
                                    onViewDetails={(g) => setSelectedGroup(g)}
                                    onEdit={(role === 'admin' || role === 'head_coach') ? (g) => { setEditingGroup(g); setShowGroupModal(true); } : undefined}
                                    onDelete={(role === 'admin' || role === 'head_coach') ? (g) => setGroupToDelete(g) : undefined}
                                />
                            ))}

                            {sessions.length === 0 && (
                                <div className="col-span-full py-12 text-center text-white/40 italic">
                                    {t('dashboard.noGroupsFound')}. {(role === 'admin' || role === 'head_coach') ? t('dashboard.createOneAbove') : ''}
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedGroup && (
                        <GroupDetailsModal
                            group={selectedGroup}
                            onClose={() => setSelectedGroup(null)}
                            onEdit={(role === 'admin' || role === 'head_coach') ? () => {
                                setSelectedGroup(null);
                                setEditingGroup(selectedGroup);
                                setShowGroupModal(true);
                            } : undefined}
                        />
                    )}

                    {showGroupModal && (
                        <GroupFormModal
                            initialData={editingGroup}
                            onClose={() => setShowGroupModal(false)}
                            onSuccess={fetchSessions}
                        />
                    )}

                    <ConfirmModal
                        isOpen={!!groupToDelete}
                        onClose={() => setGroupToDelete(null)}
                        onConfirm={handleDeleteGroup}
                        title={t('common.delete')}
                        message={t('common.deleteConfirm')}
                    />
                </>
            )}

            {showAddModal && (
                <AddSessionForm
                    initialData={editingSession}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchSessions}
                />
            )}
        </div>
    );
}
