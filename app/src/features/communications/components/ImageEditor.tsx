import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Pencil, Crop } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

// ─── Image Editor Utilities ──────────────────────────────────────────────────
export const getCroppedImg = async (imageSrc: string, pixelCrop: any, rotation = 0): Promise<Blob> => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (error) => reject(error));
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No 2d context');

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bWidth, height: bHeight } = {
        width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
        height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height)
    };

    canvas.width = bWidth;
    canvas.height = bHeight;

    ctx.translate(bWidth / 2, bHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(data, 0, 0);

    return new Promise((resolve) => {
        canvas.toBlob((file) => resolve(file!), 'image/jpeg', 0.95);
    });
};

type CropRect = { x: number; y: number; w: number; h: number };
type DragHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

const MIN_CROP = 40;

interface ImageEditorProps {
    image: string;
    onSave: (blob: Blob) => void;
    onCancel: () => void;
    isProcessing: boolean;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ 
    image, 
    onSave, 
    onCancel, 
    isProcessing 
}) => {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const drawCanvasRef = useRef<HTMLCanvasElement>(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
    const [mode, setMode] = useState<'crop' | 'draw'>('crop');
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#FFDD00');
    const [brushSize, setBrushSize] = useState(4);
    const [caption, setCaption] = useState('');
    const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const dragRef = useRef<{
        handle: DragHandle;
        startX: number; startY: number;
        origRect: CropRect;
    } | null>(null);

    const handleImgLoad = () => {
        setImgLoaded(true);
        if (!imgRef.current) return;
        const width = imgRef.current.clientWidth;
        const height = imgRef.current.clientHeight;
        const size = Math.min(width, height) * 0.8;
        setCropRect({ x: (width - size) / 2, y: (height - size) / 2, w: size, h: size });
        // Init draw canvas
        if (drawCanvasRef.current) {
            drawCanvasRef.current.width = width;
            drawCanvasRef.current.height = height;
        }
    };

    const getClient = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if ('touches' in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    };

    const getCanvasPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const client = getClient(e);

        // Account for scaling between internal canvas size and layout size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (client.x - rect.left) * scaleX,
            y: (client.y - rect.top) * scaleY
        };
    };

    const saveHistory = useCallback(() => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        setDrawHistory(prev => [...prev.slice(-19), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }, []);

    // ── Drawing manual listeners for passive event issue ──
    useEffect(() => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (mode !== 'draw') return;
            e.preventDefault();
            saveHistory();
            const pos = getCanvasPos(e);
            if (!pos) return;
            lastPos.current = pos;
            setIsDrawing(true);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
                ctx.fillStyle = brushColor;
                ctx.fill();
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (mode !== 'draw' || !isDrawing || !lastPos.current) return;
            e.preventDefault();
            const pos = getCanvasPos(e);
            if (!pos) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            lastPos.current = pos;
        };

        const handleTouchEnd = () => {
            setIsDrawing(false);
            lastPos.current = null;
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [mode, isDrawing, brushColor, brushSize, saveHistory]);

    // ── Crop drag handlers ──
    const onPointerDown = (handle: DragHandle) => (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== 'crop') return;
        e.stopPropagation();
        const { x, y } = getClient(e);
        dragRef.current = { handle, startX: x, startY: y, origRect: { ...cropRect } };
    };

    const onCropPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragRef.current || !imgRef.current) return;
        const { x, y } = getClient(e);
        const dx = x - dragRef.current.startX;
        const dy = y - dragRef.current.startY;
        const orig = dragRef.current.origRect;
        const maxW = imgRef.current.clientWidth;
        const maxH = imgRef.current.clientHeight;
        const handle = dragRef.current.handle;
        setCropRect(prev => {
            let cx = prev.x, cy = prev.y, cw = prev.w, ch = prev.h;
            if (handle === 'move') {
                cx = Math.max(0, Math.min(maxW - orig.w, orig.x + dx));
                cy = Math.max(0, Math.min(maxH - orig.h, orig.y + dy));
                cw = orig.w; ch = orig.h;
            } else {
                let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
                if (handle === 'e' || handle === 'ne' || handle === 'se') nw = Math.max(MIN_CROP, orig.w + dx);
                if (handle === 'w' || handle === 'nw' || handle === 'sw') { nx = orig.x + dx; nw = Math.max(MIN_CROP, orig.w - dx); }
                if (handle === 's' || handle === 'se' || handle === 'sw') nh = Math.max(MIN_CROP, orig.h + dy);
                if (handle === 'n' || handle === 'nw' || handle === 'ne') { ny = orig.y + dy; nh = Math.max(MIN_CROP, orig.h - dy); }

                if (nx < 0) { nw += nx; nx = 0; }
                if (ny < 0) { nh += ny; ny = 0; }
                if (nx + nw > maxW) nw = maxW - nx;
                if (ny + nh > maxH) nh = maxH - ny;
                if (nw < MIN_CROP) { nw = MIN_CROP; if (handle?.includes('w')) nx = orig.x + orig.w - MIN_CROP; }
                if (nh < MIN_CROP) { nh = MIN_CROP; if (handle?.includes('n')) ny = orig.y + orig.h - MIN_CROP; }
                [cx, cy, cw, ch] = [nx, ny, nw, nh];
            }
            return { x: cx, y: cy, w: cw, h: ch };
        });
    };

    const onCropPointerUp = () => { dragRef.current = null; };

    const onDrawStart = (e: React.MouseEvent) => {
        if (mode !== 'draw') return;
        saveHistory();
        const pos = getCanvasPos(e);
        if (!pos) return;
        lastPos.current = pos;
        setIsDrawing(true);
        // Draw a dot for single tap
        const canvas = drawCanvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (ctx) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = brushColor;
            ctx.fill();
        }
    };

    const onDrawMove = (e: React.MouseEvent) => {
        if (!isDrawing || mode !== 'draw' || !lastPos.current) return;
        const pos = getCanvasPos(e);
        if (!pos) return;
        const canvas = drawCanvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastPos.current = pos;
    };

    const onDrawEnd = () => { setIsDrawing(false); lastPos.current = null; };

    const handleUndo = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas || drawHistory.length === 0) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const prev = drawHistory[drawHistory.length - 1];
        ctx.putImageData(prev, 0, 0);
        setDrawHistory(h => h.slice(0, -1));
    };

    const clearDrawing = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        saveHistory();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // ── Save & send ──
    const handleSaveInternal = async () => {
        if (!imgRef.current) return;
        try {
            const imgEl = imgRef.current;
            const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
            const scaleY = imgEl.naturalHeight / imgEl.clientHeight;

            // Step 1: Crop the image
            const cropW = Math.round(cropRect.w * scaleX);
            const cropH = Math.round(cropRect.h * scaleY);

            // Caption height (if any)
            const fontSize = Math.max(20, Math.round(cropW * 0.04));
            const captionPadding = caption.trim() ? fontSize * 2 : 0;

            const canvas = document.createElement('canvas');
            canvas.width = cropW;
            canvas.height = cropH + captionPadding;
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

            // Draw cropped image
            ctx.drawImage(imgEl, cropRect.x * scaleX, cropRect.y * scaleY, cropRect.w * scaleX, cropRect.h * scaleY, 0, 0, cropW, cropH);

            // Step 2: Bake drawing annotations (scale from client px to natural px)
            const drawCanvas = drawCanvasRef.current;
            if (drawCanvas) {
                ctx.save();
                ctx.scale(scaleX, scaleY);
                ctx.translate(-cropRect.x, -cropRect.y);
                ctx.drawImage(drawCanvas, 0, 0);
                ctx.restore();
            }

            // Step 3: Bake caption
            if (caption.trim() && captionPadding > 0) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, cropH, cropW, captionPadding);
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(caption.trim(), cropW / 2, cropH + captionPadding / 2, cropW - 20);
            }

            canvas.toBlob(blob => blob && onSave(blob), 'image/jpeg', 0.95);
        } catch (err) {
            console.error('Save error:', err);
            toast.error('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const hClass = "absolute w-6 h-6 bg-white border-2 border-primary rounded-full z-20 shadow-lg active:scale-125 transition-transform touch-none";
    const COLORS = ['#FFDD00', '#FF3B30', '#34C759', '#007AFF', '#FF9F0A', '#FFFFFF', '#000000', '#AF52DE'];

    return (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-black overflow-hidden select-none"
            onMouseMove={mode === 'crop' ? onCropPointerMove : undefined}
            onTouchMove={mode === 'crop' ? onCropPointerMove : undefined}
            onMouseUp={onCropPointerUp} onTouchEnd={mode === 'crop' ? onCropPointerUp : onDrawEnd}
            onMouseLeave={onCropPointerUp}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2">
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                        <button
                            onClick={() => setMode('crop')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'crop' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            {t('communications.crop')}
                        </button>
                        <button
                            onClick={() => setMode('draw')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'draw' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            {t('communications.draw')}
                        </button>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Draw toolbar — only visible in draw mode */}
            {mode === 'draw' && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#111] border-b border-white/5 overflow-x-auto flex-shrink-0">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setBrushColor(c)}
                                className="w-6 h-6 rounded-full border-2 transition-all active:scale-90 flex-shrink-0"
                                style={{ backgroundColor: c, borderColor: brushColor === c ? '#fff' : 'transparent', transform: brushColor === c ? 'scale(1.2)' : undefined }}
                            />
                        ))}
                    </div>
                    <div className="w-px h-6 bg-white/10 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {[2, 4, 8, 14].map(s => (
                            <button
                                key={s}
                                onClick={() => setBrushSize(s)}
                                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${brushSize === s ? 'bg-primary/20 border border-primary' : 'bg-white/5 border border-white/10'}`}
                            >
                                <div className="rounded-full bg-white" style={{ width: s, height: s }} />
                            </button>
                        ))}
                    </div>
                    <div className="w-px h-6 bg-white/10 flex-shrink-0" />
                    <button onClick={handleUndo} disabled={drawHistory.length === 0} className="px-3 h-8 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white disabled:opacity-30 transition-all flex-shrink-0">
                        ↩ {t('common.undo', 'Undo')}
                    </button>
                    <button onClick={clearDrawing} className="px-3 h-8 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all flex-shrink-0">
                        🗑 {t('common.clear', 'Clear')}
                    </button>
                </div>
            )}

            {/* Editing Canvas */}
            <div className="flex-1 relative flex items-center justify-center bg-[#050505] p-4 min-h-0">
                <div ref={containerRef} className="relative inline-block leading-[0] shadow-2xl">
                    <img
                        ref={imgRef}
                        src={image}
                        onLoad={handleImgLoad}
                        crossOrigin="anonymous"
                        className="max-w-full max-h-[65vh] block object-contain"
                        draggable={false}
                    />

                    {imgLoaded && (
                        <canvas
                            ref={drawCanvasRef}
                            className="absolute inset-0 w-full h-full"
                            style={{
                                cursor: mode === 'draw' ? `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='${brushSize / 2}' fill='${encodeURIComponent(brushColor)}'/></svg>") 12 12, crosshair` : 'default',
                                pointerEvents: mode === 'draw' ? 'auto' : 'none',
                                zIndex: mode === 'draw' ? 30 : 5,
                            }}
                            onMouseDown={onDrawStart}
                            onMouseMove={onDrawMove}
                            onMouseUp={onDrawEnd}
                        />
                    )}

                    {/* Crop UI */}
                    {imgLoaded && mode === 'crop' && (
                        <div
                            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move z-10"
                            style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                            onMouseDown={onPointerDown('move')} onTouchStart={onPointerDown('move')}
                        >
                            <div className="absolute inset-0 pointer-events-none opacity-30">
                                <div className="absolute left-1/3 w-px h-full bg-white" />
                                <div className="absolute left-2/3 w-px h-full bg-white" />
                                <div className="absolute top-1/3 h-px w-full bg-white" />
                                <div className="absolute top-2/3 h-px w-full bg-white" />
                            </div>
                            <div className={`${hClass} -top-3 -left-3 cursor-nw-resize`} onMouseDown={onPointerDown('nw')} onTouchStart={onPointerDown('nw')} />
                            <div className={`${hClass} -top-3 -right-3 cursor-ne-resize`} onMouseDown={onPointerDown('ne')} onTouchStart={onPointerDown('ne')} />
                            <div className={`${hClass} -bottom-3 -left-3 cursor-sw-resize`} onMouseDown={onPointerDown('sw')} onTouchStart={onPointerDown('sw')} />
                            <div className={`${hClass} -bottom-3 -right-3 cursor-se-resize`} onMouseDown={onPointerDown('se')} onTouchStart={onPointerDown('se')} />
                            <div className={`${hClass} -top-3 left-1/2 -translate-x-1/2 cursor-n-resize`} onMouseDown={onPointerDown('n')} onTouchStart={onPointerDown('n')} />
                            <div className={`${hClass} -bottom-3 left-1/2 -translate-x-1/2 cursor-s-resize`} onMouseDown={onPointerDown('s')} onTouchStart={onPointerDown('s')} />
                            <div className={`${hClass} top-1/2 -left-3 -translate-y-1/2 cursor-w-resize`} onMouseDown={onPointerDown('w')} onTouchStart={onPointerDown('w')} />
                            <div className={`${hClass} top-1/2 -right-3 -translate-y-1/2 cursor-e-resize`} onMouseDown={onPointerDown('e')} onTouchStart={onPointerDown('e')} />
                        </div>
                    )}
                </div>
            </div>

            {/* Caption input */}
            <div className="flex-shrink-0 px-4 py-3 bg-[#0a0a0a] border-t border-white/5">
                <input
                    type="text"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder={t('communications.captionPlaceholder')}
                    maxLength={120}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-medium focus:outline-none focus:border-primary/40 transition-all"
                />
            </div>

            {/* Action Buttons */}
            <div className="p-4 pt-2 bg-[#0a0a0a] flex-shrink-0">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={onCancel} className="flex-1 h-12 rounded-2xl bg-white/5 text-white/50 font-black uppercase tracking-tight border border-white/5 text-sm hover:bg-white/10 transition-colors">
                        {t('communications.cancel')}
                    </button>
                    <button onClick={handleSaveInternal} disabled={isProcessing} className="flex-[2] h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-tight shadow-xl shadow-primary/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /><span>{t('communications.save')}</span></>}
                    </button>
                </div>
            </div>
        </div>
    );
};
