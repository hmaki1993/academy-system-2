import React, { useState, useEffect } from 'react';
import { Bell, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { getNotificationPermission, subscribeUserToPush, isPushSupported } from '../utils/pushManager';
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
        window.alert('DEBUG: Button Clicked! Starting Subscribe Flow...');
        console.log('Push Prompt: Subscription requested for user:', userId);
        
        if (!userId) {
            window.alert('DEBUG ERROR: No UserID found in context!');
            toast.error('Identity Missing. Please refresh.');
            return;
        }

        setIsSubscribing(true);
        try {
            const success = await subscribeUserToPush(userId);
            window.alert(`DEBUG: Subscription Finished! Success: ${success}`);
            if (success) {
                setIsVisible(false);
            }
        } catch (err: any) {
            window.alert(`DEBUG CRASH: ${err.message}`);
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
            onClick={() => window.alert('CLICK DETECTED ON ROOT CONTAINER!')}
            onPointerDown={() => window.alert('POINTER DOWN ON ROOT!')}
            style={{ 
                position: 'fixed', 
                bottom: '100px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                zIndex: 999999, 
                width: '95%', 
                maxWidth: '500px',
                pointerEvents: 'auto',
                display: 'block'
            }}
            className="animate-premium-up"
        >
            <div className="bg-[#050510]/95 backdrop-blur-3xl border-2 border-primary/20 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 relative z-10">
                    <Bell className="w-6 h-6 text-primary animate-pulse" />
                </div>

                <div className="flex-1 relative z-10">
                    <h3 className="text-white font-black text-sm uppercase tracking-widest text-primary">DIAGNOSTIC: ELITE ALERTS</h3>
                    <p className="text-white/60 text-xs leading-relaxed font-bold">
                        TAP ANYWHERE ON THIS CARD TO TEST.
                    </p>
                </div>

                <div className="flex items-center gap-2 relative z-20">
                    <button
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            window.alert('POINTER DOWN ON ENABLE!');
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.alert('CLICK ON ENABLE!');
                            handleSubscribe();
                        }}
                        disabled={isSubscribing}
                        className="bg-primary text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] active:bg-white active:text-primary disabled:opacity-50"
                        style={{ pointerEvents: 'auto' }}
                    >
                        {isSubscribing ? 'WAIT...' : 'ENABLE NOW'}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss();
                        }}
                        className="p-2 text-white/40"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
