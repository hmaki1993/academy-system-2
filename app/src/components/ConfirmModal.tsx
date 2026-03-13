import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, type = 'danger', confirmText, cancelText }: ConfirmModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Neutral Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className={`w-full max-w-md bg-black/60 backdrop-blur-3xl rounded-[3rem] border shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col ${type === 'danger' ? 'border-rose-500/20' : 'border-white/10'
                }`}>
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className={`relative z-10 px-8 pt-10 pb-6 border-b flex-shrink-0 ${type === 'danger' ? 'border-rose-500/10 bg-rose-500/5' : 'border-white/5 bg-white/5'
                    }`}>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                {title}
                            </h2>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                {t('common.confirmationRequired')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-3 rounded-2xl transition-all border active:scale-90 ${type === 'danger'
                                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="relative z-10 px-8 py-10">
                    <p className="text-sm font-bold text-white/60 leading-relaxed tracking-wide">
                        {message}
                    </p>
                </div>

                {/* Footer Section */}
                <div className="relative z-10 px-8 py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                    >
                        {cancelText || t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-4 rounded-3xl transition-all duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.3)] active:scale-95 flex items-center justify-center group/btn overflow-hidden ${type === 'danger'
                                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20'
                                : 'bg-white text-black hover:bg-white/90 shadow-white/10'
                            }`}
                    >
                        <span className="font-black uppercase tracking-[0.3em] text-[10px] group-hover:tracking-[0.5em] transition-all duration-500">
                            {confirmText || t('common.confirm', 'Confirm')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
