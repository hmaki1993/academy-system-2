import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';
import PremiumSelect from './PremiumSelect';

interface AddExpenseFormProps {
    onClose: () => void;
    onSuccess: () => void;
    onAdd: (expense: { description: string; amount: number; category: string; expense_date: string }) => Promise<void>;
}

export default function AddExpenseForm({ onClose, onSuccess, onAdd }: AddExpenseFormProps) {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'other',
        expense_date: format(new Date(), 'yyyy-MM-dd')
    });

    const categories = [
        { value: 'rent', label: 'Rent' },
        { value: 'equipment', label: 'Equipment' },
        { value: 'utilities', label: 'Utilities (Electric, Water, etc.)' },
        { value: 'salaries', label: 'Salaries & Bonuses' },
        { value: 'other', label: 'Other' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await onAdd({
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category,
                expense_date: formData.expense_date
            });



            toast.success('Expense added successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error adding expense:', error);
            toast.error(error.message || 'Failed to add expense');
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

            <div className="w-full max-w-[450px] bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col max-h-[90vh]">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-8 pt-10 pb-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                Add Expense
                            </h2>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                Financial Outflow Transaction
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
                        {/* Description */}
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-1 group-focus-within/field:text-primary transition-colors">Description *</label>
                            <input
                                required
                                type="text"
                                className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs tracking-wide font-bold shadow-inner"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter description..."
                            />
                        </div>

                        {/* Amount & Date */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-1 group-focus-within/field:text-primary transition-colors">Amount ({currency.code}) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs tracking-wide font-bold shadow-inner"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-1 group-focus-within/field:text-primary transition-colors">Date *</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full px-5 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest text-center shadow-inner"
                                    value={formData.expense_date}
                                    onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-2 group/field pb-12">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 ml-1 group-focus-within/field:text-primary transition-colors">Category *</label>
                            <PremiumSelect
                                required
                                value={formData.category}
                                onChange={val => setFormData({ ...formData, category: val })}
                                options={categories}
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
                            className="w-full py-4 bg-gradient-to-r from-primary to-primary-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
