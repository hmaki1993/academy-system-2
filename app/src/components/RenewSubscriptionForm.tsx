import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, RefreshCw, Calendar, DollarSign } from 'lucide-react';
import { parseISO, addMonths, format } from 'date-fns';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscriptionPlans } from '../hooks/useData';
import { useCurrency } from '../context/CurrencyContext';
import PremiumSelect from './PremiumSelect';

interface RenewSubscriptionFormProps {
    student: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RenewSubscriptionForm({ student, onClose, onSuccess }: RenewSubscriptionFormProps) {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const { data: plansData } = useSubscriptionPlans();
    const plans = plansData || [];

    const [formData, setFormData] = useState({
        subscription_plan_id: student.subscription_plan_id || (plans.length > 0 ? plans[0].id : ''),
        start_date: format(new Date(), 'yyyy-MM-dd'),
        expiry_date: ''
    });

    // Auto-calculate expiry when plan or start date changes
    useEffect(() => {
        if (formData.subscription_plan_id && formData.start_date && plans.length > 0) {
            const plan = plans.find(p => p.id === formData.subscription_plan_id);
            if (plan) {
                const startDate = parseISO(formData.start_date);
                const expiryDate = addMonths(startDate, plan.duration_months);
                setFormData(prev => ({ ...prev, expiry_date: format(expiryDate, 'yyyy-MM-dd') }));
            }
        }
    }, [formData.subscription_plan_id, formData.start_date, plans]);

    // Set default plan when plans load
    useEffect(() => {
        if (plans.length > 0 && !formData.subscription_plan_id) {
            setFormData(prev => ({ ...prev, subscription_plan_id: plans[0].id }));
        }
    }, [plans]);

    const selectedPlan = plans.find(p => p.id === formData.subscription_plan_id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Update student subscription
            const { error: updateError } = await supabase
                .from('students')
                .update({
                    subscription_expiry: formData.expiry_date,
                    subscription_plan_id: formData.subscription_plan_id
                })
                .eq('id', student.id);

            if (updateError) throw updateError;

            // 2. Record payment
            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    student_id: student.id,
                    amount: selectedPlan?.price || 0,
                    payment_date: formData.start_date,
                    payment_method: 'cash',
                    notes: `Subscription renewal - ${selectedPlan?.name}`
                });

            if (paymentError) throw paymentError;

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });

            toast.success('Subscription renewed successfully! 🎉', {
                icon: '✅',
                style: {
                    borderRadius: '20px',
                    background: '#10B981',
                    color: '#fff',
                },
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error renewing subscription:', error);
            toast.error(`Error: ${(error as any).message}`);
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
                <div className="relative z-10 px-8 pt-10 pb-6 border-b border-white/5 flex-shrink-0 bg-primary/5">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight truncate">
                                Renew Subscription
                            </h2>
                            <p className="text-[9px] font-black text-primary uppercase tracking-widest">
                                {student.full_name} • Extension Protocol
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Expiration Banner */}
                <div className="relative z-10 px-8 py-3 bg-rose-500/10 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-rose-500/60">Current Expiry</p>
                        <p className="text-[11px] font-black text-rose-500 tracking-wider">
                            {student.subscription_expiry ? format(parseISO(student.subscription_expiry), 'MMM dd, yyyy') : 'N/A'}
                        </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/20">
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Cycle Expired</span>
                    </div>
                </div>

                {/* Scrollable Form Body */}
                <form onSubmit={handleSubmit} className="relative z-10 px-8 py-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                    {/* Plan Selection */}
                    <div className="space-y-2 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Target Service Tier</label>
                        <PremiumSelect
                            required
                            value={formData.subscription_plan_id}
                            onChange={val => setFormData({ ...formData, subscription_plan_id: val })}
                            options={plans.map(plan => ({
                                value: plan.id,
                                label: `${plan.name} — ${plan.price} ${currency.code}`
                            }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Start Date */}
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Activation Date</label>
                            <div className="relative">
                                <input
                                    required
                                    type="date"
                                    className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Expiry Date */}
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Renewal Expiry</label>
                            <div className="relative">
                                <input
                                    required
                                    type="date"
                                    className="w-full px-8 py-3.5 bg-primary/5 border border-primary/20 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-primary font-black text-sm tracking-widest"
                                    value={formData.expiry_date}
                                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Investment Summary */}
                    {selectedPlan && (
                        <div className="p-6 bg-white/[0.01] border border-white/5 rounded-[2rem] space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Active Lifecycle</span>
                                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{selectedPlan.duration_months} Month(s)</span>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Renewal Total</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-white tracking-tighter">{selectedPlan.price}</span>
                                    <span className="text-[10px] font-black text-white/20 uppercase">{currency.code}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer Section - Single Premium Button */}
                <div className="relative z-10 px-8 py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-4 rounded-3xl bg-primary text-white hover:bg-primary/90 transition-all duration-500 shadow-[0_20px_40px_rgba(var(--primary-rgb),0.2)] active:scale-95 flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Processing...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] group-hover:tracking-[0.5em] transition-all duration-500">
                                Authorize Renewal
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
