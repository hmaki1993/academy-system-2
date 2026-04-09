import React from 'react';
import { useConsultationRequests, useUpdateConsultationRequestStatus, useConsultationSettings } from '../../hooks/useConsultations';
import { format, addMinutes } from 'date-fns';
import { MessageCircle, CheckCircle, Video, Phone, AtSign } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ConsultationRequestsViewer() {
    const { data: requests, isLoading } = useConsultationRequests();
    const { data: settings } = useConsultationSettings();
    const updateStatus = useUpdateConsultationRequestStatus();

    const duration = settings?.consultation_duration_mins || 30;

    const handleSendRegLink = (request: any) => {
        // App Registration Link with logic to pre-fill name, phone and set role to student
        const prefillData = {
            full_name: request.full_name,
            phone: request.phone,
            email: request.email,
            role: 'student'
        };
        const prefillParam = encodeURIComponent(JSON.stringify(prefillData));
        const regLink = `${window.location.origin}/register?prefill=${prefillParam}`;
        
        const message = `Hello ${request.full_name},\n\nIt was great speaking with you! You are now approved to join the academy. Please complete your registration via this link to create your account (your name, phone, and email are already pre-filled):\n${regLink}\n\nWelcome aboard!`;
        
        const encodedMessage = encodeURIComponent(message);
        let phone = request.phone.replace(/[^0-9]/g, '');
        if (!phone.startsWith('965') && phone.length === 8) {
            phone = '965' + phone; // Default to Kuwait if 8 digits
        }

        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
        toast.success('Opening WhatsApp...', { icon: '💬' });
    };

    const handleMarkAsDone = (id: string) => {
        updateStatus.mutate({ id, status: 'completed' });
        toast.success('Consultation moved to history');
    };

    if (isLoading) return <div className="animate-pulse h-64 bg-white/5 rounded-2xl"></div>;

    // Action Required: paid AND (pending OR contacted)
    const actionRequired = requests?.filter(r => r.payment_status === 'paid' && (r.status === 'pending' || r.status === 'contacted')) || [];
    // History: everything else (not paid OR status is completed/rejected)
    const history = requests?.filter(r => r.payment_status !== 'paid' || r.status === 'completed' || r.status === 'rejected') || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Action Required */}
                <div className="bg-transparent">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div className="flex items-center gap-4">
                            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse"></span>
                            <h3 className="text-lg font-black text-white uppercase tracking-[0.2em] opacity-90">Action Required</h3>
                        </div>
                        <span className="text-[10px] font-black tracking-widest text-red-500/40 uppercase">{actionRequired.length} Active</span>
                    </div>

                    <div className="space-y-3">
                        {actionRequired.length === 0 && (
                            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 italic">No new requests.</p>
                            </div>
                        )}
                        {actionRequired.map(req => {
                            const startTime = new Date(`${req.booked_date}T${req.booked_time}`);
                            const endTime = addMinutes(startTime, duration);

                            return (
                                <div key={req.id} className="bg-white/[0.04] border border-white/5 rounded-2xl p-4 hover:border-fame-gold/20 transition-all group backdrop-blur-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-fame-gold font-black text-[10px]">
                                                {req.full_name[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-white text-base tracking-tight">{req.full_name}</h4>
                                                <div className="flex items-center gap-3 mt-1 opacity-40">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{format(new Date(req.booked_date), 'MMM d')}</span>
                                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{format(startTime, 'p')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-xs leading-relaxed text-white/50 mb-4 px-3 border-l border-fame-gold/30 italic font-medium">
                                        "{req.fitness_goals || 'No specific goals provided'}"
                                    </div>

                                    <div className="flex justify-between items-center bg-black/20 rounded-xl p-2 px-3">
                                        <span className="text-[10px] font-black text-green-400 opacity-60 uppercase tracking-widest">PAID {req.amount_paid} KWD</span>
                                        <div className="flex gap-1.5">
                                            <button 
                                                onClick={() => handleSendRegLink(req)}
                                                className="flex items-center gap-2 bg-green-500/5 hover:bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border border-green-500/20 active:scale-95"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                {req.phone}
                                            </button>
                                            <button 
                                                onClick={() => handleMarkAsDone(req.id)}
                                                className="flex items-center gap-2 bg-fame-gold/5 hover:bg-fame-gold/10 text-fame-gold px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-fame-gold/20 active:scale-95"
                                            >
                                                FINALIZE
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* History */}
                <div className="bg-transparent">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div className="flex items-center gap-4">
                            <span className="w-2 h-2 rounded-full bg-white/20"></span>
                            <h3 className="text-lg font-black text-white/40 uppercase tracking-[0.2em]">Archived</h3>
                        </div>
                    </div>
                    
                    <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {history.map(req => {
                            const startTime = new Date(`${req.booked_date}T${req.booked_time}`);
                            const endTime = addMinutes(startTime, duration);

                            return (
                                <div key={req.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-row justify-between items-center transition-all hover:bg-white/[0.04] group opacity-60 hover:opacity-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 font-black text-[9px]">
                                            {req.full_name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white/80 text-[11px] tracking-tight group-hover:text-white transition-colors">{req.full_name}</h4>
                                            <div className="text-white/20 text-[8px] flex items-center gap-2 font-black tracking-widest uppercase mt-0.5">
                                                <span>{format(new Date(req.booked_date), 'MMM d')}</span>
                                                <span className="w-0.5 h-0.5 rounded-full bg-white/10"></span>
                                                <span className="text-fame-gold/40">{format(startTime, 'p')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {req.payment_status !== 'paid' ? (
                                            <span className="text-red-500/40 text-[8px] font-black tracking-widest uppercase">Unpaid</span>
                                        ) : (
                                            <span className="text-green-500/40 text-[8px] font-black tracking-widest uppercase">Done</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
