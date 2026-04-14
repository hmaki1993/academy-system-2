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
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                zIndex: 999999, 
                width: '90%', 
                maxWidth: '400px',
                pointerEvents: 'auto',
                display: 'block'
            }}
            className="animate-premium-in"
        >
            <div className="bg-[#050510] border-2 border-primary rounded-[2.5rem] p-8 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col items-center text-center gap-6 relative">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <Bell className="w-8 h-8 text-primary animate-bounce" />
                </div>
                
                <div>
                    <h3 className="text-white font-black text-xl uppercase tracking-widest mb-2">FINAL STEP</h3>
                    <p className="text-white/60 text-sm font-bold leading-relaxed px-4">
                        Please click the button below to enable your <span className="text-primary">Elite Alerts</span>.
                    </p>
                </div>

                <button
                    onClick={() => {
                        window.alert('CLICK CONFIRMED! Launching system dialog...');
                        handleSubscribe();
                    }}
                    disabled={isSubscribing}
                    className="w-full bg-primary text-white py-6 rounded-2xl text-lg font-black uppercase tracking-[0.2em] shadow-glow-primary active:scale-95 transition-all"
                    style={{ pointerEvents: 'auto' }}
                >
                    {isSubscribing ? 'PROCESSING...' : 'ENABLE NOW'}
                </button>

                <button
                    onClick={handleDismiss}
                    className="text-white/20 text-xs font-bold uppercase tracking-widest hover:text-white/40 border-b border-transparent hover:border-white/20"
                >
                    No, maybe later
                </button>

                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            </div>
        </div>
    );
}
