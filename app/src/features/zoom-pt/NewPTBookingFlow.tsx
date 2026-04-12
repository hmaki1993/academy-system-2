import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, ChevronRight, ChevronLeft, CheckCircle2,
    Loader2, User, Dumbbell, X, ArrowLeft, CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    addMonths, subMonths, isSameDay, isToday, getDay,
    isBefore, startOfDay, addDays
} from 'date-fns';

// ---------- types ----------
interface Coach {
    id: string;
    full_name: string;
    specialty?: string;
    pt_rate?: number;
}
interface DayAvailability {
    active: boolean;
    slots: string[];
}

interface NewPTBookingFlowProps {
    onSuccess: () => void;
    onBack?: () => void;
}

export default function NewPTBookingFlow({ onSuccess, onBack }: NewPTBookingFlowProps) {
    const [step, setStep] = useState(1);

    // Step 1 data
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
    const [availability, setAvailability] = useState<Record<number, DayAvailability>>({});
    const [loadingAvail, setLoadingAvail] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState('');

    // Step 2 data
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [studentName, setStudentName] = useState('');
    const [studentId, setStudentId] = useState<string | null>(null);

    // Fetch coaches on mount + get current user
    useEffect(() => {
        fetchCoaches();
        fetchCurrentUser();
    }, []);

    // Fetch availability when coach changes + Realtime subscription
    useEffect(() => {
        if (selectedCoach) {
            fetchAvailability(selectedCoach.id);

            const channel = supabase
                .channel('pt_booking_sync_unified')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'pt_availability', filter: `coach_id=eq.${selectedCoach.id}` },
                    () => fetchAvailability(selectedCoach.id)
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'pt_bookings', filter: `coach_id=eq.${selectedCoach.id}` },
                    () => fetchAvailability(selectedCoach.id)
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedCoach?.id]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setStudentId(user.id);
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .maybeSingle();
            if (profile?.full_name) setStudentName(profile.full_name);
        }
    };

    const fetchCoaches = async () => {
        const { data } = await supabase
            .from('coaches')
            .select('id, full_name, specialty, pt_rate')
            .order('full_name');
        
        const filtered = data || [];
        setCoaches(filtered);
        
        const admin = filtered.find(c => c.full_name?.toUpperCase() === 'ADMIN');
        if (admin && !selectedCoach) {
            setSelectedCoach(admin);
        } else if (filtered.length > 0 && !selectedCoach) {
            setSelectedCoach(filtered[0]);
        }
    };

    const [availabilityList, setAvailabilityList] = useState<any[]>([]);
    const [existingBookings, setExistingBookings] = useState<any[]>([]);

    const fetchAvailability = async (coachId: string) => {
        setLoadingAvail(true);
        const [availRes, bookingsRes] = await Promise.all([
            supabase
                .from('pt_availability')
                .select('*')
                .eq('coach_id', coachId)
                .eq('is_active', true),
            supabase
                .from('pt_bookings')
                .select('booking_date, time_slot')
                .eq('coach_id', coachId)
                .neq('status', 'cancelled')
        ]);

        setAvailabilityList(availRes.data || []);
        setExistingBookings(bookingsRes.data || []);
        setLoadingAvail(false);
    };

    const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    const startBlanks = getDay(startOfMonth(currentMonth));
    const today = startOfDay(new Date());

    const isDayAvailable = (day: Date) => {
        if (isBefore(day, today)) return false;
        const dateStr = format(day, 'yyyy-MM-dd');
        const isDayToday = dateStr === format(new Date(), 'yyyy-MM-dd');
        const now = new Date();

        const dateRecord = availabilityList.find(a => a.specific_date === dateStr);
        let rawSlots = [];
        if (dateRecord) {
            if (!dateRecord.is_active) return false;
            rawSlots = (dateRecord.time_slots || []).filter((s: string) => !s.includes('|inactive'));
        } else {
            const dow = getDay(day);
            const weeklyRecord = availabilityList.find(a => a.day_of_week === dow && !a.specific_date);
            if (!weeklyRecord?.is_active) return false;
            rawSlots = (weeklyRecord.time_slots || []).filter((s: string) => !s.includes('|inactive'));
        }

        if (rawSlots.length === 0) return false;

        // Check if any slot is actually available (not booked and not in the past if today)
        return rawSlots.some((slot: any) => {
            const isBooked = existingBookings.some(b => 
                b.booking_date === dateStr && b.time_slot === slot
            );
            if (isBooked) return false;

            if (isDayToday) {
                try {
                    const [time, period] = slot.split(' ');
                    const [hours, minutes] = time.split(':');
                    let hourNum = parseInt(hours);
                    if (period === 'PM' && hourNum !== 12) hourNum += 12;
                    if (period === 'AM' && hourNum === 12) hourNum = 0;
                    const slotTime = new Date();
                    slotTime.setHours(hourNum, parseInt(minutes), 0, 0);
                    return slotTime > now;
                } catch (e) {
                    return true;
                }
            }
            return true;
        });
    };

    const slotsForSelectedDate = selectedDate
        ? (() => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
            const now = new Date();
            const dateRecord = availabilityList.find(a => a.specific_date === dateStr);
            let rawSlots = [];
            if (dateRecord) {
                rawSlots = (dateRecord.time_slots || []).filter((s: string) => !s.includes('|inactive'));
            } else {
                const dow = getDay(selectedDate);
                const weeklyRecord = availabilityList.find(a => a.day_of_week === dow && !a.specific_date);
                rawSlots = (weeklyRecord?.time_slots || []).filter((s: string) => !s.includes('|inactive'));
            }

            return rawSlots.filter((slot: any) => {
                const isBooked = existingBookings.some(b => 
                    b.booking_date === dateStr && b.time_slot === slot
                );
                if (isBooked) return false;
                if (isToday) {
                    try {
                        const [time, period] = slot.split(' ');
                        const [hours, minutes] = time.split(':');
                        let hourNum = parseInt(hours);
                        if (period === 'PM' && hourNum !== 12) hourNum += 12;
                        if (period === 'AM' && hourNum === 12) hourNum = 0;
                        const slotTime = new Date();
                        slotTime.setHours(hourNum, parseInt(minutes), 0, 0);
                        return slotTime > now;
                    } catch (e) {
                        return true; 
                    }
                }
                return true;
            });
        })()
        : [];

    const [paymentError, setPaymentError] = useState<string | null>(null);

    const handlePayment = async () => {
        if (!paymentMethod) return toast.error('Please select a payment method');
        if (!selectedCoach || !selectedDate || !selectedTime) return toast.error('Missing booking details');

        setIsProcessing(true);
        setPaymentError(null);

        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            
            // 1. Double check conflict one last time
            const { data: conflict } = await supabase
                .from('pt_bookings')
                .select('id')
                .eq('coach_id', selectedCoach.id)
                .eq('booking_date', dateStr)
                .eq('time_slot', selectedTime)
                .neq('status', 'cancelled')
                .maybeSingle();

            if (conflict) {
                setIsProcessing(false);
                setPaymentError('This slot was just taken by another trainee.');
                fetchAvailability(selectedCoach.id);
                return;
            }

            // 2. Perform the booking (Simulation of payment success)
            const { error: bookingError } = await supabase.from('pt_bookings').insert({
                coach_id: selectedCoach.id,
                student_id: studentId,
                student_name: studentName,
                booking_date: dateStr,
                time_slot: selectedTime,
                status: 'pending',
                payment_method: paymentMethod,
                amount: selectedCoach.pt_rate || 0,
            });

            if (bookingError) throw bookingError;

            // --- NEW: Notify Admin about the PT booking ---
            await supabase.from('notifications').insert({
                title: 'New PT Mission Booked',
                message: `Trainee ${studentName} has just booked a PT session for ${dateStr} at ${selectedTime}.`,
                type: 'student',
                target_role: 'admin'
            });

            // Success Transition
            setTimeout(() => {
                setIsProcessing(false);
                setStep(3);
                toast.success('Booking requested successfully!');
            }, 1500);

        } catch (e: any) {
            setIsProcessing(false);
            setPaymentError(e.message || 'Payment was declined. Please check your card or try another method.');
            toast.error('Transaction Failed');
        }
    };

    const canGoToStep2 = selectedCoach && selectedDate && selectedTime;

    return (
        <div className="max-w-xl mx-auto py-4 relative">
            {onBack && (
                <button 
                    onClick={onBack}
                    className="absolute -top-2 -right-2 p-2 text-white/20 hover:text-white hover:bg-white/10 rounded-xl transition-all z-50 group"
                >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            )}
            {/* Premium Step Progress Indicator */}
            <div className="flex items-center justify-center mb-12 relative px-4 text-center">
                
                {[1, 2, 3].map((i) => {
                    const isActive = step === i;
                    const isCompleted = step > i;
                    
                    return (
                        <React.Fragment key={i}>
                            <div className="relative z-10 flex flex-col items-center group">
                                <div className={`
                                    w-9 h-9 rounded-full flex items-center justify-center font-black text-[10px] transition-all duration-700 relative
                                    ${isActive 
                                        ? 'bg-primary/20 text-primary border-2 border-primary scale-110 shadow-[0_0_30px_rgba(var(--primary-rgb,212,175,55),0.4)]' 
                                        : isCompleted
                                            ? 'bg-primary/20 text-primary border border-primary/40 backdrop-blur-md'
                                            : 'bg-white/[0.03] border border-white/10 text-white/20 backdrop-blur-sm'
                                    }
                                `}>
                                    {isCompleted ? <CheckCircle2 size={16} strokeWidth={3} /> : i}
                                    
                                    {/* Orbital Ring for Active Step */}
                                    {isActive && (
                                        <div className="absolute inset-[-6px] rounded-full border border-primary/20 animate-ping opacity-30 pointer-events-none" />
                                    )}
                                </div>
                                
                                <span className={`absolute -bottom-6 text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap
                                    ${isActive ? 'text-primary opacity-100 translate-y-0' : 'text-white/20 opacity-0 translate-y-1'}
                                `}>
                                    {i === 1 ? 'Schedule' : i === 2 ? 'Payment' : 'Success'}
                                </span>
                            </div>

                            {/* Dynamic Connector Line */}
                            {i < 3 && (
                                <div className="flex-1 max-w-[80px] h-[1px] relative mx-2">
                                    <div className={`absolute inset-0 transition-all duration-1000 ${step > i ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb,212,175,55),0.5)]' : 'bg-white/10'}`} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* STEP 1 */}
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-400">
                    {selectedCoach && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Select Date
                                    {loadingAvail && <Loader2 className="w-3 h-3 animate-spin ml-1 text-primary" />}
                                </label>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
                                    <User className="w-3 h-3 text-primary/60" />
                                    <span className="text-[9px] font-black text-primary uppercase tracking-wider">{selectedCoach.full_name}</span>
                                </div>
                            </div>

                            <div className="py-2">
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDate(null); setSelectedTime(''); }}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-black text-white uppercase tracking-tight">
                                        {format(currentMonth, 'MMMM yyyy')}
                                    </span>
                                    <button
                                        onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDate(null); setSelectedTime(''); }}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 mb-1">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                        <div key={i} className="text-center text-[9px] font-black text-white/20 uppercase tracking-widest py-1">
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {Array(startBlanks).fill(null).map((_, i) => <div key={`bl${i}`} className="aspect-square" />)}
                                    {monthDays.map(day => {
                                        const available = isDayAvailable(day);
                                        const selected = selectedDate ? isSameDay(day, selectedDate) : false;
                                        const isDayToday = isToday(day);

                                        return (
                                            <button
                                                key={day.toISOString()}
                                                disabled={!available}
                                                onClick={() => { setSelectedDate(day); setSelectedTime(''); }}
                                                className="aspect-square relative group outline-none"
                                            >
                                                <div className={`
                                                    w-8 h-8 rounded-full mx-auto flex flex-col items-center justify-center relative transition-all duration-500
                                                    ${selected 
                                                        ? 'bg-primary/20 text-white border-2 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb,212,175,55),0.4)] z-10' 
                                                        : ''}
                                                    ${!selected && available && isDayToday 
                                                        ? 'text-primary' 
                                                        : ''}
                                                    ${!selected && available && !isDayToday 
                                                        ? 'text-white/80 group-hover:bg-white/10' 
                                                        : ''}
                                                    ${!available ? 'text-white/10 cursor-not-allowed' : ''}
                                                `}>
                                                    <span className="relative z-10 font-black text-xs">{format(day, 'd')}</span>
                                                    {!selected && isDayToday && (
                                                        <div className="absolute bottom-[-1px] w-3 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                                                    )}
                                                </div>
                                                {available && !selected && (
                                                    <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedDate && slotsForSelectedDate.length > 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                Select Time — {format(selectedDate, 'EEE, MMM d')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {slotsForSelectedDate.map((slot: string) => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedTime(slot)}
                                        className={`px-6 py-3 rounded-xl border text-[12px] font-black transition-all flex items-center justify-center gap-2 w-fit ${selectedTime === slot
                                            ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10 scale-[1.02]'
                                            : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/20 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        {slot.replace(/^0/, '')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        disabled={!canGoToStep2}
                        onClick={() => setStep(2)}
                        className="w-fit mx-auto px-10 py-4 font-black uppercase tracking-[0.4em] text-[11px] transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2 mt-12 text-primary animate-pulse decoration-primary/30 underline-offset-8 hover:underline"
                    >
                        Next Step
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-400">
                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Booking Summary</div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 border border-white/5 rounded-2xl bg-white/[0.02]">
                                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Date</div>
                                <div className="text-sm font-black text-white italic">
                                    {selectedDate ? format(selectedDate, 'EEE, MMM d') : '---'}
                                </div>
                            </div>
                            <div className="p-3 border border-white/5 rounded-2xl bg-white/[0.02]">
                                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Time</div>
                                <div className="text-sm font-black text-primary italic">{selectedTime.replace(/^0/, '') || '---'}</div>
                            </div>
                            <div className="p-3 border border-primary/20 rounded-2xl bg-primary/5 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]">
                                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">Price</div>
                                <div className="text-sm font-black text-primary italic">
                                    {selectedCoach?.pt_rate || 0} <span className="text-[8px] not-italic opacity-40">KWD</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40">Payment Method</div>
                        
                        {paymentError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500">
                                    <X size={16} strokeWidth={3} />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-red-500">Transaction Failed</div>
                                    <p className="text-[11px] font-medium text-red-500/80 leading-relaxed">{paymentError}</p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => { setPaymentMethod('knet'); setPaymentError(null); }}
                            className={`w-full p-4 flex items-center justify-between transition-all ${paymentMethod === 'knet' ? 'opacity-100' : 'opacity-40 hover:opacity-60'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-[#0070BA] font-black text-[9px]">K-Net</span>
                                </div>
                                <span className="font-black text-white text-sm">K-Net Portal</span>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'knet' ? 'border-[#0070BA]' : 'border-white/20'}`}>
                                {paymentMethod === 'knet' && <div className="w-2 h-2 rounded-full bg-[#0070BA]" />}
                            </div>
                        </button>
                        
                        <button
                            onClick={() => { setPaymentMethod('card'); setPaymentError(null); }}
                            className={`w-full p-4 flex items-center justify-between transition-all ${paymentMethod === 'card' ? 'opacity-100' : 'opacity-40 hover:opacity-60'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden group">
                                    <div className="flex gap-0.5">
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B] opacity-90" />
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] opacity-90 -ml-1.5" />
                                    </div>
                                </div>
                                <span className="font-black text-white text-sm">Mastercard / Visa</span>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'card' ? 'border-[#EB001B]' : 'border-white/20'}`}>
                                {paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-[#EB001B]" />}
                            </div>
                        </button>

                        <button
                            onClick={() => setPaymentMethod('apple')}
                            className={`w-full p-4 flex items-center justify-between transition-all ${paymentMethod === 'apple' ? 'opacity-100' : 'opacity-40 hover:opacity-60'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.126 3.792 3.08 1.498-.046 2.096-.94 3.814-.94 1.71 0 2.268.94 3.826.912 1.62-.027 2.65-1.503 3.65-2.955 1.155-1.688 1.631-3.321 1.656-3.414-.035-.015-3.197-1.226-3.238-4.86-.035-3.037 2.476-4.498 2.593-4.573-1.428-2.098-3.633-2.383-4.417-2.42-1.78-.116-3.52 1.106-4.274 1.106zM15.534 3.654c.838-1.013 1.403-2.42 1.25-3.829-1.218.049-2.695.808-3.558 1.838-.775.918-1.398 2.355-1.226 3.738 1.36.105 2.709-.731 3.534-1.747z" />
                                    </svg>
                                </div>
                                <span className="font-black text-white text-sm">Apple Pay</span>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'apple' ? 'border-white' : 'border-white/20'}`}>
                                {paymentMethod === 'apple' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                        </button>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-white/30 hover:text-white transition-all flex items-center justify-center gap-2 hover:bg-white/5"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back
                        </button>
                        <button
                            onClick={handlePayment}
                            disabled={isProcessing || !paymentMethod}
                            className="flex-[2] bg-primary/10 border border-primary/30 text-primary py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all transform active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 animate-in fade-in duration-1000"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Confirm Booking'}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
                <div className="text-center space-y-12 py-16 animate-in fade-in zoom-in duration-1000">
                    <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse blur-xl" />
                        <div className="w-12 h-12 bg-emerald-500/5 rounded-full flex items-center justify-center border border-emerald-500/20 animate-in zoom-in duration-500">
                            <CheckCircle2 size={24} className="text-emerald-500/60" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-white animate-in slide-in-from-bottom-2 duration-700">
                            Session Requested!
                        </h2>
                        <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em] max-w-[200px] mx-auto leading-relaxed animate-in slide-in-from-bottom-2 duration-1000">
                            Check for confirmation in your schedule tab
                        </p>
                    </div>

                    <button
                        onClick={onSuccess}
                        className="w-fit mx-auto px-10 bg-primary/10 hover:bg-primary/20 text-primary py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] border border-primary/20 transition-all active:scale-95 animate-in slide-in-from-bottom-4 duration-1000"
                    >
                        View My Schedule
                    </button>
                </div>
            )}
        </div>
    );
}
