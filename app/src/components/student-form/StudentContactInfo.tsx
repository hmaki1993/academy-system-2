import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { formatDynamicPhone } from '../../utils/phoneUtils';
import { COUNTRIES } from '../../constants/countries';

export default function StudentContactInfo({ formData, setFormData }: { formData: any, setFormData: any }) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            {/* Primary Guardian & Phone */}
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2 group/field">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Primary Guardian</label>
                    <input
                        type="text"
                        className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                        value={formData.father_name}
                        onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                    />
                </div>
                <div className="space-y-2 group/field">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('common.phone', "Phone")}</label>
                    <div className="flex gap-3 relative">
                        <div className="relative group/dropdown">
                            <button type="button" className="h-full pl-4 pr-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-2 hover:border-primary/40 transition-all min-w-[90px]">
                                <span className="text-lg filter drop-shadow-lg">{COUNTRIES.find(c => c.dial_code === formData.country_code_student)?.flag}</span>
                                <ChevronDown className="w-3 h-3 text-white/20 group-hover/dropdown:text-primary transition-colors" />
                            </button>
                            <div className="absolute top-[110%] left-0 w-64 bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden hidden group-hover/dropdown:block shadow-2xl max-h-48 overflow-y-auto custom-scrollbar z-50">
                                {COUNTRIES.map((c:any) => (
                                    <button key={c.code} type="button" onClick={() => setFormData({ ...formData, country_code_student: c.dial_code })} className="flex items-center gap-3 w-full px-5 py-3 hover:bg-white/5 transition-all text-left border-b border-white/5 last:border-0 group/item">
                                        <span className="text-xl">{c.flag}</span>
                                        <span className="text-[10px] font-bold text-white/40 group-hover/item:text-white flex-1 uppercase tracking-wider">{c.name}</span>
                                        <span className="text-[9px] font-black text-primary">{c.dial_code}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            required
                            type="tel"
                            className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold tracking-wide"
                            value={formData.contact_number}
                            onChange={e => {
                                const { code, number } = formatDynamicPhone(e.target.value, formData.country_code_student);
                                setFormData({ ...formData, contact_number: number, country_code_student: code });
                            }}
                            placeholder=""
                        />
                    </div>
                </div>
            </div>

            {/* Secondary Guardian & WhatsApp */}
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2 group/field">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Secondary Guardian</label>
                    <input
                        type="text"
                        className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                        value={formData.mother_name}
                        onChange={e => setFormData({ ...formData, mother_name: e.target.value })}
                    />
                </div>
                <div className="space-y-2 group/field">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 ml-1 group-focus-within/field:text-emerald-300 transition-colors">{t('common.reportsPhone', "Reports Phone")}</label>
                    <div className="flex gap-3 relative">
                        <div className="relative group/dropdown">
                            <button type="button" className="h-full pl-4 pr-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-2 hover:border-emerald-500/40 transition-all min-w-[90px]">
                                <span className="text-lg filter drop-shadow-lg">{COUNTRIES.find(c => c.dial_code === formData.country_code_parent)?.flag}</span>
                                <ChevronDown className="w-3 h-3 text-white/20 group-hover/dropdown:text-emerald-400 transition-colors" />
                            </button>
                            <div className="absolute top-[110%] left-0 w-64 bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden hidden group-hover/dropdown:block shadow-2xl max-h-48 overflow-y-auto custom-scrollbar z-50">
                                {COUNTRIES.map((c:any) => (
                                    <button key={c.code} type="button" onClick={() => setFormData({ ...formData, country_code_parent: c.dial_code })} className="flex items-center gap-3 w-full px-5 py-3 hover:bg-emerald-500/10 transition-all text-left border-b border-white/5 last:border-0 group/item">
                                        <span className="text-xl">{c.flag}</span>
                                        <span className="text-[10px] font-bold text-white/40 group-hover/item:text-white flex-1 uppercase tracking-wider">{c.name}</span>
                                        <span className="text-[9px] font-black text-emerald-500">{c.dial_code}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            type="tel"
                            className="w-full px-8 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-emerald-500/40 outline-none transition-all text-white placeholder:text-white/10 text-sm font-bold tracking-wide"
                            value={formData.parent_contact}
                            onChange={e => {
                                const { code, number } = formatDynamicPhone(e.target.value, formData.country_code_parent);
                                setFormData({ ...formData, parent_contact: number, country_code_parent: code });
                            }}
                            placeholder=""
                        />
                    </div>
                </div>
            </div>

            {/* Email & Address */}
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2 group/field text-sm">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Email Address</label>
                    <input
                        type="email"
                        className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
                <div className="space-y-2 group/field text-sm">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Physical Address</label>
                    <input
                        type="text"
                        className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
