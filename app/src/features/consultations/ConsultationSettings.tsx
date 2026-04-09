import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    format, 
    subMonths, 
    addMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameDay, 
    isSameMonth 
} from 'date-fns';
import { 
    Settings, 
    Save, 
    CalendarDays, 
    ChevronLeft, 
    ChevronRight, 
    Trash2, 
    Plus, 
    Clock 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
    useConsultationAvailability, 
    useUpdateConsultationAvailability 
} from '../../hooks/useConsultations';
import { useQueryClient } from '@tanstack/react-query';

type TimePickerProps = {
    value: string;
    onChange: (val: string) => void;
};

function CustomTimePicker({ value, onChange }: TimePickerProps) {
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
            // value is "HH:mm" (24h)
            const [h24, m] = value.split(':').map(Number);
            const isPM = h24 >= 12;
            const h12 = h24 % 12 || 12;
            const mRound = Math.round(m / 5) * 5;
            
            setInternalH(h12);
            setInternalM(mRound);
            setInternalPM(isPM);

            // Scroll to positions
            setTimeout(() => {
                const itemHeight = 40;
                if (hourRef.current) {
                    const hIdx = hours.indexOf(h12);
                    if (hIdx !== -1) hourRef.current.scrollTop = hIdx * itemHeight;
                }
                if (minRef.current) {
                    const mIdx = minutes.indexOf(mRound);
                    if (mIdx !== -1) minRef.current.scrollTop = mIdx * itemHeight;
                }
            }, 100);
        }
    }, [isOpen, value]);

    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        let finalH = internalH;
        if (internalPM && finalH < 12) finalH += 12;
        if (!internalPM && finalH === 12) finalH = 0;
        
        const hStr = finalH.toString().padStart(2, '0');
        const mStr = internalM.toString().padStart(2, '0');
        onChange(`${hStr}:${mStr}`);
        setIsOpen(false);
    };

    // Formatted display
    const [h24_val, m_val] = value.split(':').map(Number);
    const dispH = h24_val % 12 || 12;
    const dispM = m_val.toString().padStart(2, '0');
    const dispPM = h24_val >= 12 ? 'PM' : 'AM';

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(true)}
                className={`bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm font-black text-white hover:border-fame-gold/50 transition-all flex items-center gap-3 active:scale-95 ${isOpen ? 'border-fame-gold/60 bg-fame-gold/5 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : ''}`}
            >
                <div className="p-1.5 bg-white/5 rounded-lg text-primary">
                    <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="tracking-tight">{dispH}:{dispM} {dispPM}</span>
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {/* Glass Overlay */}
                    <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-md" onClick={() => setIsOpen(false)} />
                    
                    <div className="relative z-[1001] bg-[#0A0A0A]/95 border border-white/10 rounded-[2.5rem] p-6 shadow-[0_40px_100px_rgba(0,0,0,1)] w-[280px] animate-in zoom-in-95 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Subtle Background Glow */}
                        <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary/10 blur-[60px]" />

                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Set Time</span>
                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                    {['AM', 'PM'].map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setInternalPM(mode === 'PM')}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${ (mode === 'PM' && internalPM) || (mode === 'AM' && !internalPM) ? 'bg-primary text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-white/20 hover:text-white/40'}`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative flex items-center justify-center h-40 bg-white/[0.02] rounded-3xl border border-white/10 overflow-hidden">
                                {/* Glass Selection Box */}
                                <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-10 bg-primary/10 border-y border-primary/20 rounded-xl pointer-events-none" />
                                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[#0A0A0A] to-transparent z-20 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0A0A0A] to-transparent z-20 pointer-events-none" />
                                
                                <div className="flex items-center gap-0 w-full px-4">
                                    {/* Hours Wheel */}
                                    <div 
                                        ref={hourRef}
                                        onScroll={(e) => {
                                            const idx = Math.round(e.currentTarget.scrollTop / 40);
                                            if (hours[idx] && hours[idx] !== internalH) setInternalH(hours[idx]);
                                        }}
                                        className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar h-40 py-[60px]"
                                    >
                                        {hours.map(hVal => (
                                            <div 
                                                key={hVal}
                                                onClick={() => setInternalH(hVal)}
                                                className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all duration-300 ${internalH === hVal ? 'text-primary text-2xl font-black' : 'text-white/10 text-lg hover:text-white/20'}`}
                                            >
                                                {hVal.toString().padStart(2, '0')}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="text-primary/30 font-black text-xl mb-1">:</div>

                                    {/* Minutes Wheel */}
                                    <div 
                                        ref={minRef}
                                        onScroll={(e) => {
                                            const idx = Math.round(e.currentTarget.scrollTop / 40);
                                            if (minutes[idx] !== undefined && minutes[idx] !== internalM) setInternalM(minutes[idx]);
                                        }}
                                        className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar h-40 py-[60px]"
                                    >
                                        {minutes.map(mVal => (
                                            <div 
                                                key={mVal}
                                                onClick={() => setInternalM(mVal)}
                                                className={`h-10 flex items-center justify-center snap-center cursor-pointer transition-all duration-300 ${internalM === mVal ? 'text-primary text-2xl font-black' : 'text-white/10 text-lg hover:text-white/20'}`}
                                            >
                                                {mVal.toString().padStart(2, '0')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleConfirm}
                                className="w-full py-4 bg-primary/5 border border-primary/40 text-primary hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 relative group"
                            >
                                <div className="absolute inset-0 bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all pointer-events-none" />
                                <span className="relative z-10">CONFIRM TIME</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default function ConsultationSettings({ settings }: { settings: any }) {
    const [fee, setFee] = useState<number | string>('');
    const [duration, setDuration] = useState<number | string>('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const { data: availability, isLoading } = useConsultationAvailability();
    const updateAvailability = useUpdateConsultationAvailability();
    const queryClient = useQueryClient();

    useEffect(() => {
        setFee('');
        setDuration('');
    }, []);

    const handleSaveSettings = async () => {
        try {
            const finalFee = fee === '' ? settings?.consultation_fee : Number(fee);
            const finalDuration = duration === '' ? settings?.consultation_duration_mins : Number(duration);

            const { error } = await supabase
                .from('gym_settings')
                .update({ 
                    consultation_fee: finalFee, 
                    consultation_duration_mins: finalDuration 
                })
                .eq('id', settings?.id || 1);

            if (error) throw error;
            toast.success('Settings updated');
            queryClient.invalidateQueries({ queryKey: ['gymSettings'] });
        } catch (err: any) {
            toast.error('Failed to update settings: ' + err.message);
        }
    };

    const handleToggleStatus = async (record: any) => {
        updateAvailability.mutate({
            id: record.id,
            is_active: !record.is_active,
            start_time: record.start_time,
            end_time: record.end_time
        });
    };

    const calculateEndTime = (startTime: string, durationMins: number) => {
        const [h, m] = startTime.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m, 0);
        const endDate = new Date(date.getTime() + durationMins * 60000);
        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    };

    const handleAddTime = async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        // Find the latest end time for today, or start at 09:00
        const daySlots = availability?.filter(a => a.specific_date === dateStr) || [];
        let nextStart = '09:00';
        if (daySlots.length > 0) {
            const lastSlot = [...daySlots].sort((a, b) => b.end_time.localeCompare(a.end_time))[0];
            nextStart = lastSlot.end_time;
        }

        updateAvailability.mutate({
            specific_date: dateStr,
            start_time: nextStart,
            end_time: calculateEndTime(nextStart, Number(duration) || settings?.consultation_duration_mins || 30),
            is_active: true
        });
    };

    const handleDeleteTime = async (id: string) => {
        await supabase.from('consultation_availability').delete().eq('id', id);
        queryClient.invalidateQueries({ queryKey: ['consultation_availability'] });
        toast.success('Removed');
    };

    // Calendar logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const daySlots = availability?.filter(a => a.specific_date === format(selectedDate, 'yyyy-MM-dd')) || [];

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Settings Card */}
            <div className="bg-transparent rounded-2xl space-y-6 flex flex-col items-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Settings className="w-5 h-5 text-fame-gold/60" />
                    <h3 className="text-xl font-bold font-display tracking-widest uppercase opacity-80 text-center">Consultation Config</h3>
                </div>
                <div className="flex flex-row items-center justify-center gap-12 w-full">
                    <div className="flex flex-col items-center gap-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Price (KWD)</label>
                        <input 
                            type="number"
                            value={fee}
                            onChange={e => setFee(e.target.value)}
                            className="w-24 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-fame-gold/50 focus:ring-1 focus:ring-fame-gold/20 transition-all text-sm outline-none text-center"
                        />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Duration (Mins)</label>
                        <input 
                            type="number"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            className="w-24 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white font-bold focus:border-fame-gold/50 focus:ring-1 focus:ring-fame-gold/20 transition-all text-sm outline-none text-center"
                        />
                    </div>
                </div>
                <button 
                    onClick={handleSaveSettings}
                    className="-mt-4 flex items-center justify-center bg-transparent text-red-500 font-black uppercase tracking-[0.8em] pl-[0.8em] py-4 transition-all w-fit mx-auto text-[10px] active:scale-90 group relative animate-pulse"
                >
                    {/* Pulsing Glow Background */}
                    <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full pointer-events-none" />
                    
                    <span className="relative z-10 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]">SAVE</span>
                </button>
            </div>

            {/* Calendar Availability */}
            <div className="bg-transparent border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-fame-gold" />
                        <h3 className="text-xl font-bold font-display tracking-wide uppercase">Availability Calendar</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left side: Calendar */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h4 className="text-lg font-black uppercase tracking-tighter text-white">{format(currentMonth, 'MMMM yyyy')}</h4>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-lg border border-white/5"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-lg border border-white/5"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <div key={`${d}-${i}`} className="h-10 flex items-center justify-center text-[10px] font-black text-white/70 uppercase">{d}</div>
                            ))}
                            {calendarDays.map((day, i) => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const hasSlots = availability?.some(a => a.specific_date === dayStr);
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isToday = isSameDay(day, new Date());
                                
                                return (
                                    <div key={i} className="flex justify-center p-1">
                                        <button
                                            onClick={() => setSelectedDate(day)}
                                            className={`relative h-10 w-10 flex flex-col items-center justify-center rounded-full transition-all duration-300
                                                ${isSelected 
                                                    ? 'bg-fame-gold/30 border-2 border-fame-gold text-fame-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                                                    : 'hover:bg-white/10 text-white'}
                                                ${!isCurrentMonth ? 'opacity-10 pointer-events-none' : 'opacity-100'}
                                            `}
                                        >
                                            <span className={`text-xs font-black`}>{format(day, 'd')}</span>
                                            {isToday && !isSelected && (
                                                <div className="absolute bottom-1 w-3 h-[2px] bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                            )}
                                            {hasSlots && !isSelected && !isToday && (
                                                <div className="absolute bottom-1 w-1 h-1 bg-fame-gold rounded-full shadow-[0_0_5px_rgba(212,175,55,1)]"></div>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right side: Slots for selected day */}
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/5 pb-6 gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fame-gold/60 mb-1">Coaching Schedule</p>
                                <h4 className="text-2xl font-black text-white uppercase tracking-tighter">{format(selectedDate, 'EEEE, MMM d')}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                                {daySlots.length > 0 && (
                                    <button 
                                        onClick={async () => {
                                            if (confirm('Delete all slots for this day?')) {
                                                await supabase.from('consultation_availability').delete().eq('specific_date', format(selectedDate, 'yyyy-MM-dd'));
                                                queryClient.invalidateQueries({ queryKey: ['consultation_availability'] });
                                                toast.success('Day cleared');
                                            }
                                        }}
                                        className="p-2.5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        title="Clear All Slots"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button 
                                    onClick={() => {
                                        const allActive = daySlots.every((s: any) => s.is_active);
                                        daySlots.forEach((s: any) => {
                                            updateAvailability.mutate({ ...s, is_active: !allActive, silent: true });
                                        });
                                        toast.success(allActive ? 'Day Paused' : 'Day Reopened');
                                    }}
                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                                        daySlots.every((s: any) => s.is_active)
                                            ? 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                                            : 'bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black border-transparent shadow-[0_10px_20px_rgba(212,175,55,0.2)]'
                                    }`}
                                >
                                    {daySlots.every((s: any) => s.is_active) ? 'PAUSE ALL' : 'OPEN ALL'}
                                </button>
                                <button 
                                    onClick={handleAddTime}
                                    className="bg-white text-black px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-fame-gold transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <Plus className="w-4 h-4" /> Add Slot
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                            {daySlots.length === 0 ? (
                                <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10">No Slots Configured</p>
                                </div>
                            ) : (
                                daySlots.map((slot: any) => (
                                    <div key={slot.id} className={`flex flex-col sm:flex-row sm:items-center justify-between bg-transparent border p-4 sm:p-2 sm:pl-3 rounded-[1.5rem] transition-all group gap-4 sm:gap-2 ${slot.is_active ? 'border-white/10 hover:border-fame-gold/30' : 'border-white/5 opacity-50 hover:opacity-100'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl transition-all duration-500 flex-shrink-0 ${slot.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <Clock className={`w-3.5 h-3.5 ${slot.is_active ? 'animate-pulse' : ''}`} />
                                            </div>
                                            <div className="flex flex-col w-full">
                                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                    <div className="font-display font-black tracking-tight text-white flex-1 sm:flex-none">
                                                        <CustomTimePicker 
                                                            value={slot.start_time}
                                                            onChange={(newVal) => {
                                                                const newEnd = calculateEndTime(newVal, Number(duration) || settings?.consultation_duration_mins || 30);
                                                                updateAvailability.mutate({ ...slot, start_time: newVal, end_time: newEnd });
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-white/10 font-black text-xs px-1">—</span>
                                                    <div className="font-display font-black tracking-tight text-white flex-1 sm:flex-none">
                                                        <CustomTimePicker 
                                                            value={slot.end_time}
                                                            onChange={(newVal) => updateAvailability.mutate({ ...slot, end_time: newVal })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4 sm:border-t-0 sm:pt-0 sm:pl-2">
                                            <button 
                                                onClick={() => handleToggleStatus(slot)}
                                                className={`flex-1 sm:flex-none text-[9px] font-black px-6 sm:px-4 py-3 sm:py-2 rounded-xl border transition-all active:scale-95 ${
                                                    slot.is_active 
                                                    ? 'border-green-500/30 text-green-500 bg-green-500/5 hover:bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                                                    : 'border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                                }`}
                                            >
                                                {slot.is_active ? 'ENABLED' : 'PAUSED'}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTime(slot.id)}
                                                className="p-3 sm:p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all scale-100 active:scale-90"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
