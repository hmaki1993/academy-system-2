import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layout, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Login from '../../Login';

interface FullScreenPreviewProps {
    show: boolean;
    onClose: () => void;
    previewSettings: any;
    designMode: 'desktop' | 'mobile';
}

export const FullScreenPreview: React.FC<FullScreenPreviewProps> = ({
    show,
    onClose,
    previewSettings,
    designMode
}) => {
    const { t, i18n } = useTranslation();

    useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [show]);

    if (!show) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col overflow-hidden">
            {/* Minimal Header Controls */}
            <div className="absolute top-6 left-6 z-[1001] flex items-center gap-4 bg-black/40 backdrop-blur-md p-2 pl-4 pr-4 rounded-2xl border border-white/5 shadow-2xl group transition-all hover:bg-black/60">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        {designMode === 'desktop' ? (
                            <Monitor className="w-4 h-4 text-[#D4AF37]" />
                        ) : (
                            <Layout className="w-4 h-4 text-[#D4AF37]" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Full Screen Preview</span>
                    </div>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-tight">Pixel-Perfect 1:1 Rendering</span>
                </div>
            </div>

            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-[1001] bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase text-white/70 hover:text-white flex items-center gap-2 border border-white/5 transition-all hover:bg-rose-500/20 hover:border-rose-500/20"
            >
                <X className="w-4 h-4" />
                Exit Preview
            </button>

            {/* Rendering Engine Stage */}
            <div className={`flex-1 w-full h-full relative flex items-center justify-center p-4 overflow-hidden pointer-events-none`}>
                <div 
                   className={`relative border-zinc-900 shadow-2xl overflow-hidden overflow-y-auto pointer-events-auto transition-all duration-500 ${designMode === 'mobile' ? 'h-full aspect-[9/19.5] rounded-[2.5rem] border-[12px] ring-4 ring-white/5 bg-black' : 'w-full h-full'}`}
                >
                    {designMode === 'mobile' && (
                        <>
                            {/* Notch Simulation */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-900 rounded-b-[20px] z-[60] flex items-center justify-center gap-2">
                                <div className="w-10 h-1.5 bg-white/10 rounded-full"></div>
                                <div className="w-1.5 h-1.5 bg-white/10 rounded-full"></div>
                            </div>
                            {/* Status Bar */}
                            <div className="absolute top-1.5 left-0 right-0 px-6 flex justify-between items-center z-50 pointer-events-none opacity-50">
                                <span className="text-[10px] font-black text-white px-2">9:41</span>
                                <div className="flex items-center gap-1.5 px-2">
                                    <div className="w-3 h-2 bg-white rounded-[2px]"></div>
                                    <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-white"></div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="w-full h-full relative pointer-events-none">
                        <Login
                            previewSettings={previewSettings}
                            forcedDesignMode={designMode}
                            isPreview={true}
                        />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
