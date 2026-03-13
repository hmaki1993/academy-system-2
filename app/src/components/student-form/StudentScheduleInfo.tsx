import { useTranslation } from 'react-i18next';
import { DAYS_OF_WEEK } from '../../constants/scheduleConstants';

interface StudentScheduleInfoProps {
    formData: any;
    toggleDay: (day: string) => void;
    updateTime: (day: string, type: 'start' | 'end', value: string) => void;
}

export default function StudentScheduleInfo({ formData, toggleDay, updateTime }: StudentScheduleInfoProps) {
    const { t } = useTranslation();
    // Imported from scheduleConstants — no hardcoding needed

    return (
        <div className="space-y-6 pt-6 border-t border-white/[0.05]">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1">
                {t('students.trainingDays', 'Attendance Cycle')}
            </label>
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day: string) => {
                        const isActive = formData.training_days.includes(day);
                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className={`px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isActive
                                    ? 'bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/5'
                                    : 'bg-white/[0.02] border-white/5 text-white/20 hover:bg-white/[0.05] hover:border-white/10'
                                    }`}
                            >
                                {t(`students.days.${day.toLowerCase()}`)}
                            </button>
                        );
                    })}
                </div>

                {/* Time Inputs for Active Days */}
                <div className="grid grid-cols-1 gap-3 mt-2">
                    {formData.training_schedule.map((schedule: any) => (
                        <div
                            key={schedule.day}
                            className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-row items-center justify-between gap-3 animate-in zoom-in-95 duration-500"
                        >
                            <span className="text-[10px] font-black uppercase text-accent tracking-[0.3em] min-w-[50px]">
                                {t(`students.days.${schedule.day.toLowerCase()}`)}
                            </span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                                <input
                                    type="time"
                                    value={schedule.start}
                                    onChange={(e) => updateTime(schedule.day, 'start', e.target.value)}
                                    className="w-full max-w-[100px] bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:border-primary/40 transition-all outline-none [color-scheme:dark]"
                                />
                                <span className="text-white/10 text-[8px] font-black">-</span>
                                <input
                                    type="time"
                                    value={schedule.end}
                                    onChange={(e) => updateTime(schedule.day, 'end', e.target.value)}
                                    className="w-full max-w-[100px] bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:border-primary/40 transition-all outline-none [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
