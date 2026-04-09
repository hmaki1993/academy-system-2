import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useConsultationAvailability } from '../hooks/useConsultations';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay, getDay, addMinutes } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Clock, ChevronRight, X as XIcon, CheckCircle, Download, ExternalLink, Hash, AtSign, Phone as PhoneIcon, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PageHeader from '../components/PageHeader';

export default function BookConsultation() {
    const location = useLocation();
    const isIntegrated = location.pathname.includes('/app/');
    const { data: availability, isLoading: isLoadingAvail } = useConsultationAvailability();
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', goals: '' });
    const [isPaying, setIsPaying] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    const step2Ref = useRef<HTMLDivElement>(null);
    const step3Ref = useRef<HTMLDivElement>(null);

    // 1. Session Detection & Pre-fill
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setFormData(prev => ({
                    ...prev,
                    name: user.user_metadata?.full_name || '',
                    email: user.email || '',
                    phone: user.user_metadata?.phone?.replace('+965', '') || ''
                }));
            }
        };
        fetchUser();
    }, []);

    // 2. Success Detection & Receipt Fetching
    useEffect(() => {
        const status = searchParams.get('status');
        const requestId = searchParams.get('request_id');
        const isDemo = searchParams.get('demo') === 'true';

        if (isDemo) {
            setReceiptData({
                full_name: "ELITE MEMBER",
                email: "elite@fame-academy.online",
                phone: "+965 9999 8888",
                booked_date: format(new Date(), 'yyyy-MM-dd'),
                booked_time: "18:00:00",
                amount_paid: 50,
                id: "demo-fame-elite-id"
            });
            setShowReceipt(true);
            return;
        }

        if (status === 'success' && requestId) {
            const fetchReceipt = async () => {
                const { data, error } = await supabase
                    .from('consultation_requests')
                    .select('*')
                    .eq('id', requestId)
                    .single();

                if (data && !error) {
                    setReceiptData(data);
                    setShowReceipt(true);
                    // Clear params from URL for clean state
                    setSearchParams({}, { replace: true });
                }
            };
            fetchReceipt();
        }
    }, [searchParams, setSearchParams]);

    // Current Month Calendar Logic
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDayOfWeek = getDay(monthStart);
    const paddingDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const handlePayment = async () => {
        if (!selectedDate) { toast.error("Please select a date first."); return; }
        if (!selectedTime) { toast.error("Please select a time slot."); return; }
        if (!formData.name.trim()) { toast.error("Master name is required."); return; }
        if (!formData.email.trim()) { toast.error("Email address is required."); return; }
        if (!formData.phone.trim()) { toast.error("Phone number is required."); return; }

        setIsPaying(true);
        try {
            const { data: settings } = await supabase.from('gym_settings').select('consultation_fee, consultation_duration_mins').limit(1).single();
            const fee = settings?.consultation_fee || 50;

            const { data: request, error: insertError } = await supabase.from('consultation_requests').insert({
                full_name: formData.name,
                email: formData.email.toLowerCase(),
                phone: `+965${formData.phone}`,
                fitness_goals: formData.goals,
                booked_date: format(selectedDate, 'yyyy-MM-dd'),
                booked_time: selectedTime,
                amount_paid: fee,
                payment_status: 'pending'
            }).select().single();

            if (insertError) throw insertError;

            // Trigger Tap Payment with DYNAMIC Redirect URL (Fixed Hash Routing)
            const redirectUrl = `${window.location.origin}/book-consultation?status=success&request_id=${request.id}`;

            const { data: payData, error: payError } = await supabase.functions.invoke('create-tap-payment', {
                body: {
                    amount: fee,
                    currency: "KWD",
                    customer: {
                        first_name: formData.name,
                        phone: { country_code: "965", number: formData.phone },
                        email: formData.email.toLowerCase()
                    },
                    payment_method: 'all',
                    metadata: { type: 'consultation', request_id: request.id },
                    redirect_url: redirectUrl
                }
            });

            if (payError) throw payError;

            if (payData && payData.transaction_url) {
                window.location.href = payData.transaction_url;
            } else {
                throw new Error("Invalid payment URL from Tap");
            }
        } catch (error: any) {
            toast.error(error.message);
            setIsPaying(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!receiptData || !receiptRef.current) return;

        toast.loading('Generating your Elite Receipt...', { id: 'pdf-gen' });

        try {
            // Dynamically load html-to-image to bypass html2canvas bugs with modern CSS like oklab
            // and get native retina scaling without layout breaking (unlike dom-to-image)
            if (!(window as any).htmlToImage) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const element = receiptRef.current;

            // html-to-image has a native pixelRatio setting for retina quality!
            const imgData = await (window as any).htmlToImage.toPng(element, {
                pixelRatio: 3,
                backgroundColor: '#050505',
                style: {
                    margin: '0'
                }
            });

            const pdfWidth = element.offsetWidth;
            const pdfHeight = element.offsetHeight;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [pdfWidth, pdfHeight]
            });

            // Add image scaled down perfectly to the logical PDF dimensions
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`Fame-Elite-Receipt-${receiptData.id.slice(0, 8)}.pdf`);
            toast.success('Your Elite receipt is ready!', { id: 'pdf-gen' });
        } catch (error: any) {
            console.error('PDF Elite Build Error:', error);
            toast.error('Failed to craft receipt. Please try again.', { id: 'pdf-gen' });
        }
    };

    if (isLoadingAvail) {
        return <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white">Loading slots...</div>;
    }

    return (
        <div className={`${isIntegrated ? 'w-full' : 'min-h-screen bg-[#000000]'} text-white flex flex-col items-center py-6 lg:py-10 px-6 font-display overflow-x-hidden`}>

            {/* SUCCESS RECEIPT MODAL */}
            {showReceipt && receiptData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 lg:p-4 animate-in fade-in duration-500">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setShowReceipt(false)}></div>
                    <div className="relative w-full max-w-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-700">

                        {/* THE RECEIPT TARGET FOR PDF */}
                        <div
                            ref={receiptRef}
                            className="bg-[#050505] border border-fame-gold/20 rounded-[2rem] p-6 lg:p-8 shadow-[0_0_80px_rgba(212,175,55,0.1)] relative overflow-hidden"
                        >
                            {/* Watermark/Texture */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-fame-gold/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

                            {/* Header */}
                            <div className="flex justify-between items-start mb-4 relative">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter uppercase mb-0.5 text-white">
                                        FAME <span className="text-fame-gold">ACADEMY</span>
                                    </h2>
                                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-[0.4em]">Official Payment Receipt</p>
                                </div>
                                <div className="text-right">
                                    <div className="bg-fame-gold/10 text-fame-gold text-[8px] font-black px-3 py-1 rounded-full border border-fame-gold/20 mb-1.5 inline-block uppercase">PAID SUCCESS</div>
                                    <p className="text-[9px] font-medium text-white/30">{format(new Date(), 'PPpp')}</p>
                                </div>
                            </div>

                            {/* Welcome Section */}
                            <div className="mb-4 text-center">
                                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-500/20">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Welcome to the Academy, {receiptData.full_name.split(' ')[0]}!</h3>
                                <p className="text-white/40 text-[10px] leading-relaxed max-w-xs mx-auto italic">Your consultation has been secured. Our elite team will reach out to you via WhatsApp shortly.</p>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-6 mb-4 border-y border-white/5 py-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-black text-fame-gold/60 uppercase tracking-widest block mb-1">Member Name</label>
                                        <p className="text-xs font-black text-white uppercase tracking-tight">{receiptData.full_name}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-fame-gold/60 uppercase tracking-widest block mb-1">Digital Reach (Email)</label>
                                        <p className="text-[11px] font-bold text-white truncate max-w-[140px]">{receiptData.email}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-black text-fame-gold/60 uppercase tracking-widest block mb-1">Liaison (WhatsApp)</label>
                                        <p className="text-xs font-black text-white">{receiptData.phone}</p>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-fame-gold/60 uppercase tracking-widest block mb-1">Appointment Schedule</label>
                                        <p className="text-xs font-black text-white uppercase">{format(new Date(`${receiptData.booked_date}T12:00:00`), 'MMM d')} @ {receiptData.booked_time.substring(0, 5)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Total Section (Glassmorphism Upgrade) */}
                            <div className="bg-white/[0.02] backdrop-blur-md rounded-2xl p-4 flex justify-between items-center mb-4 border border-white/10 shadow-[inner_0_1px_1px_rgba(255,255,255,0.05)]">
                                <div className="text-left">
                                    <p className="text-[9px] font-black text-fame-gold/40 uppercase tracking-widest mb-1">Total Amount Paid</p>
                                    <h4 className="text-2xl font-black text-white">{receiptData.amount_paid} <span className="text-xs text-fame-gold/60 ml-1">KWD</span></h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-fame-gold/40 uppercase tracking-widest mb-1">Elite Ref</p>
                                    <p className="text-[10px] font-mono font-black text-white/50 tracking-widest bg-white/5 px-2 py-1 rounded border border-white/5 uppercase">
                                        {receiptData.id.split('-')[0].toUpperCase()}
                                    </p>
                                </div>
                            </div>

                            <div className="text-center opacity-30">
                                <p className="text-[8px] font-bold uppercase tracking-[0.5em] text-white">This is a system generated document</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex gap-2 h-10">
                            <button
                                onClick={handleDownloadPDF}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Download className="w-3.5 h-3.5" /> Download PDF
                            </button>
                            <button
                                onClick={() => setShowReceipt(false)}
                                className="w-10 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center transition-all active:scale-95 border border-red-500/20"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-xl lg:max-w-3xl w-full">
                <PageHeader
                    title={
                        <div className="flex items-center gap-3">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            <span>Availability Calendar</span>
                        </div>
                    }
                    subtitle="Book and manage elite training sessions"
                />

                <div className="space-y-16 lg:space-y-20">
                    {/* 1. Date Selection */}
                    <div className="animate-fade-in">
                        <div className="flex items-baseline gap-4 mb-8 lg:mb-10">
                            <span className="text-4xl lg:text-6xl font-black text-white/5 leading-none">01</span>
                            <h3 className="text-lg lg:text-xl font-black uppercase tracking-[0.2em] lg:tracking-[0.4em] text-white">Select Date</h3>
                        </div>

                        <div className="w-full">
                            <div className="flex justify-between items-center mb-6 lg:mb-8 px-1">
                                <h4 className="text-base lg:text-xl font-black text-white uppercase tracking-tighter">{format(today, 'MMMM yyyy')}</h4>
                            </div>

                            <div className="grid grid-cols-7 gap-y-3 lg:gap-y-4 w-full">
                                {weekDays.map(day => (
                                    <div key={day} className="h-6 flex items-center justify-center w-full mb-1 lg:mb-2">
                                        <span className="text-[10px] lg:text-[11px] font-black text-white/70 uppercase tracking-widest">{day.substring(0, 1)}</span>
                                    </div>
                                ))}

                                {paddingDays.map(idx => (
                                    <div key={`p-${idx}`} className="flex justify-center w-full">
                                        <div className="h-10 w-10 lg:h-12 lg:w-12"></div>
                                    </div>
                                ))}

                                {daysInMonth.map((date, i) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const isAvailable = availability?.some(a => a.specific_date === dateStr && a.is_active);
                                    const isSelected = selectedDate && isSameDay(selectedDate, date);
                                    const isPast = isBefore(date, today);
                                    const isToday = isSameDay(date, today);
                                    const isClosed = !isPast && !isAvailable;
                                    const unbookable = isPast || !isAvailable;

                                    return (
                                        <div key={i} className="flex items-center justify-center w-full">
                                            <button
                                                onClick={() => {
                                                    setSelectedDate(date);
                                                    setSelectedTime(null);
                                                    setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                                                }}
                                                disabled={unbookable}
                                                className={`relative h-10 w-10 lg:h-12 lg:w-12 flex items-center justify-center transition-all duration-300 rounded-full
                                                    ${isSelected
                                                        ? 'text-black bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] to-[#B38728] scale-110 shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                                                        : isClosed
                                                            ? 'bg-red-500/10 text-red-500/40 border border-red-500/20 cursor-not-allowed'
                                                            : isPast
                                                                ? 'text-white/20 cursor-not-allowed bg-transparent focus:outline-none line-through decoration-white/20'
                                                                : 'text-white/80 hover:text-white hover:bg-white/10'
                                                    }`}
                                            >
                                                {isToday && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                                                <span className={`text-[13px] lg:text-[15px] font-black z-10`}>
                                                    {format(date, 'd')}
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 2. Select Time */}
                    <div id="step-2" ref={step2Ref} className={`transition-all duration-1000 ${selectedDate ? 'opacity-100' : 'opacity-40'}`}>
                        <div className="flex items-baseline gap-4 mb-8 lg:mb-10">
                            <span className={`text-4xl lg:text-6xl font-black leading-none transition-colors ${selectedDate ? 'text-fame-gold/40' : 'text-white/5'}`}>02</span>
                            <h3 className="text-lg lg:text-xl font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] text-white">Select Time</h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedDate && availability ? (
                                (() => {
                                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                    const daySlots = availability.filter(a => a.specific_date === dateStr && a.is_active);
                                    return daySlots.length > 0 ? (
                                        daySlots.map((slot: any, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedTime(slot.start_time);
                                                    setTimeout(() => step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                                                }}
                                                className={`py-4 lg:py-6 border transition-all font-black text-[10px] lg:text-xs uppercase tracking-[0.2em]
                                                    ${selectedTime === slot?.start_time
                                                        ? 'bg-fame-gold text-black border-fame-gold shadow-[0_15px_40px_rgba(212,175,55,0.3)]'
                                                        : 'bg-transparent border-white/10 text-white/40 hover:border-white/60 hover:text-white'
                                                    }`}
                                            >
                                                {String(slot.start_time).substring(0, 5)}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-4 text-fame-gold/60 text-xs font-black uppercase tracking-[0.2em]">No slots for this day</div>
                                    );
                                })()
                            ) : (
                                Array.from({ length: 4 }).map((_, idx) => (
                                    <div key={idx} className="py-4 lg:py-6 border border-white/5 text-white/5 font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center italic">
                                        WAITING
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 3. Your Info */}
                    <div ref={step3Ref} className={`transition-all duration-1000 pb-32 ${selectedTime ? 'opacity-100' : 'opacity-60'}`}>
                        <div className="flex items-baseline gap-4 mb-6 lg:mb-8">
                            <span className={`text-4xl lg:text-6xl font-black leading-none transition-colors ${selectedTime ? 'text-fame-gold/40' : 'text-white/5'}`}>03</span>
                            <h3 className="text-lg lg:text-xl font-black uppercase tracking-[0.2em] lg:tracking-[0.3em] text-white">Identity</h3>
                        </div>

                        <div className="space-y-8 lg:space-y-12">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black tracking-[0.3em] text-fame-gold ml-1 italic opacity-50 uppercase">Full Name</label>
                                <input
                                    type="text"
                                    placeholder=""
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                    className="w-full bg-transparent border-b border-white/20 py-4 text-white font-black text-xl lg:text-2xl uppercase tracking-tighter focus:border-white outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black tracking-[0.3em] text-fame-gold ml-1 italic opacity-50 uppercase">Email Address</label>
                                <div className="flex items-center border-b border-white/20 group focus-within:border-white transition-colors">
                                    <AtSign className="w-5 h-5 text-fame-gold/60 mr-3" />
                                    <input
                                        type="email"
                                        placeholder=""
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-transparent py-4 text-white font-black text-xl lg:text-2xl uppercase tracking-tighter focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black tracking-[0.3em] text-fame-gold ml-1 italic opacity-50 uppercase">WhatsApp Number</label>
                                <div className="flex items-center border-b border-white/20 group focus-within:border-white transition-colors">
                                    <span className="text-xl lg:text-2xl font-black text-fame-gold/60 py-4 pr-2">+965</span>
                                    <input
                                        type="tel"
                                        placeholder=""
                                        value={formData.phone}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '').substring(0, 8);
                                            setFormData({ ...formData, phone: val });
                                        }}
                                        className="w-full bg-transparent py-4 text-white font-black text-xl lg:text-2xl uppercase tracking-tighter focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black tracking-[0.3em] text-fame-gold ml-1 italic opacity-50 uppercase">Fitness Goals</label>
                                <textarea
                                    placeholder=""
                                    value={formData.goals} onChange={e => setFormData({ ...formData, goals: e.target.value.toUpperCase() })}
                                    className="w-full bg-transparent border-b border-white/20 py-4 text-white font-black text-lg lg:text-xl uppercase tracking-tighter focus:border-white outline-none transition-colors h-24 lg:h-32 resize-none"
                                />
                            </div>

                            {/* Payment Trust Indicators */}
                            <div className="flex flex-col items-center gap-4 mt-8">
                                <div className="flex items-center justify-center gap-6 opacity-80 hover:opacity-100 transition-all duration-500">
                                    <img src="https://img.icons8.com/color/48/000000/google-pay.png" alt="Payment" className="h-6 lg:h-8 object-contain grayscale invert" />
                                    <img src="https://img.icons8.com/color/48/000000/apple-pay.png" alt="Apple Pay" className="h-6 lg:h-8 object-contain grayscale invert" />
                                    <div className="flex gap-4">
                                        <img src="https://img.icons8.com/color/48/000000/mastercard.png" alt="MasterCard" className="h-6 lg:h-8 object-contain" />
                                        <img src="https://img.icons8.com/color/48/000000/visa.png" alt="Visa" className="h-6 lg:h-8 object-contain" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-30">
                                    <Lock className="w-2 h-2" />
                                    <p className="text-[8px] font-black text-white uppercase tracking-[0.4em]">SECURE CHECKOUT BY TAP PAYMENTS</p>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={isPaying}
                                className="w-full max-w-sm mx-auto block bg-primary/10 hover:bg-primary/20 backdrop-blur-md text-primary font-black text-sm lg:text-base py-4 mt-4 uppercase tracking-[0.3em] transition-all duration-500 border border-primary/30 hover:border-primary/50 rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.1)] active:scale-[0.98] disabled:opacity-20 relative overflow-hidden group mb-12"
                            >
                                <div className="absolute inset-0 bg-white/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <span className="relative">{isPaying ? 'CONNECTING...' : 'INITIATE PAY'}</span>
                            </button>

                            {/* Desktop Spacer for Visibility */}
                            <div className="h-40 w-full lg:block hidden"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
