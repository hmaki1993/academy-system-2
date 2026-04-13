import { useState, useEffect } from 'react';
import { Activity, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
    targetDate: string;
    status: string | null;
}

export default function MinimalCountdown({ targetDate, status }: Props) {
    const [timeLeft, setTimeLeft] = useState<{ h?: string, m: string, s: string } | null>(null);
    const [elapsedTime, setElapsedTime] = useState<{ h?: string, m: string, s: string } | null>(null);
    const isLive = status?.toLowerCase() === 'live';
    const isPaused = status === 'paused';
    const isIdle = status === 'idle';

    useEffect(() => {
        const calculate = () => {
            let target: Date;
            if (targetDate.includes(':') && !targetDate.includes('-') && !targetDate.includes('/')) {
                const [h, m] = targetDate.split(':').map(Number);
                target = new Date();
                target.setHours(h, m, 0, 0);
            } else {
                target = new Date(targetDate.replace(' ', 'T'));
            }

            const now = new Date();
            
            if (isLive || isPaused || (isIdle && elapsedTime)) {
                let diff = Math.max(0, now.getTime() - target.getTime());
                
                // 🛡️ Zero-Flicker Protection
                if (diff < 2000 && !isIdle) diff = 0;

                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
                const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
                
                const timeObj = h > 0 ? { h: h.toString(), m, s } : { m, s };
                setElapsedTime(timeObj);
                setTimeLeft(null);
                return;
            }

            const diff = target.getTime() - now.getTime();

            if (isNaN(diff) || diff <= 0) {
                setTimeLeft(null);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
            const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
            
            const timeObj = h > 0 ? { h: h.toString(), m, s } : { m, s };
            setTimeLeft(timeObj);
        };

        calculate();
        const timer = setInterval(calculate, 1000);
        return () => clearInterval(timer);
    }, [targetDate, isLive, isPaused, isIdle]);

    // UI Logic: JOIN is available if Live, Paused, OR if Scheduled and time reached
    const isReadyToJoin = status === 'live' || isPaused || (status === 'scheduled' && !timeLeft && elapsedTime);
    const displayTime = isLive || isPaused || isIdle ? elapsedTime : timeLeft;

    return (
        <Link 
            to="/app/smart-training" 
            className="group relative flex flex-col items-end transition-all duration-500 hover:scale-105 active:scale-95 w-fit ml-auto"
        >
            {isReadyToJoin ? (
                /* LIVE/READY/PAUSED STATE: JOIN ACTION */
                <div className="flex flex-col items-end leading-none animate-in fade-in zoom-in duration-700">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.6)] animate-pulse'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.4em] italic leading-none ${isPaused ? 'text-yellow-500' : 'text-green-400'}`}>
                            {isPaused ? 'Session Paused' : (isIdle ? 'SESSION ENDED' : (status === 'scheduled' ? 'TIME TO START' : 'Live Session'))}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-5xl font-black italic tracking-[0.1em] leading-none ${isPaused ? 'text-white/40' : 'text-white'}`}>
                            {isPaused ? 'HOLD' : 'JOIN'}
                        </span>
                        <Zap className={`w-6 h-6 ${isPaused ? 'text-yellow-500/40' : 'text-primary animate-pulse'} fill-current`} />
                    </div>
                </div>
            ) : displayTime && !isIdle ? (
                /* COUNTDOWN/ELAPSED STATE: BIG TYPE */
                <div className="flex flex-col items-end leading-none animate-in fade-in duration-500">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-2 italic">
                        SYNCING
                    </span>
                    <span className="text-5xl font-black italic tracking-tighter tabular-nums text-white leading-none">
                        {displayTime.h && `${displayTime.h}:`}{displayTime.m}:{displayTime.s}
                    </span>
                </div>
            ) : (
                /* IDLE/STOPPED STATE: RESET TO 00:00 BUT PERSISTENT */
                <div className="flex flex-col items-end leading-none opacity-20 group-hover:opacity-40 transition-opacity">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-2 italic">READY</span>
                    <span className="text-5xl font-black text-white italic tracking-tighter tabular-nums leading-none">
                        00:00
                    </span>
                </div>
            )}
        </Link>
    );
}
