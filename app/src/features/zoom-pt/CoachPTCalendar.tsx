import { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, X, Clock, User, Calendar,
    CheckCircle, AlertCircle, XCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    addMonths, subMonths, isSameDay, isToday, getDay
} from 'date-fns';

interface CoachPTCalendarProps {
    coachId: string;
    onClose: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; icon: any }> = {
    pending: { color: 'text-amber-400', dot: 'bg-amber-400', icon: AlertCircle },
    confirmed: { color: 'text-emerald-400', dot: 'bg-emerald-400', icon: CheckCircle },
    cancelled: { color: 'text-red-400', dot: 'bg-red-400', icon: XCircle },
    completed: { color: 'text-blue-400', dot: 'bg-blue-400', icon: CheckCircle },
};

export default function CoachPTCalendar({ coachId, onClose }: CoachPTCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    useEffect(() => {
        fetchBookings();
    }, [currentMonth, coachId]);

    const fetchBookings = async () => {
        setLoading(true);
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

        const { data } = await supabase
            .from('pt_bookings')
            .select('*')
            .eq('coach_id', coachId)
            .gte('booking_date', start)
            .lte('booking_date', end)
            .order('time_slot', { ascending: true });

        setBookings(data || []);
        setLoading(false);
    };

    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    // Blank cells before first day
    const startBlank = getDay(startOfMonth(currentMonth));

    // Group bookings by date string
    const bookingsByDate: Record<string, any[]> = {};
    bookings.forEach(b => {
        if (!bookingsByDate[b.booking_date]) bookingsByDate[b.booking_date] = [];
        bookingsByDate[b.booking_date].push(b);
    });

    const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
    const selectedBookings = selectedDateStr ? (bookingsByDate[selectedDateStr] || []) : [];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-3xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            PT Schedule
                        </h2>
                        <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-0.5">
                            Your booked PT sessions
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                    {/* Calendar */}
                    <div className="flex-1 p-5 overflow-y-auto">
                        {/* Month Nav */}
                        <div className="flex items-center justify-between mb-5">
                            <button
                                onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDay(null); }}
                                className="p-2 hover:bg-white/5 rounded-xl border border-white/5 text-white/40 hover:text-white transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <h3 className="text-base font-black text-white uppercase tracking-tight">
                                {format(currentMonth, 'MMMM yyyy')}
                            </h3>
                            <button
                                onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDay(null); }}
                                className="p-2 hover:bg-white/5 rounded-xl border border-white/5 text-white/40 hover:text-white transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Day labels */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <div key={i} className="text-center text-[9px] font-black text-white/20 uppercase tracking-widest py-1">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1">
                                {/* Blanks */}
                                {Array(startBlank).fill(null).map((_, i) => (
                                    <div key={`b${i}`} className="aspect-square" />
                                ))}

                                {monthDays.map(day => {
                                    const ds = format(day, 'yyyy-MM-dd');
                                    const dayBookings = bookingsByDate[ds] || [];
                                    const hasBookings = dayBookings.length > 0;
                                    const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                                    const today = isToday(day);

                                    // Pick dominant status color
                                    const hasConfirmed = dayBookings.some(b => b.status === 'confirmed');
                                    const hasPending = dayBookings.some(b => b.status === 'pending');
                                    const dotColor = hasConfirmed ? 'bg-emerald-400' : hasPending ? 'bg-amber-400' : 'bg-blue-400';

                                    return (
                                        <button
                                            key={ds}
                                            onClick={() => setSelectedDay(isSelected ? null : day)}
                                            className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 text-xs font-black
                                                ${isSelected ? 'bg-primary scale-110 shadow-lg shadow-primary/30 text-white z-10' : ''}
                                                ${!isSelected && today ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-transparent text-primary' : ''}
                                                ${!isSelected && hasBookings ? 'bg-white/10 text-white hover:bg-white/15' : ''}
                                                ${!isSelected && !hasBookings ? 'text-white/30 hover:bg-white/5' : ''}
                                            `}
                                        >
                                            {format(day, 'd')}
                                            {hasBookings && !isSelected && (
                                                <div className="flex gap-0.5 mt-0.5 absolute bottom-1.5">
                                                    {dayBookings.slice(0, 3).map((_, i) => (
                                                        <span key={i} className={`w-1 h-1 rounded-full ${dotColor}`} />
                                                    ))}
                                                </div>
                                            )}
                                            {hasBookings && isSelected && (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-primary text-[8px] font-black flex items-center justify-center shadow">
                                                    {dayBookings.length}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Legend */}
                        <div className="flex gap-4 mt-4 pt-4 border-t border-white/5">
                            {[
                                { label: 'Confirmed', dot: 'bg-emerald-400' },
                                { label: 'Pending', dot: 'bg-amber-400' },
                                { label: 'Completed', dot: 'bg-blue-400' },
                            ].map(l => (
                                <div key={l.label} className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Side Panel: Selected Day Bookings */}
                    <div className="sm:w-64 border-t sm:border-t-0 sm:border-l border-white/10 p-5 overflow-y-auto bg-white/[0.02]">
                        {!selectedDay ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
                                <Calendar className="w-8 h-8 text-white/10" />
                                <p className="text-white/20 text-xs font-black uppercase tracking-widest">
                                    Click a day to see sessions
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <h4 className="font-black text-white uppercase tracking-tight text-sm">
                                        {format(selectedDay, 'EEEE')}
                                    </h4>
                                    <p className="text-primary text-xs font-black uppercase tracking-widest">
                                        {format(selectedDay, 'MMM d, yyyy')}
                                    </p>
                                </div>

                                {selectedBookings.length === 0 ? (
                                    <div className="text-center py-6">
                                        <p className="text-white/20 text-xs font-black uppercase tracking-widest">No sessions</p>
                                    </div>
                                ) : (
                                    selectedBookings.map(b => {
                                        const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={b.id} className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                                        <span className="text-white font-black text-xs">{b.time_slot}</span>
                                                    </div>
                                                    <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-white/30 shrink-0" />
                                                    <span className="text-white/60 text-[11px] font-bold truncate">{b.student_name || 'Student'}</span>
                                                </div>
                                                <div className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
                                                    {b.status}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer summary */}
                <div className="shrink-0 px-5 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
                    <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">
                        {bookings.length} bookings this month
                    </span>
                    <div className="flex gap-3">
                        {Object.entries(
                            bookings.reduce((acc: any, b) => {
                                acc[b.status] = (acc[b.status] || 0) + 1; return acc;
                            }, {})
                        ).map(([status, count]) => (
                            <span key={status} className={`text-[10px] font-black uppercase tracking-wider ${STATUS_CONFIG[status]?.color || 'text-white/40'}`}>
                                {count as number} {status}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
