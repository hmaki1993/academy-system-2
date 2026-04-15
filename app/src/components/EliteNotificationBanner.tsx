import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { X, CheckCircle } from 'lucide-react';

interface NotificationData {
    title: string;
    body: string;
    url?: string;
}

export const EliteNotificationBanner: React.FC = () => {
    const [notification, setNotification] = useState<NotificationData | null>(null);
    const bannerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleEvent = (e: any) => {
            const data = e.detail;
            setNotification(data);
            
            // Clear any existing timer
            if (timerRef.current) clearTimeout(timerRef.current);
            
            // Show animation
            setTimeout(() => {
                if (bannerRef.current) {
                    gsap.fromTo(bannerRef.current, 
                        { y: -100, opacity: 0, scale: 0.9 },
                        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" }
                    );
                }
            }, 100);

            // Auto-hide after 6 seconds
            timerRef.current = setTimeout(() => {
                hideNotification();
            }, 6000);
        };

        window.addEventListener('elite-notification', handleEvent);
        return () => window.removeEventListener('elite-notification', handleEvent);
    }, []);

    const hideNotification = () => {
        if (bannerRef.current) {
            gsap.to(bannerRef.current, {
                y: -150,
                opacity: 0,
                duration: 0.5,
                ease: "power2.in",
                onComplete: () => setNotification(null)
            });
        } else {
            setNotification(null);
        }
    };

    if (!notification) return null;

    return (
        <div 
            className="fixed top-4 left-0 right-0 z-[99999] flex justify-center px-4 pointer-events-none"
        >
            <div 
                ref={bannerRef}
                onClick={() => {
                    if (notification.url) window.location.href = notification.url;
                }}
                className="pointer-events-auto w-full max-w-md bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex items-center gap-4 cursor-pointer group hover:bg-black/70 transition-colors"
                style={{ opacity: 0, transform: 'translateY(-100px)' }}
            >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle className="w-6 h-6 text-emerald-500 animate-pulse" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] font-black text-white/90 uppercase tracking-widest truncate">
                        {notification.title}
                    </h4>
                    <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2 mt-0.5">
                        {notification.body}
                    </p>
                </div>

                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        hideNotification();
                    }}
                    className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white/60 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* ANIMATED SCANLINE */}
                <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent w-full" />
            </div>
        </div>
    );
};
