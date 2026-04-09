import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';

interface Crop {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ManualCropperProps {
    image: string;
    aspectRatio: number | null;
    onCropComplete: (cropPixels: Crop) => void;
}

export default function ManualCropper({ image, aspectRatio, onCropComplete }: ManualCropperProps) {
    const [crop, setCrop] = useState<Crop>({ x: 10, y: 10, width: 80, height: 60 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<string | null>(null); // 'tl', 'tr', 'bl', 'br', 'top', 'bottom', 'left', 'right'
    const [startPos, setStartPos] = useState({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

    // Ensure height matches aspect ratio on initial load if provided
    useEffect(() => {
        if (aspectRatio) {
            setCrop(prev => ({ ...prev, height: prev.width / aspectRatio }));
        }
    }, [aspectRatio]);

    const handleStart = (e: ReactMouseEvent | ReactTouchEvent, type: string | null) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as ReactMouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as ReactMouseEvent).clientY;
        
        setStartPos({
            x: clientX,
            y: clientY,
            cropX: crop.x,
            cropY: crop.y,
            cropW: crop.width,
            cropH: crop.height
        });

        if (type === 'move') setIsDragging(true);
        else setIsResizing(type);
    };

    useEffect(() => {
        const handleMove = (e: any) => {
            if (!isDragging && !isResizing) return;
            if (!containerRef.current) return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = ((clientX - startPos.x) / containerRef.current.offsetWidth) * 100;
            const dy = ((clientY - startPos.y) / containerRef.current.offsetHeight) * 100;

            if (isDragging) {
                setCrop(prev => ({
                    ...prev,
                    x: Math.max(0, Math.min(100 - prev.width, startPos.cropX + dx)),
                    y: Math.max(0, Math.min(100 - prev.height, startPos.cropY + dy))
                }));
            } else if (isResizing) {
                let newWidth = startPos.cropW;
                let newHeight = startPos.cropH;
                let newX = startPos.cropX;
                let newY = startPos.cropY;

                // Simple proportional resize logic
                if (isResizing === 'br') {
                    if (aspectRatio) {
                        const delta = Math.max(dx, dy * aspectRatio);
                        newWidth = Math.min(100 - startPos.cropX, startPos.cropW + delta);
                        newHeight = newWidth / aspectRatio;
                    } else {
                        newWidth = Math.max(5, Math.min(100 - startPos.cropX, startPos.cropW + dx));
                        newHeight = Math.max(5, Math.min(100 - startPos.cropY, startPos.cropH + dy));
                    }
                } else if (isResizing === 'bl') {
                    if (aspectRatio) {
                        const delta = Math.max(-dx, dy * aspectRatio);
                        const widthChange = Math.min(startPos.cropX, delta);
                        newWidth = startPos.cropW + widthChange;
                        newHeight = newWidth / aspectRatio;
                        newX = startPos.cropX - widthChange;
                    } else {
                        const widthChange = Math.max(-startPos.cropW + 5, Math.min(startPos.cropX, -dx));
                        newWidth = startPos.cropW + widthChange;
                        newX = startPos.cropX - widthChange;
                        newHeight = Math.max(5, Math.min(100 - startPos.cropY, startPos.cropH + dy));
                    }
                } else if (isResizing === 'tr') {
                    if (aspectRatio) {
                        const delta = Math.max(dx, -dy * aspectRatio);
                        newWidth = Math.min(100 - startPos.cropX, startPos.cropW + delta);
                        newHeight = newWidth / aspectRatio;
                        newY = startPos.cropY - (newHeight - startPos.cropH);
                    } else {
                        newWidth = Math.max(5, Math.min(100 - startPos.cropX, startPos.cropW + dx));
                        const heightChange = Math.max(-startPos.cropH + 5, Math.min(startPos.cropY, -dy));
                        newHeight = startPos.cropH + heightChange;
                        newY = startPos.cropY - heightChange;
                    }
                } else if (isResizing === 'tl') {
                    if (aspectRatio) {
                        const delta = Math.min(dx, dy * aspectRatio);
                        const widthChange = Math.min(startPos.cropX, -delta);
                        newWidth = startPos.cropW + widthChange;
                        newHeight = newWidth / aspectRatio;
                        newX = startPos.cropX - widthChange;
                        newY = startPos.cropY - (newHeight - startPos.cropH);
                    } else {
                        const widthChange = Math.max(-startPos.cropW + 5, Math.min(startPos.cropX, -dx));
                        newWidth = startPos.cropW + widthChange;
                        newX = startPos.cropX - widthChange;
                        const heightChange = Math.max(-startPos.cropH + 5, Math.min(startPos.cropY, -dy));
                        newHeight = startPos.cropH + heightChange;
                        newY = startPos.cropY - heightChange;
                    }
                } else if (isResizing === 'bottom') {
                    if (aspectRatio) {
                        newHeight = Math.min(100 - startPos.cropY, startPos.cropH + dy);
                        newWidth = newHeight * aspectRatio;
                        if (newX + newWidth > 100) newX = 100 - newWidth;
                    } else {
                        newHeight = Math.max(5, Math.min(100 - startPos.cropY, startPos.cropH + dy));
                    }
                } else if (isResizing === 'top') {
                    const heightChange = Math.max(-startPos.cropH + 5, Math.min(startPos.cropY, -dy));
                    if (aspectRatio) {
                        newHeight = startPos.cropH + heightChange;
                        newWidth = newHeight * aspectRatio;
                        newY = startPos.cropY - heightChange;
                        if (newX + newWidth > 100) newX = 100 - newWidth;
                    } else {
                        newHeight = startPos.cropH + heightChange;
                        newY = startPos.cropY - heightChange;
                    }
                } else if (isResizing === 'right') {
                    if (aspectRatio) {
                        const delta = Math.max(dx, dy * aspectRatio);
                        newWidth = Math.min(100 - startPos.cropX, startPos.cropW + delta);
                        newHeight = newWidth / aspectRatio;
                        if (newY + newHeight > 100) newY = 100 - newHeight;
                    } else {
                        newWidth = Math.max(5, Math.min(100 - startPos.cropX, startPos.cropW + dx));
                    }
                } else if (isResizing === 'left') {
                    const widthChange = Math.max(-startPos.cropW + 5, Math.min(startPos.cropX, -dx));
                    if (aspectRatio) {
                        newWidth = startPos.cropW + widthChange;
                        newHeight = newWidth / aspectRatio;
                        newX = startPos.cropX - widthChange;
                        if (newY + newHeight > 100) newY = 100 - newHeight;
                    } else {
                        newWidth = startPos.cropW + widthChange;
                        newX = startPos.cropX - widthChange;
                    }
                }

                setCrop({
                    x: Math.max(0, newX),
                    y: Math.max(0, newY),
                    width: Math.min(100, newWidth),
                    height: Math.min(100, newHeight)
                });
            }
        };

        const handleStop = () => {
            setIsDragging(false);
            setIsResizing(null);
            
            // Calculate final pixels for callback
            if (imgRef.current) {
                const { naturalWidth, naturalHeight } = imgRef.current;
                onCropComplete({
                    x: (crop.x / 100) * naturalWidth,
                    y: (crop.y / 100) * naturalHeight,
                    width: (crop.width / 100) * naturalWidth,
                    height: (crop.height / 100) * naturalHeight
                });
            }
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleStop);
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleStop);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleStop);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleStop);
        };
    }, [isDragging, isResizing, crop, startPos, aspectRatio]);

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full bg-[#050505] overflow-auto flex items-start justify-center p-4 cursor-crosshair select-none scrollbar-none"
        >
            <div className="relative inline-block shadow-2xl">
                <img 
                    ref={imgRef}
                    src={image} 
                    alt="Crop preview" 
                    className="max-w-full h-auto block pointer-events-none rounded-lg"
                />
                
                {/* Dark Overlay with Hole */}
                <div className="absolute inset-0 pointer-events-none bg-black/70 rounded-lg" style={{
                    clipPath: `polygon(
                        0% 0%, 0% 100%, 
                        ${crop.x}% 100%, ${crop.x}% ${crop.y}%, 
                        ${crop.x + crop.width}% ${crop.y}%, ${crop.x + crop.width}% ${crop.y + crop.height}%, 
                        ${crop.x}% ${crop.y + crop.height}%, ${crop.x}% 100%, 
                        100% 100%, 100% 0%
                    )`
                }} />

                {/* The Resizable Frame */}
                <div 
                    className="absolute border-2 border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.3)] bg-transparent flex items-center justify-center cursor-move"
                    style={{
                        left: `${crop.x}%`,
                        top: `${crop.y}%`,
                        width: `${crop.width}%`,
                        height: `${crop.height}%`
                    }}
                    onMouseDown={(e) => handleStart(e, 'move')}
                    onTouchStart={(e) => handleStart(e, 'move')}
                >
                {/* 1/3 Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-white/20 border-b"></div>
                    <div className="border-r border-white/20 border-b"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-white/20 border-b"></div>
                    <div className="border-r border-white/20 border-b"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-white/20"></div>
                    <div className="border-r border-white/20"></div>
                </div>

                {/* Mid-Edge handles */}
                <div 
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/40 hover:bg-primary border border-white/20 rounded-full cursor-ns-resize shadow-xl z-50 transition-colors"
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'top'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'top'); }}
                />
                <div 
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/40 hover:bg-primary border border-white/20 rounded-full cursor-ns-resize shadow-xl z-50 transition-colors"
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'bottom'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'bottom'); }}
                />
                <div 
                    className="absolute top-1/2 -left-2 -translate-y-1/2 w-2 h-8 bg-white/40 hover:bg-primary border border-white/20 rounded-full cursor-ew-resize shadow-xl z-50 transition-colors"
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'left'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'left'); }}
                />
                <div 
                    className="absolute top-1/2 -right-2 -translate-y-1/2 w-2 h-8 bg-white/40 hover:bg-primary border border-white/20 rounded-full cursor-ew-resize shadow-xl z-50 transition-colors"
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'right'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'right'); }}
                />

                {/* Corner Handles */}
                <div 
                    className="absolute -top-2 -left-2 w-5 h-5 bg-white border-2 border-primary rounded-full cursor-nw-resize shadow-xl z-50"
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'tl'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'tl'); }}
                />
                <div 
                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border-2 border-primary rounded-full cursor-ne-resize shadow-xl z-50"
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'tr'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'tr'); }}
                />
                <div 
                    className="absolute -bottom-2 -left-2 w-5 h-5 bg-white border-2 border-primary rounded-full cursor-sw-resize shadow-xl z-50"
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'bl'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'bl'); }}
                />
                <div 
                    className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-primary rounded-full cursor-se-resize shadow-xl z-50"
                    onMouseDown={(e) => { e.stopPropagation(); handleStart(e, 'br'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleStart(e, 'br'); }}
                />
                
                    <span className="text-[6px] font-black uppercase text-white/40 absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap tracking-widest">
                        Drag edges to resize • Drag center to move
                    </span>
                </div>
            </div>
        </div>
    );
}
