import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { Profile } from '../types';

export const VoiceNotePlayer = ({ url, duration, sender, isOwn }: { url: string; duration?: number; sender?: Profile; isOwn: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const requestRef = useRef<number>();

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const [waveform, setWaveform] = useState<number[]>(() =>
        new Array(35).fill(0).map(() => 20 + Math.random() * 30)
    );

    useEffect(() => {
        let isAborted = false;
        const bars = 35;

        async function analyzeAudio() {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                if (isAborted) return;

                const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                const audioCtx = new AudioContextClass();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                if (isAborted) return;

                const rawData = audioBuffer.getChannelData(0);
                const blockSize = Math.floor(rawData.length / bars);
                const heights = [];

                for (let i = 0; i < bars; i++) {
                    const start = i * blockSize;
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[start + j]);
                    }
                    const rms = sum / blockSize;
                    const scaled = Math.min(100, Math.max(30, rms * 800));
                    heights.push(scaled);
                }

                setWaveform(heights);
                audioCtx.close();
            } catch (err) {
                console.error("Waveform error:", err);
                setWaveform(new Array(bars).fill(0).map(() => 25 + Math.random() * 25));
            }
        }

        analyzeAudio();
        return () => { isAborted = true; };
    }, [url]);

    const updateProgress = useCallback(() => {
        if (!audioRef.current || isDragging) return;
        const audio = audioRef.current;
        if (!audio.duration || isNaN(audio.duration)) {
            requestRef.current = requestAnimationFrame(updateProgress);
            return;
        }
        const currentProgress = (audio.currentTime / audio.duration) * 100;
        setProgress(currentProgress);
        setCurrentTime(audio.currentTime);
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateProgress);
        }
    }, [isPlaying, isDragging]);

    useEffect(() => {
        if (isPlaying && !isDragging) {
            requestRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, isDragging, updateProgress]);

    const handleScrub = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        const container = document.getElementById(`waveform-${url}`);
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newProgress = ratio * 100;
        setProgress(newProgress);
        if (audioRef.current && audioRef.current.duration) {
            setCurrentTime(ratio * audioRef.current.duration);
        }
    };

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent | TouchEvent) => handleScrub(e);
        const onEnd = () => {
            setIsDragging(false);
            if (audioRef.current && audioRef.current.duration) {
                audioRef.current.currentTime = (progress / 100) * audioRef.current.duration;
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onEnd);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isDragging, progress]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onEnd = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };
        audio.addEventListener('ended', onEnd);
        return () => audio.removeEventListener('ended', onEnd);
    }, []);

    return (
        <div className="flex items-center gap-2.5 min-w-[220px] max-w-[280px] select-none relative pb-4">
            <audio ref={audioRef} src={url} preload="metadata" />
            <button
                onClick={togglePlay}
                type="button"
                className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 flex-shrink-0 border border-white/10"
            >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-white/90 fill-current" /> : <Play className="w-3.5 h-3.5 text-white/90 fill-current ml-0.5" />}
            </button>
            <div
                id={`waveform-${url}`}
                className="flex-1 h-8 flex items-center justify-between cursor-pointer relative group touch-none"
                onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); handleScrub(e); }}
                onTouchStart={(e) => { e.stopPropagation(); setIsDragging(true); handleScrub(e); }}
            >
                {waveform.map((h, i) => {
                    const barProgress = (i / (waveform.length - 1)) * 100;
                    const isActive = progress >= barProgress;
                    return (
                        <div
                            key={i}
                            className={`w-[2px] rounded-full transition-colors duration-200`}
                            style={{
                                height: `${h}%`,
                                backgroundColor: isActive ? 'var(--color-primary, #ef4444)' : 'rgba(255,255,255,0.12)'
                            }}
                        />
                    );
                })}
                <div
                    className={`absolute top-1/2 w-2.5 h-2.5 bg-primary rounded-full shadow-md z-10 transition-transform active:scale-150 ${isDragging ? 'scale-150' : 'group-hover:scale-125'}`}
                    style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)', backgroundColor: 'var(--color-primary)' }}
                />
                <div className="absolute -bottom-3.5 left-0">
                    <span className="text-[10px] text-white/30 font-bold tracking-tight">{formatTime(currentTime)}</span>
                </div>
            </div>
        </div>
    );
};
