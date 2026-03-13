import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import StudentBasicInfo from './student-form/StudentBasicInfo';
import StudentContactInfo from './student-form/StudentContactInfo';
import StudentScheduleInfo from './student-form/StudentScheduleInfo';
import StudentSubscriptionInfo from './student-form/StudentSubscriptionInfo';
import { useStudentForm, calculateAge } from '../hooks/useStudentForm';
import { useStudentSubmit } from '../hooks/useStudentSubmit';
import { useEffect } from 'react';

interface AddStudentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function AddStudentForm({ onClose, onSuccess, initialData }: AddStudentFormProps) {
    const { t } = useTranslation();
    
    // Abstracted State Logic
    const { 
        formData, setFormData, 
        handleGroupChange, toggleDay, 
        updateTime, plans, groups 
    } = useStudentForm(initialData);

    // Abstracted Submit Logic (React Query Mutation)
    const { mutate: submitStudent, isPending: loading } = useStudentSubmit(initialData, onSuccess, onClose);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitStudent({
            formData,
            plans,
            calculatedAge: calculateAge(formData.birth_date),
            calculatedExpiry: formData.subscription_expiry
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Neutral Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className="w-full max-w-[500px] bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col max-h-[90vh]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header */}
                <div className="relative z-10 px-5 sm:px-8 pt-8 sm:pt-10 pb-5 sm:pb-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                {initialData ? 'Edit Gymnast' : t('dashboard.addStudent', 'New Athlete')}
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

                {/* Form Body - Composed from smaller chunks */}
                <form onSubmit={handleSubmit} className="relative z-10 px-5 sm:px-8 py-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    <StudentBasicInfo 
                        formData={formData} 
                        setFormData={setFormData}
                        calculateAge={calculateAge}
                        groups={groups || []}
                        handleGroupChange={handleGroupChange}
                    />
                    
                    <StudentContactInfo 
                        formData={formData} 
                        setFormData={setFormData} 
                    />

                    <StudentScheduleInfo 
                        formData={formData} 
                        toggleDay={toggleDay} 
                        updateTime={updateTime} 
                    />

                    <StudentSubscriptionInfo 
                        formData={formData} 
                        setFormData={setFormData} 
                        plans={plans} 
                    />
                </form>

                {/* Footer */}
                <div className="relative z-10 px-5 sm:px-8 py-6 sm:py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-4 rounded-full bg-black text-primary border border-primary/40 shadow-xl hover:bg-primary/5 transition-all active:scale-[0.98] flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Processing...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.5em] text-[11px]">
                                {initialData ? 'Update Profile' : 'Confirm Registration'}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
