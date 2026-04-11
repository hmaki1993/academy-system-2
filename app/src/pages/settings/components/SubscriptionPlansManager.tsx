import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, ChevronDown, ArrowRight, Calendar, Clock, Sparkles, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrency } from '../../../context/CurrencyContext';
import { useSubscriptionPlans, useAddPlan, useDeletePlan, useUpdatePlan } from '../../../hooks/useData';
import { FullScreenPreview } from './FullScreenPreview';

interface SubscriptionPlansManagerProps {
    showFullPreview: boolean;
    setShowFullPreview: (show: boolean) => void;
    previewSettings: any;
    designMode: 'desktop' | 'mobile';
}

interface PremiumSelectProps {
    value: number;
    onChange: (val: number) => void;
    options: { value: number; label: string }[];
    label: string;
}

function PremiumSelect({ value, onChange, options, label }: PremiumSelectProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative group/select">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-2 py-4 bg-transparent border-b border-white/10 text-white flex items-center justify-between hover:border-primary/50 transition-all duration-500 group-focus-within/select:border-primary"
            >
                <div className="flex flex-col items-start">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 leading-none mb-2 group-hover/select:text-primary/50 transition-colors uppercase">{label}</span>
                    <span className="text-[15px] font-black text-white tracking-tight">{options.find(o => o.value === value)?.label}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/10 group-hover/select:text-primary transition-all duration-700 ${isOpen ? 'rotate-180 text-primary scale-110' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[1000]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-[calc(100%+10px)] left-0 right-0 z-[1001] bg-[#0a0a0a]/98 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-300">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-6 py-4 flex items-center justify-between text-left transition-all duration-300 hover:bg-primary/20 ${value === opt.value ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-white/60 hover:text-white border-l-4 border-transparent'}`}
                            >
                                <span className="text-sm font-bold uppercase tracking-wide">{opt.label}</span>
                                {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_#facc15]" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export function SubscriptionPlansManager({
    showFullPreview,
    setShowFullPreview,
    previewSettings,
    designMode
}: SubscriptionPlansManagerProps) {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const { data: plans, isLoading } = useSubscriptionPlans();
    const addPlanMutation = useAddPlan();
    const deletePlanMutation = useDeletePlan();
    const updatePlanMutation = useUpdatePlan();

    const [newPlan, setNewPlan] = useState({
        name: '',
        duration_months: '' as any,
        price: '' as any,
        sessions_per_week: 3,
        sessions_limit: 0
    });
    const [isAdding, setIsAdding] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<{ id: string, name: string, duration_months: number, price: number, sessions_per_week: number, sessions_limit?: number } | null>(null);

    // Auto-calculate sessions_limit for newPlan
    useEffect(() => {
        const duration = parseInt(newPlan.duration_months);
        if (!isNaN(duration) && newPlan.sessions_per_week) {
            const calculated = duration * newPlan.sessions_per_week * 4;
            if (newPlan.sessions_limit !== calculated) {
                setNewPlan(prev => ({
                    ...prev,
                    sessions_limit: calculated
                }));
            }
        }
    }, [newPlan.duration_months, newPlan.sessions_per_week, newPlan.sessions_limit]);

    // Auto-calculate sessions_limit for editingPlan
    useEffect(() => {
        if (editingPlan) {
            const calculated = (editingPlan.duration_months || 0) * (editingPlan.sessions_per_week || 0) * 4;
            if (editingPlan.sessions_limit !== calculated) {
                setEditingPlan(prev => prev ? { ...prev, sessions_limit: calculated } : null);
            }
        }
    }, [editingPlan?.duration_months, editingPlan?.sessions_per_week]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan || !editingPlan.name) return;
        try {
            await updatePlanMutation.mutateAsync(editingPlan);
            toast.success('Plan updated successfully');
            setEditingPlan(null);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to update plan:', error);
            toast.error(`Error: ${error.message || 'Failed to update plan'}`);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const duration = parseInt(newPlan.duration_months);
        const price = parseFloat(newPlan.price);

        if (!newPlan.name || isNaN(duration) || isNaN(price)) {
            toast.error('Please fill all fields correctly');
            return;
        }

        try {
            await addPlanMutation.mutateAsync({
                ...newPlan,
                duration_months: duration,
                price: price
            });
            toast.success('Plan added successfully');
            setNewPlan({ name: '', duration_months: '' as any, price: '' as any, sessions_per_week: 3, sessions_limit: 0 });
            setIsAdding(false);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to add plan:', error);
            toast.error(`Error: ${error.message || 'Failed to add plan'}`);
        }
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        try {
            await deletePlanMutation.mutateAsync(planToDelete);
            toast.success('Plan deleted');
            setPlanToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to delete plan:', error);
            if (error?.code === '23503' || error?.message?.includes('foreign key constraint') || error?.details?.includes('still referenced')) {
                toast.error(t('settings.planInUseError') || 'Cannot delete: Plan is assigned to students/subscriptions.');
            } else {
                toast.error(`Error: ${error.message || 'Failed to delete plan'}`);
            }
            setPlanToDelete(null);
        }
    };

    return (
        <div className="space-y-8 relative group/manager">
            {/* Background Glow - More subtle for weightless */}
            <div className="absolute -top-48 -right-48 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none group-hover/manager:bg-primary/10 transition-all duration-1000"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10 pr-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/10 shrink-0">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-[0.2em] leading-tight">
                            {t('settings.subscriptionPlans')}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <div className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-primary/50 to-transparent"></div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] whitespace-nowrap">Elite Training Packages</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`w-full md:w-fit px-6 py-4 md:p-3 rounded-2xl transition-all duration-500 shadow-xl flex items-center justify-center gap-3 ${isAdding ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 hover:scale-105'}`}
                >
                    <Plus className={`w-6 h-6 transition-transform duration-500 ${isAdding ? 'rotate-45' : ''}`} />
                    <span className="md:hidden font-black uppercase tracking-[0.2em] text-[10px]">{isAdding ? 'Close Form' : 'Add New Plan'}</span>
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-10 p-10 bg-white/[0.01] rounded-[3rem] border border-white/[0.03] space-y-8 animate-in zoom-in slide-in-from-top-4 duration-500 relative z-[100] transition-all">
                    <div className="space-y-4 group/input">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/input:text-primary transition-colors">{t('settings.planName')}</label>
                        <input
                            type="text"
                            value={newPlan.name}
                            onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                            placeholder="Enter Package Name"
                            className="w-full bg-transparent border-b border-white/[0.05] py-4 text-white text-lg font-black tracking-tight outline-none focus:border-primary transition-all placeholder:text-white/5"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <PremiumSelect
                            label={t('settings.sessionsPerWeek')}
                            value={newPlan.sessions_per_week}
                            onChange={val => setNewPlan({ ...newPlan, sessions_per_week: val })}
                            options={[1, 2, 3, 4, 5, 6].map(num => ({ value: num, label: `${num} ${t('coaches.sessions')}` }))}
                        />
                        <div className="space-y-4 group/input">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/input:text-primary transition-colors">{t('settings.months')}</label>
                            <input
                                type="number"
                                min="1"
                                value={newPlan.duration_months}
                                onChange={e => setNewPlan({ ...newPlan, duration_months: e.target.value })}
                                className="w-full bg-transparent border-b border-white/[0.05] py-4 text-white text-lg font-black tracking-tight outline-none focus:border-primary transition-all placeholder:text-white/5"
                            />
                        </div>
                        <div className="space-y-4 group/input">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/input:text-primary transition-colors">Total Sessions</label>
                            <input
                                type="number"
                                value={newPlan.sessions_limit}
                                onChange={e => setNewPlan({ ...newPlan, sessions_limit: parseInt(e.target.value) || 0 })}
                                className="w-full bg-transparent border-b border-white/[0.1] py-4 text-emerald-400 text-lg font-black tracking-tight outline-none focus:border-emerald-500 transition-all placeholder:text-white/5"
                            />
                        </div>
                        <div className="space-y-4 group/input">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/input:text-primary transition-colors">{t('settings.price')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={newPlan.price}
                                    onChange={e => setNewPlan({ ...newPlan, price: e.target.value })}
                                    className="w-full bg-transparent border-b border-white/[0.05] py-4 text-white text-lg font-black tracking-tight outline-none focus:border-primary transition-all placeholder:text-white/5"
                                />
                                <span className="absolute right-0 bottom-4 text-[10px] font-black text-white/40 uppercase pointer-events-none">{currency.code}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!newPlan.name || !newPlan.duration_months || !newPlan.price}
                        className="w-full bg-primary text-white py-4.5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:scale-[1.01] transition-all shadow-xl shadow-primary/30 group/submit mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {t('settings.saveNewPlan')}
                            <ArrowRight className="w-5 h-5 group-hover/submit:translate-x-1 transition-transform duration-300" />
                        </span>
                    </button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 pt-4">
                {isLoading ? (
                    <div className="col-span-full py-12 text-center text-white/20 animate-pulse uppercase font-black text-[10px] tracking-[0.3em]">{t('settings.loadingPlans')}</div>
                ) : plans?.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-white/20 uppercase font-black text-[10px] tracking-[0.3em] border-2 border-dashed border-white/5 rounded-[2rem]">{t('settings.noPlans')}</div>
                ) : (
                    plans?.map((plan, idx) => (
                        <div key={plan.id} className={`group/card relative transition-all duration-500 ${editingPlan?.id === plan.id ? 'z-[110]' : 'z-10'}`}>
                            <div className="relative h-full bg-white/[0.01] backdrop-blur-sm rounded-[3rem] border border-white/[0.03] hover:border-primary/20 p-10 flex flex-col justify-between transition-all duration-500 overflow-hidden shadow-2xl shadow-black/20">
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 blur-[60px] rounded-full pointer-events-none group-hover/card:bg-primary/10 transition-all duration-700"></div>
                                {editingPlan?.id === plan.id ? (
                                    <form onSubmit={handleUpdate} className="space-y-5 animate-in fade-in zoom-in-95 duration-300 relative z-10 w-full">
                                        {/* ... (Existing Form Logic Unchanged but container simplified) */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.planName')}</label>
                                            <input
                                                type="text"
                                                value={editingPlan?.name || ''}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, name: e.target.value })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px] placeholder:text-white/10 uppercase tracking-tight"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <PremiumSelect
                                                label="Sessions/Week"
                                                value={editingPlan?.sessions_per_week || 3}
                                                onChange={val => editingPlan && setEditingPlan({ ...editingPlan, sessions_per_week: val })}
                                                options={[1, 2, 3, 4, 5, 6].map(num => ({ value: num, label: `${num} Sessions` }))}
                                            />
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.months')}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editingPlan?.duration_months || 1}
                                                    onChange={e => editingPlan && setEditingPlan({ ...editingPlan, duration_months: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Total Sessions</label>
                                            <input
                                                type="number"
                                                value={editingPlan?.sessions_limit || 0}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, sessions_limit: parseInt(e.target.value) || 0 })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-emerald-400 outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.price')} ({currency.code})</label>
                                            <input
                                                type="number"
                                                value={editingPlan?.price || 0}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button type="submit" className="bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">{t('common.save')}</button>
                                            <button type="button" onClick={() => setEditingPlan(null)} className="bg-white/5 text-white/60 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all">{t('common.cancel')}</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="relative mb-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-1">
                                                        Package {idx + 1}
                                                    </span>
                                                    <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight group-hover/card:text-primary transition-colors leading-tight">
                                                        {plan.name}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-2 md:opacity-0 md:group-hover/card:opacity-100 transition-all duration-300">
                                                    <button onClick={() => setEditingPlan(plan as any)} className="p-2 rounded-xl bg-white/10 md:bg-white/5 text-white/60 md:text-white/40 hover:text-primary hover:bg-primary/10 transition-all"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => setPlanToDelete(plan.id)} className="p-2 rounded-xl bg-white/10 md:bg-white/5 text-white/60 md:text-white/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-0 mb-10">
                                            <div className="flex items-center gap-5 py-4 group/item">
                                                <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover/item:scale-110 transition-transform duration-500">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">{t('common.schedule')}</span>
                                                    <span className="text-[15px] font-black text-white uppercase tracking-tight">{plan.sessions_per_week} Sessions / Week</span>
                                                </div>
                                            </div>

                                            <div className="h-[1px] w-full bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-transparent" />

                                            <div className="flex items-center gap-5 py-4 group/item">
                                                <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover/item:scale-110 transition-transform duration-500">
                                                    <Clock className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">{t('settings.validity')}</span>
                                                    <span className="text-[15px] font-black text-white uppercase tracking-tight">{plan.duration_months} {plan.duration_months === 1 ? t('dashboard.month') : `${t('dashboard.month')}s`}</span>
                                                </div>
                                            </div>

                                            <div className="h-[1px] w-full bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-transparent" />

                                            <div className="flex items-center gap-5 py-4 group/item">
                                                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover/item:scale-110 transition-transform duration-500">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Total Limit</span>
                                                    <span className="text-[15px] font-black text-emerald-400 uppercase tracking-tight">{plan.sessions_limit ? `${plan.sessions_limit} Sessions` : 'Unlimited'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between border-t border-white/5 pt-6">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">{t('settings.packageValue')}</span>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-3xl font-black text-white leading-none tracking-tighter">{plan.price > 0 ? plan.price : 'FREE'}</span>
                                                    {plan.price > 0 && <span className="text-[10px] font-black text-primary uppercase">{currency.code}</span>}
                                                </div>
                                            </div>
                                            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-0 -translate-x-4 transition-all duration-500">
                                                <ArrowRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {planToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="glass-card max-w-sm w-full p-10 rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(244,63,94,0.15)] relative animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-6 bg-rose-500/10 rounded-full text-rose-500 mb-6 animate-bounce">
                                <AlertTriangle className="w-10 h-10 shadow-lg shadow-rose-500/20" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">{t('settings.deleteConfirmTitle')}</h3>
                            <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed mb-10">{t('settings.deleteConfirmText')}</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setPlanToDelete(null)} className="flex-1 px-6 py-4 rounded-xl bg-white/5 text-white/60 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">{t('common.cancel')}</button>
                                <button onClick={handleDelete} className="flex-1 px-6 py-4 rounded-xl bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-rose-500/30 hover:bg-rose-600 transition-all hover:scale-105">{t('common.delete')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <FullScreenPreview
                show={showFullPreview}
                onClose={() => setShowFullPreview(false)}
                previewSettings={previewSettings}
                designMode={designMode}
            />
        </div>
    );
}
