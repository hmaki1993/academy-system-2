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
            <div className="bg-[#050510] border-2 border-primary rounded-3xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col items-center gap-6 relative">
                <div className="flex items-center gap-4 w-full">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bell className="w-7 h-7 text-primary animate-bounce" />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-lg uppercase tracking-widest">STEP 2: ENABLE NOW</h3>
                        <p className="text-white/60 text-xs font-bold">Please click the big button below.</p>
                    </div>
                </div>

                <button
                    onPointerDown={() => window.alert('TOUCH DETECTED ON BUTTON!')}
                    onClick={() => {
                        window.alert('CLICK CONFIRMED! Starting Process...');
                        handleSubscribe();
                    }}
                    disabled={isSubscribing}
                    className="w-full bg-primary text-white py-8 rounded-2xl text-xl font-black uppercase tracking-[0.2em] shadow-glow-primary active:bg-white active:text-primary transition-all"
                    style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}
                >
                    {isSubscribing ? 'PROCESS STARTING...' : 'ENABLE ALERTS'}
                </button>

                <button
                    onClick={handleDismiss}
                    className="text-white/20 text-[10px] font-bold uppercase tracking-widest hover:text-white/40"
                >
                    Dismiss for now
                </button>
            </div>
        </div>
    );
}
