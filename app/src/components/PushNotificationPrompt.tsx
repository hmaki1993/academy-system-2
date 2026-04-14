import React, { useState, useEffect } from 'react';
import { Bell, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { getNotificationPermission, isPushSupported } from '../utils/pushManager';
import { NotificationExpert } from '../utils/NotificationExpert';
import { toast } from 'react-hot-toast';

interface PushNotificationPromptProps {
    userId: string | undefined;
}

export function PushNotificationPrompt({ userId }: PushNotificationPromptProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);

    useEffect(() => {
        // Only show if supported and not yet granted/denied
        const checkPermission = () => {
            if (!isPushSupported()) return;
            
            const permission = getNotificationPermission();
            const hasDismissed = localStorage.getItem('push_prompt_dismissed');
            
            if (permission === 'default' && !hasDismissed && userId) {
                // Delay showing to be less intrusive
                const timer = setTimeout(() => setIsVisible(true), 3000);
                return () => clearTimeout(timer);
            }
        };

        checkPermission();
    }, [userId]);

    const handleSubscribe = async () => {
        if (!userId) {
            toast.error('Identity Missing. Please refresh.');
            return;
        }

        setIsSubscribing(true);
        try {
            const success = await NotificationExpert.subscribe(userId);
            if (success) {
                setIsVisible(false);
            }
        } catch (err: any) {
            console.error('Subscription error:', err);
        } finally {
            setIsSubscribing(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('push_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div 
            style={{ 
                position: 'fixed', 
                bottom: '1.5rem', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 999999, 
                width: '92%', 
                maxWidth: '400px',
                pointerEvents: 'auto'
            }}
            className="animate-premium-in"
        >
            <div className="bg-[#050510]/95 backdrop-blur-2xl border border-primary/30 rounded-3xl p-5 shadow-[0_20px_80px_rgba(0,0,0,0.8)] flex items-center gap-4 relative overflow-hidden group">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Bell className="w-6 h-6 text-primary animate-pulse" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-black text-xs uppercase tracking-widest mb-0.5">Push Alerts</h3>
                    <p className="text-white/50 text-[10px] font-bold leading-tight">
                        Enable notifications for instant <span className="text-primary">Elite Updates</span>.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleSubscribe}
                        disabled={isSubscribing}
                        className="bg-primary text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-glow-primary active:scale-95 transition-all whitespace-nowrap"
                    >
                        {isSubscribing ? '...' : 'ENABLE'}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="text-white/20 text-[8px] font-black uppercase tracking-tighter hover:text-white/40 text-center"
                    >
                        Later
                    </button>
                </div>

                {/* Subtle Ambient Glow */}
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                
                {/* Visual Glass Sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            </div>
        </div>
    );
}
