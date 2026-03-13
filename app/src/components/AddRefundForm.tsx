import { useState, useRef, useEffect } from 'react';
import { X, DollarSign, ChevronDown, Check } from 'lucide-react';
import { useStudents } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';
import ModernSelect from './ModernSelect';

interface AddRefundFormProps {
    onClose: () => void;
    onSuccess: () => void;
    onAdd: (refund: { student_id: string; amount: number; reason?: string; refund_date: string }) => Promise<void>;
}

export default function AddRefundForm({ onClose, onSuccess, onAdd }: AddRefundFormProps) {
    const { currency } = useCurrency();
    const { data: students } = useStudents();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        student_id: '',
        amount: '',
        reason: '',
        refund_date: format(new Date(), 'yyyy-MM-dd')
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.student_id || !formData.amount) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await onAdd({
                student_id: formData.student_id,
                amount: parseFloat(formData.amount),
                reason: formData.reason || undefined,
                refund_date: formData.refund_date
            });



            toast.success('Refund added successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error adding refund:', error);
            toast.error(error.message || 'Failed to add refund');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Neutral Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className="w-full max-w-[450px] bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col max-h-[90vh]">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-8 pt-10 pb-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                Issue Refund
                            </h2>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                Financial Reversal Protocol
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Form Wrapper */}
                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col flex-1 overflow-hidden">
                    {/* Scrollable Form Body */}
                    <div className="px-8 py-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">

                        {/* Student Selection */}
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-1 group-focus-within/field:text-rose-500 transition-colors">Target Recipient *</label>
                            <ModernSelect
                                value={formData.student_id}
                                onChange={(val: any) => setFormData({ ...formData, student_id: val })}
                                options={[
                                    { value: "", label: "Assign Recipient..." },
                                    ...(students || []).map((s: any) => ({ value: s.id, label: s.full_name }))
                                ]}
                                placeholder="Select Recipient"
                                fallbackRole="Gymnast"
                            />
                        </div>

                        {/* Amount & Date Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-1 group-focus-within/field:text-rose-500 transition-colors">Reversal Amount</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-5 pr-10 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-rose-500/40 outline-none transition-all text-white text-[10px] font-bold shadow-inner"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/20 uppercase">{currency.code}</span>
                                </div>
                            </div>
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-1 group-focus-within/field:text-rose-500 transition-colors">Effective Date</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-rose-500/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest text-center shadow-inner"
                                    value={formData.refund_date}
                                    onChange={e => setFormData({ ...formData, refund_date: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2 group/field pb-8">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-1 group-focus-within/field:text-rose-500 transition-colors">Justification Memo</label>
                            <textarea
                                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-[2rem] focus:border-rose-500/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold tracking-wide resize-none h-28 shadow-inner"
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="State reason for refund..."
                            />
                        </div>
                    </div>

                    {/* Footer Section */}
                    <div className="px-8 py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6 bg-black/20">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-all duration-300 whitespace-nowrap active:scale-95"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:shadow-[0_0_40px_rgba(244,63,94,0.25)] transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="animate-pulse">Processing...</span>
                            ) : (
                                <span>Authorize Refund</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
