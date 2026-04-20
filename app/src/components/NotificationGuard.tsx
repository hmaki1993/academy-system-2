import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCMManager } from '../utils/FCMManager';

interface NotificationGuardProps {
    userId: string | null;
}

export const NotificationGuard: React.FC<NotificationGuardProps> = ({ userId }) => {
    const [dismissNotif, setDismissNotif] = useState(() => localStorage.getItem('dismiss_notif_guard') === 'true');

    const handleForcePermission = async () => {
        if (Capacitor.isNativePlatform()) {
            let permStatus = await PushNotifications.requestPermissions();
            if (permStatus.receive === 'granted' && userId) {
                await FCMManager.register(userId, true);
                window.location.reload();
            } else {
                alert('يرجى تفعيل الإشعارات من إعدادات الهاتف.');
            }
            return;
        }

        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && userId) {
            await FCMManager.register(userId, true);
            window.location.reload();
        } else {
            alert('لقد رفضت التنبيهات أو جهازك يحظرها افتراضياً. يجب تفعيلها من إعدادات الهاتف (التطبيقات -> Elite Academy -> الإشعارات).');
        }
    };

    if (Capacitor.isNativePlatform()) return null;
    if (!('Notification' in window)) return null;
    if (Notification.permission === 'granted') return null;
    if (dismissNotif) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="relative w-full max-w-sm bg-[#0c0e14]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500">
                <button 
                    onClick={() => {
                        setDismissNotif(true);
                        localStorage.setItem('dismiss_notif_guard', 'true');
                    }}
                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/20 hover:text-white transition-all hover:bg-white/10"
                >
                    <X className="w-4 h-4" />
                </button>
                
                <div className="flex flex-col items-center text-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-2xl shadow-red-500/10">
                        <Bell className="w-8 h-8 animate-bounce" />
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white">Alert System Offline</h3>
                        <p className="text-xs font-medium text-white/40 leading-relaxed px-4">
                            Real-time training anchors and coach notifications are currently disabled.
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleForcePermission}
                        className="w-full bg-gradient-to-r from-primary to-accent py-4 rounded-2xl text-white text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        Enable Alerts Now
                    </button>

                    {Notification.permission === 'denied' && (
                        <div className="pt-4 border-t border-white/5 mt-2 w-full">
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-loose">
                                Previously Denied: Go to Browser Settings <br/>
                                <span className="text-primary">Settings → Notifications → Elite Academy</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
