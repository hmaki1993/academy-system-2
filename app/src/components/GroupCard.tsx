import React from 'react';
import { User, ChevronRight, Edit2, Trash2, Clock, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GroupCardProps {
    group: any;
    onViewDetails: (group: any) => void;
}

export default function GroupCard({ group, onViewDetails, onEdit, onDelete }: {
    group: any;
    onViewDetails: (group: any) => void;
    onEdit?: (group: any) => void;
    onDelete?: (group: any) => void;
}) {
    const { t, i18n } = useTranslation();

    const getScheduleInfo = (key: string) => {
        if (!key) return { days: [], time: '' };

        try {
            const parts = key.split('|');
            if (parts.length === 0) return { days: [], time: '' };

            const firstPart = parts[0].split(':');

            let startTime = '';
            let endTime = '';

            if (firstPart.length >= 5) {
                // New format: day:startH:startM:endH:endM
                startTime = `${firstPart[1]}:${firstPart[2]}`;
                endTime = `${firstPart[3]}:${firstPart[4]}`;
            } else {
                // Legacy support
                startTime = firstPart[1];
                endTime = firstPart[2];
            }

            // Format time in 12h format
            const formatTime = (timeStr: string) => {
                if (!timeStr || timeStr.toLowerCase().includes('undefined')) return '';
                const parts = timeStr.split(':');
                if (parts.length < 1) return '';

                let hour = parseInt(parts[0]);
                let minute = parts[1] || '00';

                if (isNaN(hour)) return '';

                const ampm = hour >= 12 ? (i18n.language === 'ar' ? 'م' : 'PM') : (i18n.language === 'ar' ? 'ص' : 'AM');
                const hour12 = hour % 12 || 12;
                return `${hour12}:${minute} ${ampm}`;
            };

            const fStart = formatTime(startTime);
            const fEnd = formatTime(endTime);

            const timeRange = fStart && fEnd
                ? `${fStart} - ${fEnd}`
                : fStart || fEnd || '';

            return {
                days: parts.map((p: string) => p.split(':')[0]).filter(Boolean),
                time: timeRange
            };
        } catch (e) {
            console.error('Schedule parsing error:', e);
            return { days: [], time: '' };
        }
    };

    const { days, time } = getScheduleInfo(group.schedule_key);

    return (
        <div className="glass-card p-4 md:p-6 rounded-2xl border border-white/10 relative group hover:-translate-y-1 transition-all duration-500 flex flex-col h-full bg-[#0a0c10]/40 backdrop-blur-xl">
            <div className="relative z-10 flex flex-col h-full">
                {/* Header Row: Student Count & edit/delete */}
                <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-white/40 uppercase tracking-widest border border-white/5 uppercase">
                        {group.students?.length || group.students?.[0]?.count || 0} {t('common.students')}
                    </span>
                    
                    {(onEdit || onDelete) && (
                        <div className="flex items-center gap-1">
                            {onEdit && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(group); }}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(group); }}
                                    className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <h3 className="text-lg md:text-xl font-black text-white tracking-tight mb-2 group-hover:text-primary transition-colors">
                    {group.name}
                </h3>

                {group.coaches?.full_name && (
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 flex items-center justify-center border border-white/10">
                            <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            {group.coaches.full_name}
                        </span>
                    </div>
                )}

                <div className="mt-auto space-y-4">
                    {group.schedule_key && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono tracking-widest uppercase">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono tracking-widest uppercase">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span>{days.map(d => t(`students.days.${d.toLowerCase().substring(0, 3)}`)).join(' / ')}</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => onViewDetails(group)}
                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-primary text-white/60 hover:text-black border border-white/10 hover:border-primary/20 font-black text-[10px] uppercase tracking-widest transition-all duration-300 group/btn flex items-center justify-center gap-2"
                    >
                        {t('dashboard.viewAll')}
                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
