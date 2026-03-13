import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface PremiumClockProps {
    className?: string;
}

export default function PremiumClock({ className = "" }: PremiumClockProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = format(time, 'HH');
    const minutes = format(time, 'mm');
    const seconds = format(time, 'ss');
    const amPm = format(time, 'aaa');

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">
                    {hours}:{minutes}
                </span>
                <span className="text-xs font-medium text-white/40">
                    {amPm}
                </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-white/70 uppercase">
                    {format(time, 'EEEE')}
                </span>
                <span className="text-[9px] text-white/30 uppercase">
                    {format(time, 'MMM d')}
                </span>
            </div>
        </div>
    );
}
