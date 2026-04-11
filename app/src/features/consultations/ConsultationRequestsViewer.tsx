import React, { useState } from 'react';
import { useConsultationRequests, useUpdateConsultationRequestStatus, useConsultationSettings, useDeleteConsultationRequests } from '../../hooks/useConsultations';
import { format, addMinutes } from 'date-fns';
import { MessageCircle, CheckCircle, Video, Phone, AtSign, Trash2, X, ChevronRight, User, Calendar, Clock, CreditCard, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ConsultationRequestsViewer() {
    const { data: requests, isLoading } = useConsultationRequests();
    const { data: settings } = useConsultationSettings();
    const updateStatus = useUpdateConsultationRequestStatus();
    const deleteRequests = useDeleteConsultationRequests();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [detailRequest, setDetailRequest] = useState<any>(null);

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

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        deleteRequests.mutate(id);
        toast.success('Request terminated successfully');
    };

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        deleteRequests.mutate(Array.from(selectedIds));
        toast.success('Selected items purged successfully');
        setSelectedIds(new Set());
    };

    if (isLoading) return <div className="animate-pulse h-64 bg-white/5 rounded-2xl"></div>;

    // Action Required: paid AND (pending OR contacted)
    const actionRequired = requests?.filter(r => r.payment_status === 'paid' && (r.status === 'pending' || r.status === 'contacted')) || [];
    // History: everything else (not paid OR status is completed/rejected)
    const history = requests?.filter(r => r.payment_status !== 'paid' || r.status === 'completed' || r.status === 'rejected') || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 relative">
            {/* Detail Side Panel */}
            {detailRequest && (
                <>
                    {/* Centered Modal Overlay */}
                    <div 
                        className="fixed inset-0 bg-white/[0.01] backdrop-blur-md z-[100] animate-in fade-in duration-500 flex items-center justify-center p-4 lg:p-8"
                        onClick={() => setDetailRequest(null)}
                    >
                        {/* Premium Centered Card */}
                        <div 
                            className="bg-[#0a0c12]/90 backdrop-blur-3xl border border-white/10 w-[calc(100vw-2rem)] sm:w-full max-w-lg max-h-[82vh] sm:max-h-[75vh] rounded-[1.5rem] sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[101] animate-in zoom-in-95 duration-500 flex flex-col overflow-hidden relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Decorative Glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-fame-gold/10 blur-[80px] rounded-full" />
                            
                            {/* Header - Ultra Compact */}
                            <div className="border-b border-white/5 py-1.5 sm:py-2 px-4 sm:px-8 flex justify-between items-center shrink-0 relative z-10">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <h3 className="text-[10px] sm:text-[12px] font-black text-white uppercase tracking-[0.2em] leading-tight text-white/80">Request Details</h3>
                                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 rounded-full bg-white/[0.03] border border-white/5">
                                        <div className={`w-1 h-1 rounded-full animate-pulse ${detailRequest?.payment_status === 'paid' ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-[6px] font-black text-white/30 uppercase tracking-[0.1em]">
                                            {detailRequest?.payment_status === 'paid' ? 'PAID' : 'UNPAID'}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setDetailRequest(null)} className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-all group">
                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:rotate-90" />
                                </button>
                            </div>

                            {/* Content area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-3 sm:space-y-6 relative z-10">
                                {/* Profile Hero - Ultra Compact */}
                                <div className="flex flex-col items-center text-center pb-3 sm:pb-6 border-b border-white/5">
                                    <div className="relative mb-2 sm:mb-4 group">
                                        <div className="absolute inset-0 bg-fame-gold/15 blur-xl rounded-full opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
                                        <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-fame-gold/20 to-transparent border border-fame-gold/20 flex items-center justify-center text-fame-gold text-base sm:text-xl font-black shadow-lg relative z-10 uppercase">
                                            {detailRequest.full_name[0]}
                                        </div>
                                    </div>
                                    <h4 className="text-sm sm:text-lg font-black text-white tracking-tighter uppercase">{detailRequest.full_name}</h4>
                                    <p className="text-[6px] sm:text-[9px] font-black text-white/15 uppercase tracking-[0.4em] italic">Tactical Brief</p>
                                </div>

                                {/* Organized Information List with Separators */}
                                <div className="space-y-2.5 sm:space-y-5">
                                    {/* Email Row */}
                                    <div className="flex items-center justify-between pb-2.5 sm:pb-5 border-b border-white/5 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 group-hover:text-fame-gold transition-colors">
                                                <AtSign size={14} className="sm:w-4 sm:h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[5px] sm:text-[7px] font-black text-white/10 uppercase tracking-[0.1em] mb-0.5">Contact</p>
                                                <p className="text-[10px] sm:text-xs font-bold text-white/60">{detailRequest.email}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={10} className="text-white/5" />
                                    </div>

                                    {/* WhatsApp Row */}
                                    <div className="flex items-center justify-between pb-2.5 sm:pb-5 border-b border-white/5 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 group-hover:text-green-500 transition-colors">
                                                <Phone size={14} className="sm:w-4 sm:h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[5px] sm:text-[7px] font-black text-white/10 uppercase tracking-[0.1em] mb-0.5">Mobile</p>
                                                <p className="text-[10px] sm:text-xs font-bold text-white/60">{detailRequest.phone}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={10} className="text-white/5" />
                                    </div>

                                    {/* Appointment Row */}
                                    <div className="flex items-center justify-between pb-2.5 sm:pb-5 border-b border-white/5 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6.5 h-6.5 sm:w-8 sm:h-8 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 group-hover:text-purple-500 transition-colors">
                                                <Calendar size={14} className="sm:w-4 sm:h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[5px] sm:text-[7px] font-black text-white/10 uppercase tracking-[0.1em] mb-0.5">Strategic</p>
                                                <p className="text-[10px] sm:text-xs font-bold text-white/60">
                                                    {detailRequest.booked_date ? format(new Date(detailRequest.booked_date), 'MMM d, yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-white/5 ml-auto">{detailRequest.booked_time}</span>
                                    </div>

                                    {/* Strategic Objective */}
                                    <div className="pt-1">
                                        <div className="flex items-center gap-1.5 mb-1.5 sm:mb-3">
                                            <Zap size={10} className="text-fame-gold/30" />
                                            <span className="text-[6px] sm:text-[8px] font-black text-white/10 uppercase tracking-[0.2em]">Objective</span>
                                        </div>
                                        <p className="text-[10px] sm:text-sm font-medium text-white/30 leading-relaxed italic pl-3 border-l border-fame-gold/10">
                                            "{detailRequest?.fitness_goals || 'Mission objective pending...'}"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Bar - Ultra Compact */}
                            <div className="py-1.5 sm:py-2 px-4 sm:px-8 bg-black/60 backdrop-blur-md border-t border-white/5 flex items-center gap-3 shrink-0">
                                <button 
                                    onClick={() => handleSendRegLink(detailRequest)}
                                    className="flex-1 h-9 sm:h-11 rounded-xl border border-green-500/20 text-green-500/80 flex items-center justify-center gap-2 hover:bg-green-500 hover:text-white transition-all active:scale-95 group font-black uppercase tracking-widest text-[8px] sm:text-[10px]"
                                >
                                    <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                                    WhatsApp
                                </button>
                                
                                <button 
                                    onClick={() => { handleDelete(detailRequest.id); setDetailRequest(null); }}
                                    className="flex-1 h-9 sm:h-11 rounded-xl border border-red-500/20 text-red-500/80 flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all active:scale-95 group font-black uppercase tracking-widest text-[8px] sm:text-[10px]"
                                >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

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

                    <div className="space-y-0.5 border-t border-white/5">
                        {actionRequired.length === 0 && (
                            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl mt-4">
                                <p className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.4em] text-white/10 italic">No new mission requests.</p>
                            </div>
                        )}
                        {actionRequired.map(req => {
                            const startTime = new Date(`${req.booked_date}T${req.booked_time}`);

                            return (
                                <div 
                                    key={req.id} 
                                    onClick={() => setDetailRequest(req)}
                                    className="py-5 sm:py-6 px-2 sm:px-4 border-b border-white/5 hover:bg-white/[0.02] transition-all group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-fame-gold font-black text-xs sm:text-sm group-hover:border-fame-gold/40 transition-colors">
                                            {req.full_name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-base sm:text-lg tracking-tight uppercase group-hover:text-fame-gold transition-colors">{req.full_name}</h4>
                                            <div className="flex items-center gap-3 mt-1.5 opacity-40">
                                                <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${!req.booked_date ? 'text-red-500 opacity-100' : ''}`}>
                                                    {req.booked_date ? format(new Date(req.booked_date), 'MMM d, yyyy') : 'DATE PENDING'}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-white/30"></span>
                                                <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${!req.booked_time ? 'text-red-500 opacity-100' : ''}`}>
                                                    {req.booked_date && req.booked_time ? format(startTime, 'p') : 'TIME PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:items-end gap-3 sm:gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] sm:text-[10px] font-black text-green-400 opacity-60 uppercase tracking-widest bg-green-500/5 px-2 py-0.5 rounded border border-green-500/10">PAID {req.amount_paid} KWD</span>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleSendRegLink(req); }}
                                                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-green-500/5 hover:bg-green-500 text-green-500 hover:text-white rounded-lg transition-all border border-green-500/20 active:scale-90"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleMarkAsDone(req.id); }}
                                                    className="flex items-center gap-2 bg-fame-gold/5 hover:bg-fame-gold text-fame-gold hover:text-black px-3 sm:px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-fame-gold/20 active:scale-95"
                                                >
                                                    FINALIZE
                                                </button>
                                            </div>
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
                        
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300">
                                <span className="text-[10px] font-black text-fame-gold uppercase tracking-widest">{selectedIds.size} Selected</span>
                                <button 
                                    onClick={handleDeleteSelected}
                                    className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                >
                                    Delete Selected
                                </button>
                                <button 
                                    onClick={() => setSelectedIds(new Set())}
                                    className="p-1.5 bg-white/5 border border-white/10 text-white/40 hover:text-white rounded-lg transition-all"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-0.5 border-t border-white/5">
                        {history.length === 0 && (
                            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl mt-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 italic">Archive is empty.</p>
                            </div>
                        )}
                        {history.map(req => {
                            const startTime = new Date(`${req.booked_date}T${req.booked_time}`);
                            const isSelected = selectedIds.has(req.id);

                            return (
                                <div 
                                    key={req.id} 
                                    onClick={() => setDetailRequest(req)}
                                    className={`py-5 sm:py-6 px-2 sm:px-4 border-b border-white/5 hover:bg-white/[0.02] transition-all group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isSelected ? 'bg-fame-gold/[0.02]' : ''}`}
                                >
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <button 
                                            onClick={(e) => toggleSelect(req.id, e)}
                                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-fame-gold border-fame-gold text-black' : 'border-white/10 bg-white/5 text-transparent hover:border-white/30'}`}
                                        >
                                            <CheckCircle size={12} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                                        </button>
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20 font-black text-xs sm:text-sm group-hover:bg-white/5 transition-colors">
                                            {req.full_name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white/40 text-base sm:text-lg tracking-tight uppercase group-hover:text-white transition-colors">{req.full_name}</h4>
                                            <div className="flex items-center gap-3 mt-1.5 opacity-20 group-hover:opacity-40 transition-all">
                                                <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-widest">{req.booked_date ? format(new Date(req.booked_date), 'MMM d, yyyy') : 'N/A'}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/30"></span>
                                                <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-widest">{req.booked_time}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                                                req.status === 'completed' ? 'text-green-500/40 border-green-500/10' :
                                                req.status === 'rejected' || req.status === 'pending' ? 'text-red-500/40 border-red-500/10' :
                                                'text-fame-gold/40 border-fame-gold/10'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(req.id, e); }}
                                                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <ChevronRight size={16} className="text-white/5 group-hover:text-white/20 transition-all translate-x-1 group-hover:translate-x-2" />
                                        </div>
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
