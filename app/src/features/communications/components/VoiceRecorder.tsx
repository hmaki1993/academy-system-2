import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic, Trash2, ChevronLeft, Lock, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { playRecordStartSound } from '../../../utils/sounds';

interface VoiceRecorderProps {
    onRecordingComplete: (blob: Blob, duration: number) => void;
    onRecordingStateChange?: (isRecording: boolean) => void;
    portalTarget?: HTMLElement | null;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ 
    onRecordingComplete, 
    onRecordingStateChange, 
    portalTarget 
}) => {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [dragOffsetY, setDragOffsetY] = useState(0);
    const [isCancellingMode, setIsCancellingMode] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [showLockUI, setShowLockUI] = useState(false);
    const durationRef = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startXRef = useRef<number | null>(null);
    const startYRef = useRef<number | null>(null);
    const isCancelledRef = useRef(false);
    const isLockedRef = useRef(false);
    const isStopRequestedRef = useRef(false);

    // Audio visualization refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Maximum distance user can drag before triggering action
    const CANCEL_THRESHOLD = -120;
    const LOCK_THRESHOLD = -60;

    const startTimeRef = useRef<number | null>(null);

    const stopRecording = useCallback((e?: React.MouseEvent | React.TouchEvent | Event) => {
        if (e && 'cancelable' in e && e.cancelable) e.preventDefault();

        setIsRecording(curr => {
            if (!curr) return false;

            console.log('Stopping recording, isCancelled:', isCancelledRef.current);
            isStopRequestedRef.current = true;

            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                console.log('Stopping mediaRecorder');
                mediaRecorderRef.current.stop();
            }

            const cleanup = () => {
                setIsRecording(false);
                onRecordingStateChange?.(false);
                setRecordingTime(0);
                setDragOffset(0);
                setDragOffsetY(0);
                setIsCancellingMode(false);
                isCancelledRef.current = false;
                setIsLocked(false);
                isLockedRef.current = false;
                setShowLockUI(false);
            };

            if (isCancelledRef.current) {
                // Give time for the CSS animation of the trash can "eating" the mic
                setTimeout(cleanup, 300);
            } else {
                cleanup();
            }
            startXRef.current = null;
            startYRef.current = null;
            return false;
        });
    }, [onRecordingStateChange]);

    const handleDragMove = useCallback((clientX: number, clientY: number) => {
        if (startXRef.current === null || startYRef.current === null || isLockedRef.current) return;

        const newOffsetX = clientX - startXRef.current;
        const newOffsetY = clientY - startYRef.current;

        // Swipe up to lock
        if (newOffsetY < -10 && Math.abs(newOffsetX) < 30) {
            setDragOffsetY(newOffsetY);
            setShowLockUI(true);
            if (newOffsetY <= LOCK_THRESHOLD) {
                isLockedRef.current = true;
                setIsLocked(true);
                if ('vibrate' in navigator) (navigator as any).vibrate(50);
                setDragOffsetY(0);
                setDragOffset(0);
                setTimeout(() => setShowLockUI(false), 800);
            }
        }
        // Swipe left to cancel
        else if (newOffsetX < 0 && Math.abs(newOffsetY) < 30) {
            setDragOffset(newOffsetX);

            // Highlight the trash can if close to the threshold
            if (newOffsetX <= CANCEL_THRESHOLD + 20) {
                if (!isCancellingMode) {
                    if ('vibrate' in navigator) (navigator as any).vibrate(50);
                }
                setIsCancellingMode(true);
            } else {
                setIsCancellingMode(false);
            }

            // Check if cancelled
            if (newOffsetX <= CANCEL_THRESHOLD) {
                isCancelledRef.current = true;
                if ('vibrate' in navigator) (navigator as any).vibrate([100, 50, 100]); // stronger vibration for trash

                // Animate trash eating by dropping the mic into it
                stopRecording();
            }
        }
    }, [isCancellingMode, stopRecording]);

    useEffect(() => {
        if (!isRecording) return;

        const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
        const onMouseUp = () => { if (!isLockedRef.current) stopRecording(); };
        const onTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        const onTouchEnd = () => { if (!isLockedRef.current) stopRecording(); };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [isRecording, handleDragMove, stopRecording]);

    const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
        if ('cancelable' in e && e.cancelable) e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startXRef.current = clientX;
        startYRef.current = clientY;
        isCancelledRef.current = false;
        isLockedRef.current = false;
        isStopRequestedRef.current = false;
        setIsLocked(false);
        setIsRecording(true); // Set true immediately to register window event listeners
        onRecordingStateChange?.(true);
        setShowLockUI(true);
        setDragOffset(0);
        setDragOffsetY(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            if (isStopRequestedRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            // Audio Visualization Setup
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioCtx = new AudioContextClass();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            analyser.fftSize = 64; // Smaller for fewer bars
            source.connect(analyser);

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

                // Calculate final duration
                const finalDuration = startTimeRef.current
                    ? Math.round((Date.now() - startTimeRef.current) / 1000)
                    : durationRef.current;

                // Get exact milliseconds for accurate discard check
                const exactDurationMs = startTimeRef.current
                    ? Date.now() - startTimeRef.current
                    : finalDuration * 1000;

                stream.getTracks().forEach(t => t.stop());

                // Only complete recording if not cancelled AND duration is >= 1 second (1000ms)
                if (!isCancelledRef.current && exactDurationMs >= 1000 && chunksRef.current.length > 0) {
                    onRecordingComplete(blob, Math.max(1, finalDuration));
                }
                
                durationRef.current = 0;
                startTimeRef.current = null;
            };

            recorder.start(100);
            mediaRecorderRef.current = recorder;

            playRecordStartSound();
            setRecordingTime(0);
            durationRef.current = 0;
            startTimeRef.current = Date.now();

            timerRef.current = setInterval(() => {
                durationRef.current += 1;
                setRecordingTime(prev => prev + 1);
            }, 1000);

            // Draw Waveform (Scrolling Bars like WhatsApp)
            const barWidth = 2.5;
            const gap = 2;
            const step = barWidth + gap;

            // To be safe with canvas width 80
            const maxBars = Math.ceil(80 / step) + 1;
            const history = new Array(maxBars).fill(0);

            let lastTime = performance.now();
            let scrollOffset = 0;
            const scrollSpeed = 25; // pixels per second

            const draw = (time: number) => {
                if (!canvasRef.current || !analyserRef.current) return;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const dt = (time - lastTime) / 1000;
                lastTime = time;

                // Move forward but clamp max dt to avoid jumps when the tab is inactive
                if (dt > 0 && dt < 0.1) {
                    scrollOffset += scrollSpeed * dt;
                }

                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const currentVolume = (sum / bufferLength) / 255.0;

                // When offset reaches a full step, we "commit" the bar and slide the array
                if (scrollOffset >= step) {
                    scrollOffset -= step;
                    history.push(currentVolume);
                    history.shift();
                } else {
                    // Update the head (rightmost bar) to the maximum volume hit during its "entry" phase
                    history[history.length - 1] = Math.max(history[history.length - 1], currentVolume);
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ef4444'; // Red matching mic

                for (let i = 0; i < history.length; i++) {
                    const volume = history[i];
                    // Enhance lower volumes slightly so it's not totally flat, curve the high end
                    const boostedVolume = Math.min(1, volume * 1.5 + 0.1);
                    const height = Math.max(2.5, boostedVolume * (canvas.height - 4));

                    // x position: i is index. 0 is oldest (leftmost), max is newest (rightmost)
                    const x = i * step - scrollOffset;
                    const y = (canvas.height - height) / 2;

                    ctx.beginPath();
                    if ((ctx as any).roundRect) {
                        (ctx as any).roundRect(x, y, barWidth, height, barWidth / 2);
                    } else {
                        ctx.rect(x, y, barWidth, height);
                    }
                    ctx.fill();
                }

                animationFrameRef.current = requestAnimationFrame(draw);
            };
            animationFrameRef.current = requestAnimationFrame(draw);

            if ('vibrate' in navigator) (navigator as any).vibrate(50);
        } catch (error) {
            console.error('Recording initialization failed:', error);
            toast.error(t('communications.micAccessDenied', 'Microphone access denied'));
            setIsRecording(false);
            onRecordingStateChange?.(false);
        }
    };

    return (
        <div className="relative flex items-center h-full">
            {isRecording && portalTarget && createPortal(
                <div className="absolute inset-0 z-50 flex items-center px-3 rounded-full animate-premium-in bg-transparent justify-between">
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        {!isLocked && (
                            <>
                                <div className="relative">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                                </div>
                                <span className="text-white font-mono text-sm min-w-[45px] tabular-nums tracking-wider">
                                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pr-2 flex-1 justify-end min-w-0">
                        {isLocked ? (
                            <>
                                <button
                                    onClick={() => {
                                        isCancelledRef.current = true;
                                        stopRecording();
                                    }}
                                    className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] flex-shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-2.5 flex-shrink-0 mr-1">
                                    <div className="relative">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                                    </div>
                                    <span className="text-white font-mono text-sm min-w-[45px] tabular-nums tracking-wider">
                                        {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                    className="text-white/40 font-semibold tracking-wider text-[10px] sm:text-xs uppercase flex items-center gap-1.5 whitespace-nowrap overflow-hidden transition-all duration-300"
                                    style={{
                                        opacity: Math.max(0, 1 - Math.abs(dragOffset) / 60),
                                        transform: `translateX(${dragOffset * 0.2}px)`
                                    }}
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse opacity-70 flex-shrink-0" />
                                    <span className="truncate">{t('communications.swipeToCancel', 'slide to cancel')}</span>
                                </span>
                            </div>
                        )}
                        <div className="h-6 w-[80px] flex items-center overflow-hidden flex-shrink-0">
                            <canvas ref={canvasRef} width="80" height="20" className="opacity-90" />
                        </div>
                    </div>
                </div>,
                portalTarget
            )}

            {/* Trash Bin that appears when actively swiping near X threshold */}
            {isRecording && !isLocked && Math.abs(dragOffset) > 20 && (
                <div
                    className="absolute right-full mr-4 z-[100] text-red-500 transition-all duration-300 ease-out flex items-center justify-center pointer-events-none"
                    style={{
                        transform: `scale(${isCancelledRef.current ? 1.5 : (Math.abs(dragOffset) / Math.abs(CANCEL_THRESHOLD))})`,
                        opacity: isCancelledRef.current ? 1 : Math.min(1, Math.abs(dragOffset) / 40 - 0.5),
                        left: -Math.abs(CANCEL_THRESHOLD) - 10
                    }}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCancelledRef.current ? 'bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-white/5'}`}>
                        <Trash2 className={`w-6 h-6 ${isCancelledRef.current ? 'animate-bounce fill-red-500/20' : ''}`} />
                    </div>
                </div>
            )}

            {/* Swipe to lock animation container */}
            {isRecording && showLockUI && !isCancelledRef.current && !isLocked && (
                <div
                    className="absolute bottom-[100%] left-0 w-full flex justify-center pb-4 pointer-events-none transition-all duration-300 z-[100]"
                    style={{
                        opacity: dragOffsetY < -10 ? Math.max(0, 1 - (Math.abs(dragOffsetY) / Math.abs(LOCK_THRESHOLD))) : 0,
                    }}
                >
                    <div
                        className="bg-[#1a1c1e] backdrop-blur-md border border-white/10 rounded-full p-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4 transition-transform duration-75"
                        style={{
                            transform: `translateY(${Math.min(0, dragOffsetY + 20)}px)`
                        }}
                    >
                        <Lock className="w-4 h-4 text-white/50 animate-bounce" />
                        <div className="flex flex-col gap-1.5 opacity-50">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse delay-75" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse delay-150" />
                        </div>
                    </div>
                </div>
            )}

            {isLocked ? (
                <button
                    type="button"
                    onClick={stopRecording}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all hover:scale-110 active:scale-95 z-50 animate-in fade-in zoom-in-50"
                    title={t('communications.sendVoiceNote', 'Send Voice Note')}
                >
                    <Send className="w-4 h-4 ml-0.5" />
                </button>
            ) : (
                <button
                    type="button"
                    onMouseDown={startRecording}
                    onTouchStart={startRecording}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 flex-shrink-0 border touch-none z-50 relative
                        ${isRecording
                            ? (isCancelledRef.current
                                ? 'duration-300 scale-0 opacity-0 rotate-180 bg-red-500 text-white border-red-500' // Trash eating animation
                                : (isCancellingMode
                                    ? 'duration-75 bg-red-500 text-white border-red-600 scale-[1.25] shadow-[0_0_25px_rgba(239,68,68,0.6)] animate-pulse' // Danger zone
                                    : 'duration-75 bg-[#991b1b] text-[#fca5a5] border-[#dc2626] scale-[1.15] shadow-[0_0_15px_rgba(220,38,38,0.4)]')) // Safe zone
                            : 'duration-300 bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10' // Idle
                        }`}
                    style={isRecording && !isCancelledRef.current ? { transform: `translate(${dragOffset}px, ${dragOffsetY}px) scale(${isCancellingMode ? 1.25 : 1.15})` } : (isCancelledRef.current ? { transform: `translate(${CANCEL_THRESHOLD}px, 0px) scale(0) rotate(-45deg)` } : {})}
                    title={t('communications.recorderTooltip', 'Hold to record, slide left to cancel, slide up to lock')}
                >
                    <Mic className="w-5 h-5 flex-shrink-0" />
                </button>
            )}
        </div>
    );
};
