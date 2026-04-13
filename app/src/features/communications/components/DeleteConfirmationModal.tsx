import React from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmationModalProps {
    count: number;
    onCancel: () => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
    canDeleteForEveryone: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    count,
    onCancel,
    onDeleteForMe,
    onDeleteForEveryone,
    canDeleteForEveryone
}) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40">
            <div className="absolute inset-0" onClick={onCancel} />
            <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{t('communications.deleteMessage')}?</h3>
                    <p className="text-white/40 text-sm mb-6">{t('communications.deletePrompt', 'Choose how you want to remove these messages.')}</p>

                    <div className="flex flex-col gap-2 w-full">
                        <button
                            onClick={onDeleteForMe}
                            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all active:scale-95"
                        >
                            {t('communications.deleteForMe')}
                        </button>
                        {canDeleteForEveryone && (
                            <button
                                onClick={onDeleteForEveryone}
                                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all active:scale-95"
                            >
                                {t('communications.deleteForEveryone')}
                            </button>
                        )}
                        <button
                            onClick={onCancel}
                            className="w-full py-3 mt-1 text-white/40 hover:text-white font-medium transition-all"
                        >
                            {t('communications.cancel')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
