import React from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    isLoading?: boolean;
}

export default function DeleteConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    description,
    isLoading 
}: DeleteConfirmModalProps) {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
            {/* Backdrop with extreme blur */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={onClose} />
            
            <div className="relative w-full max-w-sm bg-[#0d0d0d] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden glass-morphism animate-in zoom-in-95 duration-300">
                {/* Red Glow Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-[60px] -translate-y-1/2" />
                
                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-red-500/10">
                        <Trash2 className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    
                    <h2 className="text-2xl font-black mb-3 tracking-tight">{title}</h2>
                    <p className="text-sm text-white/40 font-medium leading-relaxed mb-10">
                        {description}
                    </p>
                    <div className="flex flex-col w-full gap-3">
                        <button 
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? t('videoLibrary.deleting') : t('videoLibrary.confirmDelete')}
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full bg-white/5 hover:bg-white/10 text-white/60 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-white/5 active:scale-95"
                        >
                            {t('videoLibrary.cancel')}
                        </button>
                    </div>
                </div>

                {/* Corner Close */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}
