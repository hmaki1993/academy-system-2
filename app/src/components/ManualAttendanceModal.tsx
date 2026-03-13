import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, Calendar, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface ManualAttendanceModalProps {
    coach: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ManualAttendanceModal({ coach, onClose, onSuccess }: ManualAttendanceModalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [status, setStatus] = useState<'present' | 'absent' | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!status) return toast.error(t('common.selectStatus'));
        setLoading(true);

        try {
            const timestamp = new Date();
            const payload: any = {
                coach_id: coach.id,
                date: date,
                status: status
            };

            if (status === 'present') {
                // If marking for today, use current time. If past, use 9 AM.
                const isToday = date === format(new Date(), 'yyyy-MM-dd');
                const checkInTime = isToday ? timestamp : new Date(`${date}T09:00:00`);

                payload.check_in_time = checkInTime.toISOString();
                payload.check_out_time = null; // Mark as Active
            } else {
                payload.check_in_time = null;
                payload.check_out_time = null;
            }

            const { error } = await supabase
                .from('coach_attendance')
                .upsert(payload, { onConflict: 'coach_id,date' });

            if (error) throw error;
            toast.success(t('common.saved'));
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving attendance:', error);
            toast.error(error.message || t('common.error'));
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
                                {t('coaches.markAttendance')}
                            </h2>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                Personnel Verification Protocol
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
                <form onSubmit={handleSubmit} className="relative z-10 px-8 py-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">

                    {/* Coach Profile Card */}
                    <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[2rem] flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-xl shadow-lg shadow-primary/5">
                            {coach.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-extrabold text-white text-base tracking-wide">{coach.full_name}</h3>
                            <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] mt-0.5">{t(`roles.${coach.role}`)}</p>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-3 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Assessment Date</label>
                        <div className="relative">
                            <input
                                required
                                type="date"
                                className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest text-center"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                            />
                            <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/10 pointer-events-none group-focus-within/field:text-primary transition-colors" />
                        </div>
                    </div>

                    {/* Status Toggle Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setStatus('present')}
                            className={`p-6 rounded-[2rem] border flex flex-col items-center gap-3 transition-all duration-500 group/status ${status === 'present'
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/5'
                                : 'bg-white/[0.02] border-white/5 text-white/20 hover:bg-white/[0.05] hover:border-white/10'
                                }`}
                        >
                            <div className={`p-3 rounded-xl transition-all duration-500 ${status === 'present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/10'}`}>
                                <Check className="w-5 h-5" />
                            </div>
                            <span className="font-black uppercase tracking-[0.2em] text-[10px]">{t('coaches.present')}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatus('absent')}
                            className={`p-6 rounded-[2rem] border flex flex-col items-center gap-3 transition-all duration-500 group/status ${status === 'absent'
                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-lg shadow-rose-500/5'
                                : 'bg-white/[0.02] border-white/5 text-white/20 hover:bg-white/[0.05] hover:border-white/10'
                                }`}
                        >
                            <div className={`p-3 rounded-xl transition-all duration-500 ${status === 'absent' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-white/10'}`}>
                                <XCircle className="w-5 h-5" />
                            </div>
                            <span className="font-black uppercase tracking-[0.2em] text-[10px]">{t('coaches.absent')}</span>
                        </button>
                    </div>
                </form>

                {/* Footer Section - Single Premium Button */}
                <div className="relative z-10 px-8 py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                    >
                        Discard
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e)}
                        disabled={loading || !status}
                        className="flex-1 py-4 rounded-3xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Processing...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] group-hover:tracking-[0.5em] transition-all duration-500">
                                {t('common.save')}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
