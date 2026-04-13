import React, { useState, useRef } from 'react';
import { X, Download, Loader2, Pencil, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ImageViewerModalProps {
    url: string;
    onClose: () => void;
    onEdit?: (url: string) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ 
    url, 
    onClose, 
    onEdit 
}) => {
    const { t } = useTranslation();
    const [zoom, setZoom] = useState(1);
    const [panning, setPanning] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(1, Math.min(5, prev + delta)));
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        lastPos.current = { x: clientX, y: clientY };
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || zoom === 1) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const dx = clientX - lastPos.current.x;
        const dy = clientY - lastPos.current.y;
        setPanning(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPos.current = { x: clientX, y: clientY };
    };

    // Proper blob-based download — works on mobile too
    const handleDownload = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const resp = await fetch(url, { mode: 'cors' });
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `image_${Date.now()}.jpg`;
            a.click();
            URL.revokeObjectURL(blobUrl);
        } catch {
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
        setIsDownloading(false);
    };

    return (
        <div className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-2xl flex flex-col p-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/30">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-black">{t('communications.multimediaView', 'Multimedia View')}</h3>
                        <p className="text-white/20 text-[9px] uppercase font-black tracking-widest">{t('communications.viewInstructions', 'Pinch to zoom • Drag to pan')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Edit / Crop Button */}
                    {onEdit && (
                        <button
                            onClick={() => { onClose(); onEdit(url); }}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-primary hover:bg-primary/10 transition-all"
                            title="Edit & Crop"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all disabled:opacity-50"
                        title="Save to device"
                    >
                        {isDownloading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-5 h-5" />}
                    </button>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-xl active:scale-95">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div
                className="flex-1 relative flex items-center justify-center overflow-hidden cursor-move"
                onWheel={handleWheel}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={() => setIsDragging(false)}
            >
                <img
                    src={url}
                    alt="Full view"
                    crossOrigin="anonymous"
                    className="max-w-full max-h-full object-contain shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-transform duration-75 select-none"
                    style={{
                        transform: `scale(${zoom}) translate(${panning.x / zoom}px, ${panning.y / zoom}px)`,
                        pointerEvents: 'none'
                    }}
                />
            </div>

            <div className="flex justify-center p-4 z-10">
                <div className="flex items-center gap-8 bg-white/5 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl">
                    <button onClick={() => { setZoom(1); setPanning({ x: 0, y: 0 }); }} className="text-white/40 hover:text-white" title={t('common.reset', 'Reset')}>
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{t('common.zoom', 'Zoom')}</span>
                        <div className="w-32 h-1.5 bg-white/10 rounded-full relative">
                            <div className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((zoom - 1) / 4) * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-black text-white min-w-[30px]">{Math.round(zoom * 100)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
