import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Search, UserMinus, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AddManualStudentModalProps {
    coachName: string;
    excludeIds: string[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddManualStudentModal({ coachName, excludeIds, onClose, onSuccess }: AddManualStudentModalProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const searchStudents = async (query: string) => {
        setLoading(true);
        try {
            let queryBuilder = supabase
                .from('students')
                .select(`
                    id, 
                    full_name, 
                    training_type, 
                    sessions_remaining,
                    training_schedule,
                    training_groups (
                        name,
                        schedule_key
                    )
                `)
                .eq('is_active', true)
                .order('full_name', { ascending: true })
                .limit(20);

            if (query.trim()) {
                queryBuilder = queryBuilder.ilike('full_name', `%${query}%`);
            }

            if (excludeIds.length > 0) {
                // Filter only valid UUIDs to avoid Supabase errors
                const validUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const filteredIds = excludeIds.filter(id => validUuidRegex.test(id));

                if (filteredIds.length > 0) {
                    queryBuilder = queryBuilder.not('id', 'in', `(${filteredIds.join(',')})`);
                }
            }

            const { data, error } = await queryBuilder;

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error('Error searching students:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!searchQuery.trim()) {
            searchStudents('');
            return;
        }
        const timer = setTimeout(() => {
            searchStudents(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleMarkAttendance = async (student: any) => {
        setProcessingId(student.id);
        const today = format(new Date(), 'yyyy-MM-dd');

        try {
            // 1. Create Attendance Record
            const { error: attError } = await supabase
                .from('student_attendance')
                .upsert({
                    student_id: student.id,
                    date: today,
                    status: 'present',
                    check_in_time: new Date().toISOString(),
                    // We store the coach in the student's record or group usually, 
                    // but for this UI display we rely on the logic in StudentAttendance.tsx
                }, { onConflict: 'student_id,date' });

            if (attError) throw attError;

            // 2. Decrement session if applicable
            if (student.sessions_remaining > 0) {
                await supabase
                    .from('students')
                    .update({ sessions_remaining: student.sessions_remaining - 1 })
                    .eq('id', student.id);
            }

            toast.success(`${student.full_name} added to ${coachName}`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error adding student:', error);
            toast.error(error.message || 'Failed to add student');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-card rounded-[2.5rem] w-full max-w-md border border-white/20 shadow-2xl overflow-hidden flex flex-col">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Add to {coachName}</h2>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Off-Schedule Registration</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 group">
                            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5 shrink-0">
                                <Search className="w-5 h-5 text-primary" />
                            </div>
                            <div className="relative flex-1">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder=""
                                    className="w-full bg-transparent backdrop-blur-md border border-white/10 rounded-3xl px-6 py-6 text-white focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary/50 transition-all font-black text-2xl text-center shadow-inner"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {loading ? (
                            <div className="text-center py-4 animate-pulse text-white/20 font-black uppercase text-[10px] tracking-widest">Searching...</div>
                        ) : students.length > 0 ? (
                            students.map(student => {
                                const individualSchedule = (student.training_schedule as any[])?.map(s => s.day).join(', ') || '';
                                const groupSchedule = student.training_groups?.schedule_key || '';
                                const effectiveSchedule = individualSchedule || groupSchedule;

                                return (
                                    <div key={student.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-3xl flex items-center justify-between group hover:bg-white/[0.06] transition-all">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-extrabold text-white truncate text-sm">{student.full_name}</p>
                                                <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/40 font-black uppercase tracking-widest border border-white/10 flex-shrink-0">
                                                    {student.training_type || 'General'}
                                                </span>
                                            </div>

                                            {effectiveSchedule && (
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    <div className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest">
                                                        {individualSchedule ? 'Individual' : 'Group'}: {
                                                            individualSchedule ||
                                                            groupSchedule.split('|')
                                                                .map((p: string) => {
                                                                    const parts = p.split(':');
                                                                    // Extract day and HH:mm
                                                                    return parts.length >= 3 ? `${parts[0].substring(0, 3)} ${parts[1]}:${parts[2]}` : p;
                                                                })
                                                                .join(', ')
                                                        }
                                                    </div>
                                                </div>
                                            )}

                                            {student.training_groups?.name && (
                                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-1 italic">
                                                    Member of {student.training_groups.name}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleMarkAttendance(student)}
                                            disabled={processingId !== null}
                                            className="p-4 rounded-2xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-50 ml-4 group-hover:shadow-lg group-hover:shadow-primary/20"
                                        >
                                            {processingId === student.id ? (
                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Plus className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-4 text-white/20 font-black uppercase text-[10px] tracking-widest italic">
                                {searchQuery ? 'No matching athletes found' : 'No active athletes available'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
