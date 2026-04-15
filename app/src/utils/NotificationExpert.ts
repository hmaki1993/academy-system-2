import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// --- ELITE CONFIGURATION ---
const VAPID_PUBLIC_KEY = 'BELzOEt47g5qmytP8tX8deVC-P1YQR-MB2qr6ePeOYmQEVQDlLb1yyNKwxRtMADvPMCIgyJrvp3oZZOr3zhIh7s';

/**
 * ELITE NOTIFICATION EXPERT
 * Specialized utility for robust, heads-up system notifications.
 */
export const NotificationExpert = {
    /**
     * Checks for browser support and permission status
     */
    status: async () => {
        if (!NotificationExpert.isSupported()) return 'unsupported';
        return Notification.permission;
    },

    isSupported: () => {
        return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    },

    /**
     * Request Permission and Subscribe
     */
    subscribe: async (userId: string) => {
        try {
            if (!NotificationExpert.isSupported()) {
                throw new Error('System notifications are not supported on this device.');
            }

            // 1. Request Permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permission denied. Please enable notifications in your browser settings.');
            }

            // 2. Wait for Service Worker
            const registration = await navigator.serviceWorker.ready;

            // 3. Subscribe to Push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: NotificationExpert.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            const subJSON = subscription.toJSON();
            if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
                throw new Error('Invalid hardware signal received from browser.');
            }

            // 4. Persistence in Database
            const { error } = await supabase.from('user_push_subscriptions').upsert({
                user_id: userId,
                endpoint: subJSON.endpoint,
                p256dh: subJSON.keys.p256dh,
                auth: subJSON.keys.auth,
                device_type: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 
                             /Android/i.test(navigator.userAgent) ? 'android' : 'desktop'
            }, {
                onConflict: 'user_id, endpoint'
            });

            if (error) throw error;
            console.log('🛡️ NotificationExpert: Tactical subscription active.');
            
            // Store locally for quick self-healing checks
            localStorage.setItem('elite_push_active', 'true');
            
            return true;
        } catch (error: any) {
            console.error('🛡️ NotificationExpert Error:', error);
            toast.error(error.message || 'Notification Error');
            return false;
        }
    },

    /**
     * EXPERT: Self-Healing Check
     * Ensures subscription is active in DB and browser.
     */
    ensureSubscription: async (userId: string) => {
        try {
            if (!NotificationExpert.isSupported()) return;
            const permission = Notification.permission;
            
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const existing = await registration.pushManager.getSubscription();
                
                // If browser lost it or UI flag is missing, re-subscribe
                if (!existing || !localStorage.getItem('elite_push_active')) {
                    console.log('🛡️ NotificationExpert: Repairing broken subscription...');
                    await NotificationExpert.subscribe(userId);
                }
            }
        } catch (e) {
            console.warn('🛡️ NotificationExpert: Self-healing failed.', e);
        }
    },

    /**
     * Invoke a Background Push (Trigger via Edge Function)
     */
    invokePush: async (userId: string, title: string, message: string, url: string = '/app') => {
        try {
            const { error } = await supabase.functions.invoke('send-push', {
                body: { userId, title, message, url }
            });
            if (error) throw error;
            console.log(`🚀 NotificationExpert: Push dispatched to [${userId}]`);
            return true;
        } catch (err) {
            console.warn('🛡️ NotificationExpert: Push dispatch failed:', err);
            return false;
        }
    },

    /**
     * Trigger a Local Notification (When app is active)
     */
    triggerLocal: async (title: string, body: string, url: string = '/app') => {
        if (Notification.permission === 'granted') {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification(title, {
                body,
                icon: '/logo-premium.png',
                badge: '/logo-premium.png',
                data: { url },
                
                // ⚡ TACTICAL HEAVY VIBRATION
                vibrate: [400, 100, 400, 100, 100, 50, 400],
                
                // 🚀 OS INTERRUPT ENFORCEMENT
                tag: `local-alert-${Date.now()}`, 
                renotify: true,
                requireInteraction: true // Forces heads-up behavior
            } as any);
        }
    },

    /**
     * Conversion Utility
     */
    urlBase64ToUint8Array: (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};
