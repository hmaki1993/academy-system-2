import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, Clock, Calendar, User, Timer, Search, Check, Users, ChevronDown } from 'lucide-react';
import { useCoaches, useStudents } from '../hooks/useData';
import toast from 'react-hot-toast';

interface GroupFormModalProps {
    initialData?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export default function GroupFormModal({ initialData, onClose, onSuccess }: GroupFormModalProps) {
    const { t, i18n } = useTranslation();
    const { data: coaches } = useCoaches();
    const { data: students } = useStudents();
    const [loading, setLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        coach_id: '',
        days: [] as string[],
        perDaySchedule: {} as { [key: string]: { startTime: string; duration: number } }
    });

    useEffect(() => {
        // Lock body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        if (initialData) {
            let days = [] as string[];
            const perDaySchedule: { [key: string]: { startTime: string; duration: number } } = {};

            if (initialData.schedule_key) {
                const parts = initialData.schedule_key.split('|');
                parts.forEach((part: string) => {
                    const subParts = part.split(':');
                    if (subParts.length >= 5) {
                        const day = subParts[0];
                        const start = `${subParts[1]}:${subParts[2]}`;
                        const end = `${subParts[3]}:${subParts[4]}`;

                        let duration = 60;
                        try {
                            const [startH, startM] = start.split(':').map(Number);
                            const [endH, endM] = end.split(':').map(Number);
                            const startTotal = startH * 60 + startM;
                            let endTotal = endH * 60 + endM;
                            if (endTotal <= startTotal) endTotal += 1440; // Handle overnight
                            duration = endTotal - startTotal;
                        } catch (e) {
                            console.error('Error parsing duration:', e);
                        }

                        days.push(day);
                        perDaySchedule[day] = { startTime: start, duration };
                    }
                });
            }

            setFormData({
                name: initialData.name || '',
                coach_id: initialData.coach_id || '',
                days: days,
                perDaySchedule: perDaySchedule
            });

            if (initialData.students) {
                setSelectedStudents(initialData.students.map((s: any) => s.id));
            } else if (students) {
                const groupStudents = students.filter((s: any) => s.training_group_id === initialData.id);
                setSelectedStudents(groupStudents.map((s: any) => s.id));
            }
        }
    }, [initialData, students]);

    const toggleDay = (day: string) => {
        setFormData(prev => {
            const isRemoving = prev.days.includes(day);
            const newDays = isRemoving
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day];

            const newSchedule = { ...prev.perDaySchedule };
            if (isRemoving) {
                delete newSchedule[day];
            } else if (!newSchedule[day]) {
                newSchedule[day] = { startTime: '16:00', duration: 60 };
            }

            return {
                ...prev,
                days: newDays,
                perDaySchedule: newSchedule
            };
        });
    };

    const updateDaySchedule = (day: string, field: 'startTime' | 'duration', value: any) => {
        setFormData(prev => ({
            ...prev,
            perDaySchedule: {
                ...prev.perDaySchedule,
                [day]: {
                    ...prev.perDaySchedule[day],
                    [field]: field === 'duration' ? parseInt(value) : value
                }
            }
        }));
    };

    const formatTime12h = (time24: string) => {
        if (!time24) return '';
        try {
            const [h, m] = time24.split(':').map(Number);
            if (isNaN(h)) return '';
            const ampm = h >= 12 ? (i18n.language === 'ar' ? 'م' : 'PM') : (i18n.language === 'ar' ? 'ص' : 'AM');
            const h12 = h % 12 || 12;
            return `(${h12}:${m.toString().padStart(2, '0')} ${ampm})`;
        } catch (e) {
            return '';
        }
    };

    const toggleStudent = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const filteredStudents = students?.filter((s: any) =>
        s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
    ) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const scheduleKey = formData.days
                .map(day => {
                    const sched = formData.perDaySchedule[day] || { startTime: '16:00', duration: 60 };
                    const [startH, startM] = sched.startTime.split(':').map(Number);
                    const totalStartMinutes = startH * 60 + startM;
                    const totalEndMinutes = totalStartMinutes + sched.duration;

                    const endH = Math.floor(totalEndMinutes / 60) % 24;
                    const endM = totalEndMinutes % 60;
                    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                    return `${day}:${sched.startTime}:${endTime}`;
                })
                .sort()
                .join('|');

            const payload = {
                name: formData.name,
                coach_id: formData.coach_id,
                schedule_key: scheduleKey,
                updated_at: new Date().toISOString()
            };

            let groupId = initialData?.id;

            if (initialData?.id) {
                const { error } = await supabase
                    .from('training_groups')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
                toast.success('Group updated successfully');
            } else {
                const { data: newGroup, error } = await supabase
                    .from('training_groups')
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;
                groupId = newGroup.id;
                toast.success('Group created successfully');
            }



            if (groupId) {
                // Prepare training schedule for students
                const trainingDays = formData.days.map(d => d.substring(0, 3).toLowerCase());
                const trainingSchedule = formData.days.map(day => {
                    const sched = formData.perDaySchedule[day] || { startTime: '16:00', duration: 60 };
                    const [startH, startM] = sched.startTime.split(':').map(Number);
                    const totalStartMinutes = startH * 60 + startM;
                    const totalEndMinutes = totalStartMinutes + sched.duration;
                    const endH = Math.floor(totalEndMinutes / 60) % 24;
                    const endM = totalEndMinutes % 60;
                    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                    return {
                        day: day.substring(0, 3).toLowerCase(),
                        start: sched.startTime,
                        end: endTime
                    };
                });

                // 1. Update Students Table: training_group_id, coach_id, training_days, training_schedule
                const { error: updateError } = await supabase
                    .from('students')
                    .update({
                        training_group_id: groupId,
                        coach_id: formData.coach_id,
                        training_days: trainingDays,
                        training_schedule: trainingSchedule
                    })
                    .in('id', selectedStudents);

                if (updateError) {
                    console.error('Error updating students:', updateError);
                    toast.error('Group saved but failed to update some students');
                }

                // 2. Sync student_training_schedule table for assigned students
                if (selectedStudents.length > 0) {
                    // Delete old schedules first
                    await supabase
                        .from('student_training_schedule')
                        .delete()
                        .in('student_id', selectedStudents);

                    // Insert new schedules
                    const inserts: any[] = [];
                    selectedStudents.forEach(sid => {
                        formData.days.forEach(day => {
                            const sched = formData.perDaySchedule[day] || { startTime: '16:00', duration: 60 };
                            const [startH, startM] = sched.startTime.split(':').map(Number);
                            const totalStartMinutes = startH * 60 + startM;
                            const totalEndMinutes = totalStartMinutes + sched.duration;
                            const endH = Math.floor(totalEndMinutes / 60) % 24;
                            const endM = totalEndMinutes % 60;
                            const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                            inserts.push({
                                student_id: sid,
                                day_of_week: day.substring(0, 3).toLowerCase(),
                                start_time: sched.startTime,
                                end_time: endTime
                            });
                        });
                    });

                    if (inserts.length > 0) {
                        const { error: scheduleError } = await supabase
                            .from('student_training_schedule')
                            .insert(inserts);
                        if (scheduleError) console.error('Error syncing individual schedules:', scheduleError);
                    }
                }

                if (initialData?.id) {
                    const previouslySelected = students?.filter((s: any) => s.training_group_id === initialData.id).map((s: any) => s.id) || [];
                    const toRemove = previouslySelected.filter(id => !selectedStudents.includes(id));

                    if (toRemove.length > 0) {
                        await supabase
                            .from('students')
                            .update({ training_group_id: null })
                            .in('id', toRemove);
                    }
                }
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving group:', error);
            toast.error('Failed to save group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Neutral Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className="w-full max-w-[800px] bg-black/60 backdrop-blur-3xl rounded-[2rem] sm:rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col max-h-[90vh]">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-5 sm:px-8 pt-8 sm:pt-10 pb-4 sm:pb-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                {initialData ? t('common.editGroup') : t('common.createGroup')}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Form Body */}
                <form onSubmit={handleSubmit} className="relative z-10 px-5 sm:px-8 py-5 sm:py-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col md:flex-row gap-6 sm:gap-8">

                    {/* Left Column: Group Details */}
                    <div className="flex-1 space-y-6">
                        {/* Name */}
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('common.groupName')}</label>
                            <input
                                required
                                type="text"
                                className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs tracking-wide font-bold"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* Coach */}
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('common.coach')}</label>
                            <div className="relative">
                                <select
                                    required
                                    value={formData.coach_id}
                                    onChange={e => setFormData({ ...formData, coach_id: e.target.value })}
                                    className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white appearance-none cursor-pointer pr-12 text-xs tracking-wide font-bold"
                                >
                                    <option value="" className="bg-[#0a0a0f]"></option>
                                    {coaches?.filter((c: any) => c.role !== 'reception' && c.role !== 'cleaner').map((coach: any) => (
                                        <option key={coach.id} value={coach.id} className="bg-[#0a0a0f]">
                                            {coach.full_name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none group-focus-within/field:text-primary transition-colors" />
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1">{t('common.trainingDays')}</label>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {DAYS.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[7.5px] sm:text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${formData.days.includes(day)
                                            ? 'bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/5'
                                            : 'bg-white/[0.02] border-white/5 text-white/20 hover:bg-white/[0.05] hover:border-white/10'
                                            }`}
                                    >
                                        {t(`students.days.${day.substring(0, 3)}`)}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                {formData.days.map(day => {
                                    const sched = formData.perDaySchedule[day] || { startTime: '16:00', duration: 60 };
                                    return (
                                        <div key={day} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">
                                                    {t(`students.days.${day.substring(0, 3)}`)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 ml-1">{t('students.startTime')}</label>
                                                    <input
                                                        type="time"
                                                        value={sched.startTime}
                                                        onChange={e => updateDaySchedule(day, 'startTime', e.target.value)}
                                                        className="w-full px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl outline-none text-white [color-scheme:dark] text-[10px] font-bold"
                                                    />
                                                    <p className="text-[7px] font-black text-primary/60 uppercase tracking-widest mt-1 ml-1">{formatTime12h(sched.startTime)}</p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 ml-1">{t('coaches.duration')}</label>
                                                    <select
                                                        value={sched.duration}
                                                        onChange={e => updateDaySchedule(day, 'duration', e.target.value)}
                                                        className="w-full px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl outline-none text-white appearance-none text-[10px] font-bold"
                                                    >
                                                        <option value="60" className="bg-[#0a0a0f]">{t('common.hour1')}</option>
                                                        <option value="90" className="bg-[#0a0a0f]">{t('common.hour1_5')}</option>
                                                        <option value="120" className="bg-[#0a0a0f]">{t('common.hour2')}</option>
                                                        <option value="150" className="bg-[#0a0a0f]">{t('common.hour2_5')}</option>
                                                        <option value="180" className="bg-[#0a0a0f]">{t('common.hour3')}</option>
                                                        <option value="240" className="bg-[#0a0a0f]">{t('common.hour4')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Student Selection */}
                    <div className="flex-1 flex flex-col min-h-[300px] h-fit md:h-[500px] bg-white/[0.01] border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden">
                        <div className="p-4 border-b border-white/5">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 mb-3 block">
                                {t('dashboard.addStudent')} <span className="text-primary ml-1">({selectedStudents.length})</span>
                            </label>
                            <div className="flex items-center gap-3 group/search">
                                <Search className="w-4 h-4 text-white/20 group-focus-within/search:text-primary transition-colors shrink-0" />
                                <input
                                    type="text"
                                    value={studentSearch}
                                    onChange={e => setStudentSearch(e.target.value)}
                                    placeholder=""
                                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/40 text-[10px] font-bold placeholder:text-white/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {filteredStudents.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/20 p-4 text-center">
                                    <User className="w-8 h-8 mb-2 opacity-30" />
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">{t('common.noResults')}</p>
                                </div>
                            ) : (
                                filteredStudents.map((student: any) => {
                                    const isSelected = selectedStudents.includes(student.id);
                                    return (
                                        <div
                                            key={student.id}
                                            onClick={() => toggleStudent(student.id)}
                                            className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-all group duration-300 ${isSelected
                                                ? 'bg-primary/10 border border-primary/20'
                                                : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white/30 group-hover:bg-white/10 group-hover:text-white'}`}>
                                                    {student.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className={`text-[10px] font-bold transition-colors ${isSelected ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>
                                                        {student.full_name}
                                                    </p>
                                                    {student.training_groups?.name && (
                                                        <p className="text-[8px] text-white/20 uppercase tracking-wider group-hover:text-white/40 transition-colors">
                                                            {student.training_groups.name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 animate-in zoom-in spin-in-90 duration-300">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </form>

                {/* Footer Section */}
                <div className="relative z-10 px-5 sm:px-8 py-5 sm:py-6 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-4 sm:gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e)}
                        disabled={loading}
                        className="flex-1 py-4 rounded-3xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Saving...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] group-hover:tracking-[0.5em] transition-all duration-500">
                                {initialData ? 'Update Group' : 'Create Group'}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
