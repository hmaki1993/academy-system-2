import { useState } from 'react';
import {
    ChevronLeft, ChevronRight, Clock, User, Calendar, Wallet,
    CheckCircle2, AlertCircle, XCircle, BarChart3, Download, X, Printer, Plus, LayoutDashboard
} from 'lucide-react';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    addMonths, subMonths, isSameDay, isToday, getDay, parseISO
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentPTCalendarProps {
    bookings: any[];
    onDelete?: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { color: string; dot: string; icon: any; label: string }> = {
    pending: { color: 'text-amber-400', dot: 'bg-amber-400', icon: AlertCircle, label: 'Pending' },
    confirmed: { color: 'text-emerald-400', dot: 'bg-emerald-400', icon: CheckCircle2, label: 'Confirmed' },
    cancelled: { color: 'text-red-400', dot: 'bg-red-400', icon: XCircle, label: 'Cancelled' },
    completed: { color: 'text-blue-400', dot: 'bg-blue-400', icon: CheckCircle2, label: 'Completed' },
};

export default function StudentPTCalendar({ bookings, onDelete }: StudentPTCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);

    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const startBlank = getDay(startOfMonth(currentMonth));

    // Group bookings by date string
    const bookingsByDate: Record<string, any[]> = {};
    bookings.forEach(b => {
        const dateStr = b.booking_date; // Assuming YYYY-MM-DD
        if (!bookingsByDate[dateStr]) bookingsByDate[dateStr] = [];
        bookingsByDate[dateStr].push(b);
    });

    const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
    const selectedBookings = selectedDateStr ? (bookingsByDate[selectedDateStr] || []) : [];

    // Monthly Summary Data
    const currentMonthStr = format(currentMonth, 'yyyy-MM');
    const monthBookings = bookings.filter(b => b.booking_date.startsWith(currentMonthStr))
        .sort((a, b) => a.booking_date.localeCompare(b.booking_date));
    
    const totalSpending = monthBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const confirmedCount = monthBookings.filter(b => b.status === 'confirmed').length;
    const pendingCount = monthBookings.filter(b => b.status === 'pending').length;
    const completedCount = monthBookings.filter(b => b.status === 'completed').length;

    return (
        <div className="w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row min-h-[500px] gap-8">
                {/* Calendar Side - Tighter on PC */}
                <div className="flex-1 p-4 sm:p-6 lg:max-w-xl">
                    {/* Month Nav */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">
                                {format(currentMonth, 'MMMM yyyy')}
                            </h3>
                            <button 
                                onClick={() => setIsSummaryOpen(true)}
                                className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-all active:scale-95 group"
                                title="Monthly Report"
                            >
                                <BarChart3 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-2 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 hover:text-white transition-all active:scale-90"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-2 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 hover:text-white transition-all active:scale-90"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Day labels */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-black text-white/20 uppercase tracking-widest py-2">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {Array(startBlank).fill(null).map((_, i) => (
                            <div key={`b${i}`} className="h-10 sm:h-12 lg:h-10" />
                        ))}

                        {monthDays.map(day => {
                            const ds = format(day, 'yyyy-MM-dd');
                            const dayBookings = bookingsByDate[ds] || [];
                            const hasBookings = dayBookings.length > 0;
                            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                            const today = isToday(day);

                            // Dominant Status Marker
                            const hasConfirmed = dayBookings.some(b => b.status === 'confirmed');
                            const hasPending = dayBookings.some(b => b.status === 'pending');
                            const dotColor = hasConfirmed ? 'bg-emerald-400' : hasPending ? 'bg-amber-400' : 'bg-blue-400';

                            return (
                                <button
                                    key={ds}
                                    onClick={() => setSelectedDay(day)}
                                    className="h-10 sm:h-12 lg:h-10 flex items-center justify-center relative group"
                                >
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex flex-col items-center justify-center transition-all duration-300 text-[11px] sm:text-sm font-black relative z-10
                                        ${isSelected ? 'bg-primary/20 border-2 border-primary text-primary shadow-[0_0_20px_rgba(212,175,55,0.3)] scale-110' : ''}
                                        ${!isSelected && today ? 'text-primary' : ''}
                                        ${!isSelected && hasBookings ? 'text-white hover:bg-white/10' : ''}
                                        ${!isSelected && !hasBookings ? 'text-white/20 hover:bg-white/5 hover:text-white' : ''}
                                    `}>
                                        <span className="relative z-10">{format(day, 'd')}</span>
                                        {!isSelected && today && (
                                            <div className="absolute bottom-1 w-2.5 h-0.5 bg-primary rounded-full" />
                                        )}
                                        {/* Status Dots - Perfectly attached to the circle */}
                                        {hasBookings && (
                                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex justify-center gap-0.5">
                                                {dayBookings.map((b, idx) => (
                                                    <span 
                                                        key={`${b.id}-${idx}`} 
                                                        className={`w-1 h-1 rounded-full ${STATUS_CONFIG[b.status]?.dot || 'bg-white'} shadow-[0_0_5px_currentColor]`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-white/5">
                        {[
                            { label: 'Confirmed', dot: 'bg-emerald-400' },
                            { label: 'Pending', dot: 'bg-amber-400' },
                            { label: 'Completed', dot: 'bg-blue-400' },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{l.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Details Side Panel - Compact Fit */}
                {/* Details Side Panel - Compact Fit */}
                <div className="lg:w-64 bg-white/[0.01] border border-white/5 rounded-xl p-2.5 sm:p-3 backdrop-blur-3xl shadow-2xl h-fit">
                    {!selectedDay ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                            <Calendar className="w-10 h-10 text-white/5" />
                            <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] max-w-[150px]">
                                Click a marked date to see your sessions
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {selectedBookings.map((b) => {
                                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                                return (
                                    <div 
                                        key={b.id} 
                                        className="relative group py-3.5 border-b border-white/5 last:border-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                                    >
                                        {/* Status Badge & Delete - Floated */}
                                        <div className="flex items-center justify-between mb-2.5">
                                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                                <div className={`w-1 h-1 rounded-full ${cfg.dot} animate-pulse shadow-[0_0_5px_currentColor]`} />
                                                <span className={`text-[7px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                            </div>

                                            {(b.status === 'pending' || b.status === 'cancelled') && onDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(b.id);
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center hover:bg-rose-500/20 rounded-full text-white/20 hover:text-rose-500 transition-all active:scale-90 border border-transparent hover:border-rose-500/30"
                                                    title="Cancel Session"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Time & Date Info */}
                                        <div className="space-y-0.5 mb-3">
                                            <h4 className="text-sm font-black text-white/40 uppercase tracking-widest leading-none">
                                                {format(selectedDay, 'EEEE, MMM d')}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-primary" />
                                                <span className="text-white font-black text-xl tracking-tighter italic leading-none whitespace-nowrap">
                                                    {b.time_slot.replace(/^0/, '')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Bottom Metadata */}
                                        <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-white/40" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-white/60">
                                                    {b.coach_name || 'Admin'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Wallet className="w-3.5 h-3.5 text-primary/60" />
                                                <span className="text-sm font-black text-primary italic tracking-tight">
                                                    {b.amount ?? 0} KWD
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Summary Bar */}
            <div className="px-4 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                    Month Summary: <span className="text-white ml-2">{bookings.filter(b => b.booking_date.startsWith(format(currentMonth, 'yyyy-MM'))).length} Total Sessions</span>
                </p>
                <div className="flex gap-4">
                    {['confirmed', 'pending', 'cancelled'].map(status => {
                        const count = bookings.filter(b => b.status === status && b.booking_date.startsWith(format(currentMonth, 'yyyy-MM'))).length;
                        if (count === 0) return null;
                        return (
                            <div key={status} className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase ${STATUS_CONFIG[status].color}`}>{count} {status}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Monthly Summary Modal */}
            <AnimatePresence>
                {isSummaryOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSummaryOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl max-h-[90vh] bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Monthly Report</h2>
                                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{format(currentMonth, 'MMMM yyyy')}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsSummaryOpen(false)}
                                    className="p-3 hover:bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-8 custom-scrollbar">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                    {[
                                        { label: 'Sessions', val: monthBookings.length, color: 'text-white' },
                                        { label: 'Confirmed', val: confirmedCount, color: 'text-emerald-400' },
                                        { label: 'Pending', val: pendingCount, color: 'text-amber-400' },
                                        { label: 'Paid', val: `${totalSpending} K`, color: 'text-primary' }
                                    ].map(s => (
                                        <div key={s.label} className="p-3 sm:p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-0.5 sm:space-y-1">
                                            <div className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest">{s.label}</div>
                                            <div className={`text-sm sm:text-lg font-black ${s.color}`}>{s.val}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Sessions Table */}
                                <div className="space-y-3 sm:space-y-4">
                                    <h3 className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Details Breakdown</h3>
                                    <div className="space-y-2">
                                        {monthBookings.length === 0 ? (
                                            <div className="py-12 text-center text-white/10 uppercase text-[10px] font-black italic">No records for this month</div>
                                        ) : (
                                            monthBookings.map(b => (
                                                <div key={b.id} className="flex items-center justify-between p-3 sm:p-4 bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl hover:bg-white/[0.04] transition-all group">
                                                    <div className="flex items-center gap-3 sm:gap-4">
                                                        <div className="text-center min-w-[30px] sm:min-w-[40px]">
                                                            <div className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase">{format(parseISO(b.booking_date), 'EEE')}</div>
                                                            <div className="text-xs sm:text-sm font-black text-white">{format(parseISO(b.booking_date), 'dd')}</div>
                                                        </div>
                                                        <div className="h-6 sm:h-8 w-px bg-white/5" />
                                                        <div>
                                                            <div className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-tight">{b.time_slot.replace(/^0/, '')}</div>
                                                            <div className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-widest">{b.coach_name || 'Admin'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-[7px] sm:text-[8px] font-black uppercase mb-0.5 ${STATUS_CONFIG[b.status]?.color}`}>{b.status}</div>
                                                        <div className="text-[9px] sm:text-[10px] font-black text-primary">{b.amount ? `${b.amount} K` : '—'}</div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 sm:p-8 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest italic text-center sm:text-left">
                                    Generated for {monthBookings[0]?.student_name || 'Trainee'}
                                </div>
                                <button 
                                    onClick={() => window.print()}
                                    className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-white text-black font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-white/10"
                                >
                                    <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    Download PDF
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>            {/* Premium Dark Mode Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4; margin: 0; }
                    
                    /* Force Dark Mode for Print */
                    html, body { 
                        background: #050505 !important; 
                        color: #ffffff !important; 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    body * { visibility: hidden; }
                    
                    /* Show only the report container */
                    .fixed.inset-0.z-\\[100\\] { 
                        visibility: visible !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: #050505 !important;
                        display: block !important;
                        min-height: 100vh !important;
                    }

                    .fixed.inset-0.z-\\[100\\] * { visibility: visible !important; }
                    .fixed.inset-0.z-\\[100\\] .absolute.inset-0 { display: none !important; }
                    
                    /* Report Styling */
                    .fixed.inset-0.z-\\[100\\] .relative { 
                        position: relative !important;
                        margin: 0 !important;
                        padding: 20mm !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: #050505 !important;
                        box-sizing: border-box !important;
                        color: #ffffff !important;
                    }

                    /* Header Styling */
                    .border-b.border-white\\/5 { 
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                        background: rgba(255, 255, 255, 0.02) !important;
                        padding: 15mm !important;
                        margin: -20mm -20mm 10mm -20mm !important;
                        -webkit-print-color-adjust: exact;
                    }
                    
                    h2 { color: #ffffff !important; font-family: 'Inter', sans-serif !important; }
                    .text-primary { color: #d4af37 !important; -webkit-print-color-adjust: exact; } /* Gold */
                    
                    /* Card Styling */
                    .bg-white\\/\\[0\\.03\\], .bg-white\\/\\[0\\.02\\], .bg-white\\/\\[0\\.01\\] { 
                        background: rgba(255, 255, 255, 0.03) !important;
                        border: 1px solid rgba(255, 255, 255, 0.08) !important;
                        -webkit-print-color-adjust: exact;
                        border-radius: 16px !important;
                        color: #ffffff !important;
                    }

                    .text-white, .text-white\\/20, .text-white\\/40 { 
                        color: #ffffff !important; 
                    }
                    .text-white\\/30 { color: rgba(255, 255, 255, 0.4) !important; }

                    .text-emerald-400 { color: #34d399 !important; -webkit-print-color-adjust: exact; }
                    .text-amber-400 { color: #fbbf24 !important; -webkit-print-color-adjust: exact; }

                    /* Breakdown rows */
                    .flex.items-center.justify-between.p-4, 
                    .flex.items-center.justify-between.p-3 {
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                        background: rgba(255, 255, 255, 0.01) !important;
                        page-break-inside: avoid !important;
                        border-radius: 12px !important;
                        margin-bottom: 2mm !important;
                        -webkit-print-color-adjust: exact;
                    }

                    .h-6, .h-8 { background: rgba(255, 255, 255, 0.1) !important; }
                    
                    /* Utility */
                    button, .custom-scrollbar::-webkit-scrollbar { display: none !important; }
                    .overflow-y-auto { overflow: visible !important; height: auto !important; max-height: none !important; }
                    
                    /* Footer */
                    .border-t.border-white\\/5 {
                        border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
                        background: rgba(255, 255, 255, 0.02) !important;
                        margin: 10mm -20mm -20mm -20mm !important;
                        padding: 10mm !important;
                    }
                }
            `}} />
        </div>
    );
}
