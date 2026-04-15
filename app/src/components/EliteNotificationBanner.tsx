import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { X, CheckCircle } from 'lucide-react';
import { NotificationExpert } from '../utils/NotificationExpert';

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
        // 🚀 ELITE V19: DEFENSIVE REGISTRATION
        try {
            if (NotificationExpert && typeof NotificationExpert.registerBanner === 'function') {
                NotificationExpert.registerBanner((data: NotificationData) => {
                    console.log('🔔 ELITE BANNER: Signal Received!', data);
                    setNotification(data);
                });
            }
        } catch (err) {
            console.error('🛡️ ELITE BANNER: Registration failed:', err);
        }
    }, []);

    // 🚀 TRIGGER ANIMATION ON STATE CHANGE
    useEffect(() => {
        if (notification && bannerRef.current && gsap) {
            try {
                console.log('🎬 ELITE BANNER: Starting Animation...');
                
                // Kill any concurrent animations safely
                if (typeof (gsap as any).killTweensOf === 'function') {
                    (gsap as any).killTweensOf(bannerRef.current);
                }
                
                gsap.fromTo(bannerRef.current, 
                    { y: -120, opacity: 0, scale: 0.8 },
                    { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.5)" }
                );

                // Auto-hide after 6 seconds
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    hideNotification();
                }, 6000);
            } catch (err) {
                console.error('🎬 ELITE BANNER: Animation failed:', err);
                // Fallback to state clear if animation fails
                setNotification(null);
            }
        }
    }, [notification]);

    const hideNotification = () => {
        if (bannerRef.current) {
            gsap.to(bannerRef.current, {
                y: -150,
                opacity: 0,
                scale: 0.9,
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
            className="fixed top-2 left-0 right-0 z-[999999] flex justify-center px-4 pointer-events-none"
            style={{ perspective: '1000px' }}
        >
            <div 
                ref={bannerRef}
                onClick={() => {
                    if (notification.url) window.location.href = notification.url;
                }}
                className="pointer-events-auto w-full max-w-md bg-black/80 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.7)] p-5 flex items-center gap-4 cursor-pointer group hover:bg-black/90 transition-all border-b-emerald-500/50"
                style={{ opacity: 0, transform: 'translateY(-120px)' }}
            >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <CheckCircle className="w-8 h-8 text-white animate-bounce" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className="text-[12px] font-black text-white uppercase tracking-[0.2em] truncate">
                        {notification.title}
                    </h4>
                    <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2 mt-1 font-medium">
                        {notification.body}
                    </p>
                </div>

                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        hideNotification();
                    }}
                    className="p-2.5 hover:bg-white/10 rounded-xl text-white/30 hover:text-white transition-all active:scale-95"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* ANIMATED SCANLINE */}
                <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent w-full opacity-50" />
            </div>
        </div>
    );
};
