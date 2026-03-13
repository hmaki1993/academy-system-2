import React from 'react';
import { X, User, Calendar, Star, Users, ArrowRight, Sparkles, Pencil } from 'lucide-react';
import { parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { calculateAge } from '../utils/dateUtils';

interface Student {
    id: string;
    full_name: string;
    birth_date: string;
}

interface Group {
    id: string;
    name: string;
    schedule_key: string;
    students: Student[];
    coaches?: {
        full_name: string;
    };
}

interface GroupDetailsModalProps {
    group: Group;
    onClose: () => void;
    onEdit?: () => void;
}

export default function GroupDetailsModal({ group, onClose, onEdit }: GroupDetailsModalProps) {
    const { t, i18n } = useTranslation();


    const isSuspiciousDate = (dob: string) => {
        if (!dob) return false;
        try {
            const year = parseISO(dob).getFullYear();
            return year < 1900 || year > new Date().getFullYear();
        } catch {
            return true;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Neutral Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className="w-full max-w-[360px] bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section - Sophisticated & Clean */}
                <div className="relative z-10 px-8 pt-10 pb-6 border-b border-white/5">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg">
                                {group.name}
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <Users className="w-3 h-3 text-white" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white">{group.students?.length || 0} Students</span>
                                </div>
                                {group.coaches?.full_name && (
                                    <>
                                        <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                            Coach {group.coaches.full_name.split(' ')[0]}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Schedule Display */}
                {group.schedule_key && (
                    <div className="relative z-10 px-8 py-4 border-b border-white/5 flex flex-wrap gap-2">
                        {group.schedule_key.split('|').map((part, i) => {
                            const subParts = part.split(':');
                            if (subParts.length < 5) return null;
                            const [day, startH, startM, endH, endM] = subParts;
                            const dayName = t(`students.days.${day.substring(0, 3).toLowerCase()}`);
                            const startTime = `${startH}:${startM}`;
                            const endTime = `${endH}:${endM}`;
                            return (
                                <div key={i} className="flex flex-col bg-white/5 px-3 py-2 rounded-2xl border border-white/5">
                                    <span className="text-[8px] font-black uppercase text-primary tracking-widest leading-none mb-1">{dayName}</span>
                                    <span className="text-[10px] font-bold text-white tracking-widest leading-none">{startTime} - {endTime}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Body - Clean List */}
                <div className="relative z-10 px-8 pb-4 max-h-[40vh] overflow-y-auto custom-scrollbar pt-6">
                    {group.students.length === 0 ? (
                        <div className="text-center py-12 opacity-20">
                            <p className="text-[9px] text-white font-black uppercase tracking-[0.3em]">{t('common.rosterEmpty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {group.students.map((student, idx) => {
                                const suspicious = isSuspiciousDate(student.birth_date);
                                return (
                                    <div
                                        key={student.id}
                                        className="group/item flex items-center justify-between animate-in slide-in-from-left-4 duration-500 fill-mode-both"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 h-6 flex items-center justify-center font-black text-[10px] text-white/20 group-hover/item:text-primary transition-colors">
                                                {String(idx + 1).padStart(2, '0')}
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-[12px] font-black text-white/80 group-hover/item:text-white transition-colors uppercase tracking-tight">
                                                    {student.full_name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <p className={`text-[8px] font-bold uppercase tracking-widest ${suspicious ? 'text-amber-500' : 'text-white/20'}`}>
                                                        {suspicious ? 'Invalid Date' : `${t('common.born')} ${student.birth_date}`}
                                                    </p>
                                                    {suspicious && <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></div>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`text-base font-black tracking-tight ${suspicious ? 'text-amber-500 animate-pulse' : 'text-white/60 group-hover/item:text-primary'
                                                }`}>
                                                {calculateAge(student.birth_date)}
                                            </span>
                                            <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">{t('common.yrs')}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Action Footer - Minimal & Bold */}
                <div className="relative z-10 px-8 py-8">
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-3xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center group/btn overflow-hidden"
                    >
                        <span className="font-black uppercase tracking-[0.5em] text-[10px]">
                            {t('common.dismiss')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
