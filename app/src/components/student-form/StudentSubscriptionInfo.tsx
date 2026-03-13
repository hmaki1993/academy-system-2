import { useTranslation } from 'react-i18next';
import PremiumSelect from '../PremiumSelect';
import { useCoaches } from '../../hooks/useData';
import { useCurrency } from '../../context/CurrencyContext';

interface StudentSubscriptionInfoProps {
    formData: any;
    setFormData: (data: any) => void;
    plans: any[];
}

export default function StudentSubscriptionInfo({ formData, setFormData, plans }: StudentSubscriptionInfoProps) {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const { data: coaches } = useCoaches();

    return (
        <div className="space-y-6 pt-6 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 ml-1 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"></div>
                <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                    Subscription Details
                </h3>
            </div>

            <div className="space-y-3 group/field">
                <div className="flex items-center justify-between ml-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 group-focus-within/field:text-primary transition-colors">Plan Type</label>
                    {plans.find(p => p.id === formData.subscription_type)?.sessions_limit && (
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20 mr-2">
                            {plans.find(p => p.id === formData.subscription_type)?.sessions_limit} Sessions
                        </span>
                    )}
                    {plans.find(p => p.id === formData.subscription_type)?.price > 0 && (
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                            {plans.find(p => p.id === formData.subscription_type)?.price} {currency.code}
                        </span>
                    )}
                </div>
                <PremiumSelect
                    value={formData.subscription_type}
                    onChange={val => setFormData({ ...formData, subscription_type: val })}
                    options={[
                        { value: "", label: "Select Plan" },
                        ...plans.map(plan => ({
                            value: plan.id,
                            label: plan.name
                        }))
                    ]}
                    placeholder="Subscription Plan"
                    fallbackRole="Plan"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 group/field">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Start Date</label>
                    <input
                        type="date"
                        className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest"
                        value={formData.subscription_start}
                        onChange={e => setFormData({ ...formData, subscription_start: e.target.value })}
                    />
                </div>
                <div className="space-y-2 group/field">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Expiry Date</label>
                    <input
                        type="date"
                        className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest"
                        value={formData.subscription_expiry}
                        onChange={e => setFormData({ ...formData, subscription_expiry: e.target.value })}
                    />
                </div>
            </div>

            <div className="space-y-2 group/field">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Assigned Coach</label>
                <PremiumSelect
                    value={formData.coach_id}
                    onChange={val => setFormData({ ...formData, coach_id: val })}
                    options={[
                        { value: "", label: t('students.selectCoach') },
                        ...(coaches?.filter((c:any) => c.role !== 'reception' && c.role !== 'cleaner') || []).map((coach:any) => ({
                            value: coach.id,
                            label: `${coach.full_name} (${t(`roles.${coach.role}`)})`
                        }))
                    ]}
                    fallbackRole="Coach"
                />
            </div>
            
            {/* Notes */}
            <div className="space-y-2 group/field">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Additional Notes</label>
                <textarea
                    placeholder=""
                    className="w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-[2rem] focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs min-h-[100px] resize-none"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                ></textarea>
            </div>
        </div>
    );
}
