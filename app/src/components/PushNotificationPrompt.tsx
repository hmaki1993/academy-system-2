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
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[99999] w-[95%] max-w-lg animate-premium-down">
            <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-50" />
                
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-primary animate-pulse" />
                </div>

                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm">Enable Elite Alerts</h3>
                    <p className="text-white/40 text-xs leading-relaxed">
                        Get instant missions & goal updates delivered to your home screen.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDismiss}
                        className="p-2 text-white/20 hover:text-white/40 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleSubscribe}
                        disabled={isSubscribing}
                        className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-glow-primary flex items-center gap-2 group-hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {isSubscribing ? (
                            'Enabling...'
                        ) : (
                            <>
                                Enable <ArrowRight className="w-3 h-3 text-white/40 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
