import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock as ClockIcon } from 'lucide-react';

interface PremiumClockProps {
    className?: string;
}

export default function PremiumClock({ className = "" }: PremiumClockProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = format(time, 'hh');
    const minutes = format(time, 'mm');
    const amPm = format(time, 'aaa');

    return (
        <div className={`flex items-center gap-6 ${className} animate-in fade-in duration-1000`}>
            {/* Digital Time Core */}
            <div className="flex items-baseline gap-2 group cursor-default">
                <div className="flex items-center gap-1 font-[var(--font-orbitron)]">
                    <span className="text-3xl md:text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        {hours}
                    </span>
                    <span className="text-2xl md:text-3xl font-black text-white/20 animate-pulse">:</span>
                    <span className="text-3xl md:text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                        {minutes}
                    </span>
                </div>
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] group-hover:scale-110 transition-transform">
                    {amPm}
                </span>
            </div>

            {/* Elite Chronogram Divider */}
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            {/* Date & Day Matrix */}
            <div className="flex flex-col justify-center">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] leading-none mb-1">
                    {format(time, 'EEEE')}
                </span>
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" />
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.6em] whitespace-nowrap">
                        {format(time, 'MMM dd')}
                    </span>
                </div>
            </div>
        </div>
    );
}
