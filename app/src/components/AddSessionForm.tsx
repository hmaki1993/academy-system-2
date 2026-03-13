import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Calendar, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import PremiumSelect from './PremiumSelect';

interface Coach {
    id: string;
    full_name: string;
}

interface Session {
    id?: string;
    title: string;
    coach_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    capacity: number;
}

interface AddSessionFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Session | null;
}

export default function AddSessionForm({ onClose, onSuccess, initialData }: AddSessionFormProps) {
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        coach_id: '',
        day_of_week: 'Sunday',
        start_time: '16:00',
        end_time: '17:00',
        capacity: 20
    });

    const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Theme-aware styles
    const inputStyle = {
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        borderColor: 'rgba(128, 128, 128, 0.3)'
    };

    useEffect(() => {
        const fetchCoaches = async () => {
            const { data } = await supabase.from('coaches').select('id, full_name');
            if (data) setCoaches(data);
        };
        fetchCoaches();

        if (initialData) {
            setFormData({
                title: initialData.title,
                coach_id: initialData.coach_id,
                day_of_week: initialData.day_of_week,
                start_time: initialData.start_time,
                end_time: initialData.end_time,
                capacity: initialData.capacity
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (initialData?.id) {
                // Update
                const { error } = await supabase
                    .from('training_sessions')
                    .update({
                        title: formData.title,
                        coach_id: formData.coach_id,
                        day_of_week: formData.day_of_week,
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        capacity: formData.capacity
                    })
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase.from('training_sessions').insert([
                    {
                        title: formData.title,
                        coach_id: formData.coach_id,
                        day_of_week: formData.day_of_week,
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        capacity: formData.capacity
                    }
                ]);
                if (error) throw error;
            }

            toast.success(initialData ? 'Class updated successfully' : 'Class added successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving session:', error);
            toast.error('Error saving session: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('training_sessions').delete().eq('id', initialData?.id);
            if (error) throw error;
            toast.success('Class deleted successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error('Error deleting: ' + error.message);
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
                                {initialData ? 'Update Class' : 'New Academic Class'}
                            </h2>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                {initialData ? 'Modify Session Parameters' : 'Register Training Block'}
                            </p>
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
                <form onSubmit={handleSubmit} className="relative z-10 px-8 py-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                    {/* Class Title */}
                    <div className="space-y-2 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Class Designation</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. Advanced Tumbling..."
                            className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs tracking-wide font-bold"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Coach & Day */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Lead Coach</label>
                            <PremiumSelect
                                required
                                value={formData.coach_id}
                                onChange={val => setFormData({ ...formData, coach_id: val })}
                                options={[
                                    { value: "", label: "Assign Coach" },
                                    ...coaches.map(c => ({ value: c.id, label: c.full_name }))
                                ]}
                                placeholder="Lead Coach"
                            />
                        </div>
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Schedule Day</label>
                            <PremiumSelect
                                required
                                value={formData.day_of_week}
                                onChange={val => setFormData({ ...formData, day_of_week: val })}
                                options={daysOfWeek.map(day => ({ value: day, label: day }))}
                                placeholder="Training Day"
                            />
                        </div>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Start Time</label>
                            <input
                                required
                                type="time"
                                className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest text-center"
                                value={formData.start_time}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">End Time</label>
                            <input
                                required
                                type="time"
                                className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest text-center"
                                value={formData.end_time}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Capacity */}
                    <div className="space-y-2 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Class Capacity</label>
                        <input
                            required
                            type="number"
                            className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs tracking-wide font-bold"
                            value={formData.capacity}
                            onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        />
                    </div>
                </form>

                {/* Footer Section */}
                <div className="relative z-10 px-8 py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6">
                    {initialData ? (
                        <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-500"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                        >
                            Discard
                        </button>
                    )}

                    <button
                        onClick={(e) => handleSubmit(e)}
                        disabled={loading}
                        className="flex-1 py-4 rounded-3xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Processing...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] group-hover:tracking-[0.5em] transition-all duration-500">
                                {initialData ? 'Update Schedule' : 'Confirm Class'}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete Class"
                message="Are you sure you want to delete this training session? This action cannot be undone."
                type="danger"
            />
        </div>
    );
}
