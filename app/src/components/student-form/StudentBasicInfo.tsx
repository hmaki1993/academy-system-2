import { useTranslation } from 'react-i18next';
import PremiumSelect from '../PremiumSelect';

interface StudentBasicInfoProps {
    formData: any;
    setFormData: (data: any) => void;
    calculateAge: (date: string) => number;
    groups: any[];
    handleGroupChange: (groupId: string) => void;
}

export default function StudentBasicInfo({ formData, setFormData, calculateAge, groups, handleGroupChange }: StudentBasicInfoProps) {
    const { t, i18n } = useTranslation();

    return (
        <div className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2 group/field">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('common.fullName', 'Full Name')}</label>
                <input
                    required
                    type="text"
                    className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs tracking-wide font-bold"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
            </div>

            {/* Birth Date & Age */}
            <div className="space-y-2 group/field">
                <div className="flex items-center justify-between ml-1">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 group-focus-within/field:text-primary transition-colors">{t('students.birthDate', 'Birth Date')}</label>
                    {formData.birth_date && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                            {calculateAge(formData.birth_date)} {i18n.language === 'ar' ? 'سنة' : 'Years Old'}
                        </span>
                    )}
                </div>
                <input
                    required
                    type="date"
                    className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold uppercase tracking-widest"
                    value={formData.birth_date}
                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                />
            </div>

            {/* Gender Toggle */}
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1">Gender</label>
                <div className="flex bg-white/[0.02] rounded-2xl p-1.5 border border-white/5 relative">
                    {['male', 'female'].map(g => (
                        <button key={g} type="button" onClick={() => setFormData({ ...formData, gender: g })}
                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 relative z-10 ${formData.gender === g ? 'text-white' : 'text-white/20 hover:text-white/40'}`}>
                            {g}
                        </button>
                    ))}
                    <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-500 ease-out shadow-lg ${formData.gender === 'male' ? 'left-1.5 bg-blue-600/20 border border-blue-500/30' : 'left-[calc(50%+3px)] bg-pink-600/20 border border-pink-500/30'}`}></div>
                </div>
            </div>

            {/* Training Type */}
            <div className="space-y-2 group/field">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Program</label>
                <PremiumSelect
                    required
                    value={formData.training_type}
                    onChange={val => setFormData({ ...formData, training_type: val })}
                    options={[
                        { value: "Artistic Gymnastics", label: "Artistic Gymnastics" },
                        { value: "Rhythmic Gymnastics", label: "Rhythmic Gymnastics" },
                        { value: "Parkour", label: "Parkour" },
                        { value: "Fitness", label: "Fitness" }
                    ]}
                    placeholder="Sport Program"
                    fallbackRole="Program"
                />
            </div>

            {/* Training Group Selector */}
            <div className="space-y-2 group/field">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Training Group</label>
                <PremiumSelect
                    value={formData.training_group_id}
                    onChange={val => handleGroupChange(val as string)}
                    options={[
                        { value: "", label: "None (Individual)" },
                        ...(groups || []).map(group => ({
                            value: group.id,
                            label: group.name
                        }))
                    ]}
                    placeholder="Training Group"
                    fallbackRole="Group"
                />
                <p className="text-[8px] text-white/20 uppercase tracking-widest ml-1">Selecting a group auto-fills schedule and coach</p>
            </div>
        </div>
    );
}
