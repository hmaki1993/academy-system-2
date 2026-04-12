import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import {
    format,
    parseISO,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    addMonths,
    subMonths
} from 'date-fns';
import {
    CalendarDays, Settings2, Plus, X, Save, ChevronLeft, ChevronRight,
    Clock, Search, RefreshCw, Trash2, Calendar, ArrowRight, User,
    CheckCircle2, XCircle, AlertCircle, ChevronDown, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { useNavigate, useSearchParams } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

// --- Custom Premium Dropdown ---
const StatusDropdown = ({ currentStatus, onUpdate }: { currentStatus: string, onUpdate: (s: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [
        { value: 'pending', label: 'PENDING', icon: AlertCircle, color: 'text-amber-400' },
        { value: 'confirmed', label: 'CONFIRM', icon: CheckCircle2, color: 'text-emerald-400' },
        { value: 'cancelled', label: 'CANCEL', icon: XCircle, color: 'text-red-400' },
        { value: 'completed', label: 'DONE', icon: CheckCircle2, color: 'text-blue-400' },
    ];

    const currentOption = options.find(o => o.value === currentStatus) || options[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest ${currentOption.color}`}
            >
                <currentOption.icon className="w-3.5 h-3.5" />
                {currentOption.label}
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-40 bg-[#0E1D21]/95 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1.5 space-y-1">
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    onUpdate(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest ${opt.value === currentStatus ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                            >
                                <opt.icon className={`w-3.5 h-3.5 ${opt.color}`} />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Premium Scrolling Time Picker (iPhone-style)
function CustomTimePicker({ value, onChange, label }: { value: string; onChange: (val: string) => void; label?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const hourRef = useRef<HTMLDivElement>(null);
    const minRef = useRef<HTMLDivElement>(null);

    // Internal state to track changes before confirmation
    const [internalH, setInternalH] = useState(9);
    const [internalM, setInternalM] = useState(0);
    const [internalPM, setInternalPM] = useState(false);

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10... 55

    // Sync internal state and scroll positions when opening
    useEffect(() => {
        if (isOpen) {
            const timePart = value || '09:00 AM';
            const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
            
            let h = 9, m = 0, isPM = false;
            if (match) {
                h = parseInt(match[1]);
                m = Math.round(parseInt(match[2]) / 5) * 5; // Round to nearest 5
                isPM = match[3].toUpperCase() === 'PM';
            }
            
            setInternalH(h);
            setInternalM(m);
            setInternalPM(isPM);

            // Scroll to positions
            setTimeout(() => {
                const itemHeight = 56;
                if (hourRef.current) {
                    const hIdx = hours.indexOf(h);
                    if (hIdx !== -1) hourRef.current.scrollTop = hIdx * itemHeight;
                }
                if (minRef.current) {
                    const mIdx = minutes.indexOf(m);
                    if (mIdx !== -1) minRef.current.scrollTop = mIdx * itemHeight;
                }
            }, 100);
        }
    }, [isOpen, value]);

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        const hStr = internalH.toString().padStart(2, '0');
        const mStr = internalM.toString().padStart(2, '0');
        const mode = internalPM ? 'PM' : 'AM';
        const finalTime = `${hStr}:${mStr} ${mode}`;

        onChange(finalTime);
        setIsOpen(false);
    };

    // Auto-detect centered item on scroll
    const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'h' | 'm') => {
        const container = e.currentTarget;
        const itemHeight = 56;
        const index = Math.round(container.scrollTop / itemHeight);

        if (type === 'h') {
            const val = hours[index];
            if (val && val !== internalH) setInternalH(val);
        } else {
            const val = minutes[index];
            if (val !== undefined && val !== internalM) setInternalM(val);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(true)}
                className={`w-full bg-white/[0.02] border border-white/5 rounded-2xl px-3 py-3 sm:px-6 sm:py-4 text-base sm:text-xl font-black text-white hover:border-primary/50 transition-all flex items-center justify-center gap-2 sm:gap-4 active:scale-95 ${isOpen ? 'border-primary/60 bg-primary/5 shadow-[0_0_30px_rgba(212,175,55,0.15)]' : ''}`}
            >
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="tracking-widest">{value || '09:00 AM'}</span>
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {/* Light Transparent Backdrop */}
                    <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-md" onClick={() => setIsOpen(false)} />

                    <div className="relative z-[10000] w-full max-w-[280px] p-6 rounded-[2.5rem] border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Animated Background Accent */}
                        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 blur-[60px] animate-pulse pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Select Time</span>
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                    {['AM', 'PM'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setInternalPM(mode === 'PM')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${(mode === 'PM' && internalPM) || (mode === 'AM' && !internalPM) ? 'bg-primary text-black' : 'text-white/20 hover:text-white/40'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative flex items-center justify-center h-40 bg-white/[0.02] rounded-3xl border border-white/10 overflow-hidden">
                                {/* Glass Selection Guides */}
                                <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-12 bg-primary/10 border-y border-primary/20 rounded-xl pointer-events-none" />
                                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#0A0A0A]/20 to-transparent z-20 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0A0A0A]/20 to-transparent z-20 pointer-events-none" />

                                <div className="flex items-center gap-0 w-full px-4">
                                    {/* Hours Selection */}
                                    <div 
                                        ref={hourRef}
                                        onScroll={(e) => {
                                            const idx = Math.round(e.currentTarget.scrollTop / 40);
                                            if (hours[idx] && hours[idx] !== internalH) setInternalH(hours[idx]);
                                        }}
                                        className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar h-40 py-[60px]"
                                    >
                                        {hours.map(h => (
                                            <div key={h} className={`h-10 flex items-center justify-center snap-center text-lg font-black transition-all ${internalH === h ? 'text-primary scale-125' : 'text-white/10 text-sm'}`}>
                                                {h.toString().padStart(2, '0')}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="text-primary/30 font-black text-xl mb-1">:</div>

                                    {/* Minutes Selection */}
                                    <div 
                                        ref={minRef}
                                        onScroll={(e) => {
                                            const idx = Math.round(e.currentTarget.scrollTop / 40);
                                            if (minutes[idx] !== undefined && minutes[idx] !== internalM) setInternalM(minutes[idx]);
                                        }}
                                        className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar h-40 py-[60px]"
                                    >
                                        {minutes.map(m => (
                                            <div key={m} className={`h-10 flex items-center justify-center snap-center text-lg font-black transition-all ${internalM === m ? 'text-primary scale-125' : 'text-white/10 text-sm'}`}>
                                                {m.toString().padStart(2, '0')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirm}
                                className="w-full py-4.5 bg-primary text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] active:scale-95 transition-all shadow-[0_15px_40px_rgba(212,175,55,0.25)]"
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default function PTAvailabilityAdmin() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'availability' | 'bookings' | 'analytics'>(
        (searchParams.get('tab') as any) || 'availability'
    );

    // Sync state to local state if search param changes
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && (tab === 'availability' || tab === 'bookings' || tab === 'analytics')) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Update URL when tab changes manually
    const handleTabChange = (tab: 'availability' | 'bookings' | 'analytics') => {
        setActiveTab(tab);
        setSearchParams({ tab }, { replace: true });
    };

    // Calendar & Selection State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCoach, setSelectedCoach] = useState<string>('');
    const [coaches, setCoaches] = useState<any[]>([]);

    // Availability state
    const [availabilityList, setAvailabilityList] = useState<any[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ptRate, setPtRate] = useState<number>(0);
    const [savingRate, setSavingRate] = useState(false);

    // Add slot state
    const [startTime, setStartTime] = useState('05:00 PM');
    const [endTime, setEndTime] = useState('06:00 PM');

    // Bookings state
    const [bookings, setBookings] = useState<any[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchBooking, setSearchBooking] = useState('');

    useEffect(() => {
        fetchCoaches();
        fetchBookings();

        // Realtime Subscription for Bookings
        const channel = supabase
            .channel('admin_bookings_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'pt_bookings' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        fetchBookings();
                    } else if (payload.eventType === 'DELETE') {
                        setBookings(prev => prev.filter(b => b.id !== payload.old.id));
                    } else if (payload.eventType === 'UPDATE') {
                        setBookings(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (selectedCoach) fetchAvailability();
    }, [selectedCoach]);

    useEffect(() => {
        fetchBookings();
    }, [currentMonth]);

    // Helper to convert time string to minutes for comparison
    const timeToMinutes = (timeStr: string) => {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const isPM = match[3].toUpperCase() === 'PM';
        if (h === 12) h = 0;
        return (h * 60) + m + (isPM ? 720 : 0);
    };

    // Helper to add minutes to a time string
    const addMinutesToTime = (timeStr: string, minsToAdd: number) => {
        let totalMins = timeToMinutes(timeStr) + minsToAdd;
        totalMins = totalMins % 1440; // Wrap around 24h
        const h24 = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        const isPM = h24 >= 12;
        let h12 = h24 % 12;
        if (h12 === 0) h12 = 12;
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
    };

    const handleStartTimeChange = (newVal: string) => {
        setStartTime(newVal);
        const startMins = timeToMinutes(newVal);
        const endMins = timeToMinutes(endTime);

        // If end time is before or same as start time, bump end time by 1 hour
        if (endMins <= startMins) {
            setEndTime(addMinutesToTime(newVal, 60));
        }
    };

    const fetchCoaches = async () => {
        const { data } = await supabase.from('coaches').select('id, full_name, pt_rate').order('full_name');
        setCoaches(data || []);
        if (data && data.length > 0) {
            const adminCoach = data.find(c => c.full_name?.toUpperCase() === 'ADMIN');
            const adminId = adminCoach ? adminCoach.id : data[0].id;
            setSelectedCoach(adminId);
            if (adminCoach) setPtRate(adminCoach.pt_rate || 0);
        }
    };

    const updatePtRate = async () => {
        if (!selectedCoach) return;
        setSavingRate(true);
        const { error } = await supabase
            .from('coaches')
            .update({ pt_rate: ptRate })
            .eq('id', selectedCoach);
        
        if (error) {
            toast.error('Failed to update rate');
        } else {
            toast.success('Session price updated');
            fetchCoaches(); // Refresh
        }
        setSavingRate(false);
    };

    const fetchAvailability = async () => {
        if (!selectedCoach) return;
        setLoadingAvailability(true);
        const { data } = await supabase
            .from('pt_availability')
            .select('*')
            .eq('coach_id', selectedCoach);

        setAvailabilityList(data || []);
        setLoadingAvailability(false);
    };

    const fetchBookings = async () => {
        setLoadingBookings(true);

        // Fetch 3 months of data (prev, current, next) to ensure accurate indicators
        const start = format(startOfMonth(subMonths(currentMonth, 1)), 'yyyy-MM-dd');
        const end = format(endOfMonth(addMonths(currentMonth, 1)), 'yyyy-MM-dd');

        const { data } = await supabase
            .from('pt_bookings')
            .select('*, coaches(full_name)')
            .gte('booking_date', start)
            .lte('booking_date', end)
            .order('booking_date', { ascending: false });
        setBookings(data || []);
        setLoadingBookings(false);
    };

    // Calendar Logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getDayData = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return availabilityList.find(a => a.specific_date === dateStr);
    };

    const handleSaveDay = async (date: Date, slots: string[], active: boolean) => {
        if (!selectedCoach) return;
        const dateStr = format(date, 'yyyy-MM-dd');
        const existing = getDayData(date);

        setSaving(true);
        try {
            const payload = {
                coach_id: selectedCoach,
                specific_date: dateStr,
                time_slots: slots,
                is_active: active
            };

            let res;
            if (existing) {
                res = await supabase
                    .from('pt_availability')
                    .update(payload)
                    .eq('id', existing.id);
            } else {
                res = await supabase
                    .from('pt_availability')
                    .insert(payload);
            }

            if (res.error) throw res.error;
            toast.success('Availability Updated');
            fetchAvailability();
        } catch (e: any) {
            toast.error('Failed to save: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleDayStatus = async () => {
        const data = getDayData(selectedDate);
        const newStatus = data ? !data.is_active : true;
        const currentSlots = data ? data.time_slots : [];
        await handleSaveDay(selectedDate, currentSlots, newStatus);
    };

    const addSlot = async () => {
        const startMins = timeToMinutes(startTime);
        const endMins = timeToMinutes(endTime);

        if (endMins <= startMins) {
            return toast.error('End time must be after start time');
        }

        const val = `${startTime} - ${endTime}`;
        const data = getDayData(selectedDate);
        const currentSlots = data ? [...data.time_slots] : [];
        if (currentSlots.includes(val)) return toast.error('Slot exists');

        const newSlots = [...currentSlots, val].sort((a, b) => {
            try {
                const t1 = new Date("1970/01/01 " + a.split(' - ')[0]);
                const t2 = new Date("1970/01/01 " + b.split(' - ')[0]);
                return t1.getTime() - t2.getTime();
            } catch (e) { return 0; }
        });
        await handleSaveDay(selectedDate, newSlots, true);
    };

    const toggleSlotActive = async (slotStr: string) => {
        if (!selectedDayData) return;

        const isInactive = slotStr.includes('|inactive');
        const baseSlot = slotStr.split('|')[0];
        const updatedSlots = selectedDayData.time_slots.map((s: string) => {
            if (s.split('|')[0] === baseSlot) {
                return isInactive ? baseSlot : `${baseSlot}|inactive`;
            }
            return s;
        });

        // Optimistic update
        setAvailabilityList(prev => prev.map(a => 
            isSameDay(parseISO(a.specific_date || ''), selectedDate) 
                ? { ...a, time_slots: updatedSlots } 
                : a
        ));

        const { error } = await supabase
            .from('pt_availability')
            .update({ time_slots: updatedSlots })
            .eq('id', selectedDayData.id);

        if (error) {
            console.error('Update failed:', error);
            fetchAvailability();
        }
    };

    const removeSlot = async (slot: string) => {
        const data = getDayData(selectedDate);
        if (!data) return;
        const newSlots = data.time_slots.filter((s: string) => s !== slot);
        await handleSaveDay(selectedDate, newSlots, data.is_active);
    };

    const updateBookingStatus = async (id: string, status: string) => {
        const { error } = await supabase.from('pt_bookings').update({ status }).eq('id', id);
        if (error) return toast.error('Update failed');
        toast.success('Status updated');
        fetchBookings();
    };

    const deleteBooking = async (id: string) => {
        // Optimistic Update: Remove from local state immediately
        setBookings(prev => prev.filter(b => b.id !== id));

        const { error } = await supabase.from('pt_bookings').delete().eq('id', id);
        if (error) {
            toast.error('Delete failed');
            fetchBookings(); // Rollback if error
        } else {
            toast.success('Booking deleted');
        }
    };

    const filteredBookings = bookings.filter(b => {
        const matchCoach = b.coach_id === selectedCoach; // Admin only
        const matchStatus = !filterStatus || b.status === filterStatus;
        const matchSearch = !searchBooking ||
            b.student_name?.toLowerCase().includes(searchBooking.toLowerCase());
        return matchCoach && matchStatus && matchSearch;
    });

    // --- Analytics Calculation (Focus: Monthly Performance) ---
    const monthlyBookings = bookings.filter(b => isSameMonth(parseISO(b.booking_date), currentMonth));
    const confirmedRevenue = monthlyBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);
    
    const stats = {
        total: monthlyBookings.length,
        confirmed: monthlyBookings.filter(b => b.status === 'confirmed').length,
        completed: monthlyBookings.filter(b => b.status === 'completed').length,
        pending: monthlyBookings.filter(b => b.status === 'pending').length,
        cancelled: monthlyBookings.filter(b => b.status === 'cancelled').length,
        students: new Set(monthlyBookings.map(b => b.student_id)).size
    };

    const completionRate = stats.total > 0 
        ? Math.round(((stats.confirmed + stats.completed) / stats.total) * 100) 
        : 0;

    const selectedDayData = getDayData(selectedDate);

    return (
        <div className="p-4 sm:p-8 lg:py-12 max-w-[1600px] mx-auto space-y-10 lg:space-y-16 animate-in fade-in duration-500">
            <div className="mb-2">
                <PageHeader title="PT Management" subtitle="Availability & Bookings Control" />
            </div>

            {/* Tabs - Sleek Minimalist Style */}
            <div className="flex justify-center mb-12">
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
                    {([
                        { id: 'availability', label: 'Availability', icon: Settings2 },
                        { id: 'bookings', label: 'Bookings', icon: CalendarDays },
                        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ===================== TAB: ANALYTICS ===================== */}
            {activeTab === 'analytics' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                {format(currentMonth, 'MMMM')} <span className="text-primary italic">Analytics</span>
                            </h3>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Performance summary</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>

                    {/* Glassmorphism Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Revenue', value: `${confirmedRevenue} KWD`, sub: 'Confirmed Sales', icon: Calendar, color: 'text-emerald-400' },
                            { label: 'Total PT', value: stats.total, sub: `${stats.confirmed} Active`, icon: Clock, color: 'text-primary' },
                            { label: 'Students', value: stats.students, sub: 'Unique users', icon: User, color: 'text-blue-400' },
                            { label: 'Efficiency', value: `${completionRate}%`, sub: 'Confirmed sessions', icon: CheckCircle2, color: 'text-amber-400' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 backdrop-blur-3xl hover:bg-white/[0.04] transition-all duration-500">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className={`w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">{format(currentMonth, 'MMM')}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-white tracking-tighter italic">{stat.value}</h2>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{stat.label}</p>
                                    </div>
                                    <p className="text-[8px] font-black text-white/10 uppercase tracking-widest pt-4 border-t border-white/5">{stat.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts & Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
                        <div className="lg:col-span-2 bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-10">Status Distribution</h4>
                            <div className="space-y-8">
                                {[
                                    { label: 'Confirmed', count: stats.confirmed, color: 'bg-emerald-400', total: stats.total },
                                    { label: 'Pending', count: stats.pending, color: 'bg-amber-400', total: stats.total },
                                    { label: 'Cancelled', count: stats.cancelled, color: 'bg-red-400', total: stats.total },
                                ].map((bar, i) => {
                                    const percent = bar.total > 0 ? (bar.count / bar.total) * 100 : 0;
                                    return (
                                        <div key={i} className="space-y-3">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-white/40">{bar.label}</span>
                                                <span className="text-white">{bar.count} ({Math.round(percent)}%)</span>
                                            </div>
                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full ${bar.color} rounded-full transition-all duration-700`} style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quick Insight */}
                        <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-10 flex flex-col justify-center">
                            <h4 className="text-xl font-black text-white uppercase tracking-tighter italic mb-4">Focus</h4>
                            <p className="text-[11px] font-medium text-white/50 leading-relaxed mb-6">
                                Based on this month's data, your completion rate is <span className="text-primary">{completionRate}%</span>. 
                                Most bookings are processed successfully. Watch the pending queue to maintain momentum.
                            </p>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Top Goal</div>
                                <div className="text-xs font-black text-white uppercase">Increase Revenue by 10%</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== TAB: AVAILABILITY ===================== */}
            {activeTab === 'availability' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 min-h-[60vh]">

                    {/* Left: Calendar */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h4 className="text-xl font-black uppercase tracking-tighter text-white font-display">
                                {format(currentMonth, 'MMMM yyyy')}
                            </h4>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                <div key={d} className="h-10 flex items-center justify-center text-[10px] font-black text-white/30 uppercase tracking-widest">{d}</div>
                            ))}
                            {calendarDays.map((day, i) => {
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrMonth = isSameMonth(day, monthStart);
                                const dayData = getDayData(day);
                                const hasSlots = dayData && dayData.time_slots?.length > 0;
                                const isActive = dayData ? dayData.is_active : false;

                                // Calculate if fully booked
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const dayBookings = bookings.filter(b => b.booking_date === dateStr && b.status !== 'cancelled');
                                const isFull = hasSlots && dayData.time_slots.every((slot: string) =>
                                    dayBookings.some(b => b.time_slot === slot)
                                );

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDate(day)}
                                        className={`relative h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 mx-auto flex flex-col items-center justify-center rounded-full transition-all duration-300
                                            ${isSelected
                                                ? 'bg-primary/20 border-2 border-primary/50 text-white shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                                                : 'hover:bg-white/5 border border-transparent text-white/60'}
                                            ${!isCurrMonth ? 'opacity-5 pointer-events-none' : 'opacity-100'}
                                            ${hasSlots && !isSelected ? (isFull ? 'border-rose-500/30 bg-rose-500/5' : (isActive ? 'border-primary/20 bg-primary/5' : 'border-white/5 bg-white/[0.02]')) : ''}
                                        `}
                                    >
                                        <span className={`text-sm font-black ${isFull && !isSelected ? 'text-rose-500/60' : ''}`}>{format(day, 'd')}</span>
                                        {hasSlots && !isSelected && (
                                            <div className={`absolute bottom-2 w-1 h-1 rounded-full ${isFull ? 'bg-rose-500 animate-pulse' : (isActive ? 'bg-primary' : 'bg-white/20')}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Slots Manager */}
                    <div className="lg:col-span-5 pl-0 lg:pl-12 pt-6 lg:pt-0 space-y-10">
                        {/* Session Price Setting */}
                        <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-6 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Session Price</p>
                                    <h4 className="text-xl font-black text-white uppercase tracking-tighter">Set PT Rate</h4>
                                </div>
                                <div className="text-2xl font-black text-primary italic">
                                    {ptRate} <span className="text-[10px] not-italic opacity-40">KWD</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="relative flex-1 group">
                                    <input 
                                        type="number"
                                        value={ptRate === 0 ? '' : ptRate}
                                        onChange={(e) => setPtRate(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-lg font-black text-white hover:border-primary/30 transition-all outline-none focus:border-primary focus:bg-white/10"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-widest">KWD</span>
                                </div>
                                <button
                                    onClick={updatePtRate}
                                    disabled={savingRate}
                                    className="px-6 bg-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(var(--primary-rgb),0.2)]"
                                >
                                    {savingRate ? '...' : 'SAVE'}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pb-4 border-b border-white/5">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Editing Schedule</p>
                                <h4 className="text-2xl font-black text-white uppercase tracking-tighter">{format(selectedDate, 'EEEE, MMM d')}</h4>
                            </div>
                            <button
                                onClick={toggleDayStatus}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedDayData?.is_active
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                                    }`}
                            >
                                {selectedDayData?.is_active ? 'ACTIVE' : 'NOT ACTIVE'}
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Time Slots</label>
                                {selectedDayData && selectedDayData.time_slots?.length > 0 && selectedDayData.time_slots.every((slot: string) =>
                                    bookings.filter(b => b.booking_date === format(selectedDate, 'yyyy-MM-dd') && b.status !== 'cancelled')
                                        .some(b => b.time_slot === slot)
                                ) && (
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 animate-pulse">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Day Fully Booked</span>
                                        </div>
                                    )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {selectedDayData?.time_slots.map((slotStr: string) => {
                                    const isInactive = slotStr.includes('|inactive');
                                    const slot = slotStr.split('|')[0];
                                    const isBooked = bookings.filter(b => b.booking_date === format(selectedDate, 'yyyy-MM-dd') && b.status !== 'cancelled')
                                        .some(b => b.time_slot === slot);

                                    return (
                                        <div key={slotStr} className={`flex items-center gap-4 border px-3 py-2 rounded-xl group transition-all w-fit ${
                                            isBooked 
                                                ? 'bg-rose-500/[0.03] border-rose-500/20 opacity-80' 
                                                : isInactive
                                                    ? 'bg-rose-500/[0.02] border-rose-500/20 opacity-60'
                                                    : 'bg-white/[0.02] border-white/5 hover:border-primary/30'
                                        }`}>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => !isBooked && toggleSlotActive(slotStr)}
                                                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                                                        isBooked
                                                            ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                                                            : isInactive
                                                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    }`}
                                                >
                                                    {isBooked ? 'Booked' : isInactive ? 'Not Active' : 'Active'}
                                                </button>

                                                <div className="flex items-center gap-2.5">
                                                    <Clock className={`w-3.5 h-3.5 transition-colors ${isBooked || isInactive ? 'text-rose-500/40' : 'text-primary/40 group-hover:text-primary'}`} />
                                                    <span className={`text-[12px] font-black uppercase tracking-[0.1em] transition-colors ${isBooked ? 'text-rose-500/60 line-through' : isInactive ? 'text-rose-500/60' : 'text-white group-hover:text-primary'}`}>{slot}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeSlot(slotStr)}
                                                className={`w-7 h-7 flex items-center justify-center transition-all ${isBooked ? 'bg-rose-500/10 text-rose-500/20 hover:text-rose-500 hover:bg-rose-500/20' : 'hover:bg-rose-500/20 text-white/20 hover:text-rose-500'} border border-transparent hover:border-rose-500/30 rounded-full active:scale-90 shrink-0`}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                                {(!selectedDayData || selectedDayData.time_slots.length === 0) && (
                                    <div className="w-full py-10 text-center animate-in fade-in zoom-in-95 duration-500">
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-500/30 flex items-center justify-center gap-2">
                                            <XCircle className="w-4 h-4" />
                                            No slots defined for this day
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 pt-6 mt-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">ADD TIME RANGE</label>
                                    <div className="h-px flex-1 bg-white/5 ml-4" />
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <CustomTimePicker
                                                label="START TIME"
                                                value={startTime}
                                                onChange={handleStartTimeChange}
                                            />
                                        </div>
                                        <div className="text-white/20">
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <CustomTimePicker
                                                label="END TIME"
                                                value={endTime}
                                                onChange={(val) => setEndTime(val)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={addSlot}
                                        disabled={saving}
                                        className="w-fit mx-auto px-8 py-3.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-2xl transition-all disabled:opacity-50 font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2 mt-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        ADD SLOT TO CALENDAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== TAB: BOOKINGS ===================== */}
            {activeTab === 'bookings' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                    {/* Premium Filters Section */}
                    <div className="flex justify-center mb-10">
                        <div className="relative group">
                            <div 
                                className="flex items-center gap-4 px-8 py-3.5 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[1.5rem] hover:border-primary/40 hover:bg-white/[0.05] transition-all duration-500 min-w-[240px] cursor-pointer"
                                onClick={() => {
                                    const el = document.getElementById('premium-filter-menu');
                                    if (el) el.classList.toggle('hidden');
                                }}
                            >
                                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_15px_rgba(212,175,55,0.8)] animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
                                    {filterStatus || 'ALL STATUSES'}
                                </span>
                                <ChevronRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-primary transition-all rotate-90" />
                            </div>

                            {/* Premium Dropdown Menu */}
                            <div id="premium-filter-menu" className="hidden absolute top-full left-0 right-0 mt-3 p-2 bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.9)] z-[100] animate-in fade-in zoom-in-95 duration-300">
                                {['', 'pending', 'confirmed', 'cancelled', 'completed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setFilterStatus(status);
                                            document.getElementById('premium-filter-menu')?.classList.add('hidden');
                                        }}
                                        className={`w-full text-left px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {status || 'ALL STATUSES'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bookings Table */}
                    <div className="space-y-4 pb-32">
                        {loadingBookings ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            </div>
                        ) : filteredBookings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-white/20 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
                                <Calendar className="w-12 h-12 mb-3 opacity-20" />
                                <span className="text-xs font-black uppercase tracking-[0.3em]">No bookings found</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredBookings.map(b => (
                                    <div
                                        key={b.id}
                                        className="group bg-transparent border border-white/5 rounded-[1.5rem] p-5 hover:bg-white/[0.02] hover:border-primary/20 transition-all duration-300 relative"
                                    >
                                        <div className="space-y-5">
                                            {/* Header: Status & X on Right */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: STATUS_COLORS[b.status]?.split(' ')[1].split('-')[1] || 'white' }} />
                                                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${STATUS_COLORS[b.status]?.split(' ')[1] || 'text-white/40'}`}>
                                                        {b.status}
                                                    </span>
                                                </div>
                                                {(b.status === 'pending' || b.status === 'cancelled') && (
                                                    <button
                                                        onClick={() => deleteBooking(b.id)}
                                                        className="w-7 h-7 flex items-center justify-center hover:bg-rose-500/20 active:bg-rose-500/30 rounded-full text-white/20 hover:text-rose-500 transition-all active:scale-90 border border-transparent hover:border-rose-500/30 shrink-0"
                                                        title="Delete"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Main Info Stack */}
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-black text-white tracking-tight uppercase italic">
                                                    {format(parseISO(b.booking_date), 'EEEE, MMM d')}
                                                </h4>
                                                <div className="flex items-center gap-2 text-primary">
                                                    <Clock className="w-3.5 h-3.5 opacity-50" />
                                                    <span className="text-base font-black tracking-tighter italic">
                                                        {b.time_slot.replace(/^0/, '')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Details Row */}
                                            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight text-white/60">
                                                <div className="flex items-center gap-2 text-white">
                                                    <User className="w-3.5 h-3.5 opacity-30" />
                                                    {b.student_name || 'Anonymous'}
                                                </div>
                                                <div className="opacity-40 italic">
                                                    {b.payment_method || '—'}
                                                </div>
                                            </div>

                                            {/* Actions / Footer */}
                                            <div className="pt-2 flex items-center justify-between gap-4 border-t border-white/5">
                                                <div className="text-[10px] font-black text-white/40 italic">
                                                    {b.amount ? `${b.amount} KUD` : '—'}
                                                </div>
                                                <StatusDropdown
                                                    currentStatus={b.status}
                                                    onUpdate={(newStatus) => updateBookingStatus(b.id, newStatus)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
