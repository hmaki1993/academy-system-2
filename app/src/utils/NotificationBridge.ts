import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

let _bridgeActive = false;
let _notifId = 1000;

/**
 * 🔔 NotificationBridge — Scooter Fuel Pattern
 *
 * Flow:
 *   Admin sends notification
 *   → Supabase send-push broadcasts to Realtime channel
 *   → This bridge receives the broadcast
 *   → Calls SkippyPlugin.showAlert() (native Java)
 *   → NotificationCompat.Builder fires heads-up banner with sound + vibration
 *
 * This is IDENTICAL to how Scooter Fuel's AlarmPlugin.showFuelPopup() works.
 */
export async function startNotificationBridge(userId: string) {
    if (_bridgeActive || !userId) return;
    _bridgeActive = true;

    console.log('🔔 NotificationBridge: Starting for user', userId);

    // Subscribe to Supabase Realtime for this user's notification channel
    const channel = supabase
        .channel(`user-notifications:${userId}`)
        .on('broadcast', { event: 'mission-alert' }, async (payload) => {
            console.log('🔔 NotificationBridge: Received broadcast!', payload);

            const title = payload?.payload?.title || '🏆 Skippy Toes Q8';
            const body  = payload?.payload?.body  || 'لديك رسالة جديدة';

            if (Capacitor.isNativePlatform()) {
                // 🔥 FIRE NATIVE JAVA NOTIFICATION — Exact Scooter Fuel pattern
                try {
                    const SkippyPlugin = registerPlugin<any>('SkippyPlugin');
                    await SkippyPlugin.showAlert({ title, body });
                    console.log('🔔 NotificationBridge: Native alert fired ✅');
                } catch (e) {
                    console.error('🔔 NotificationBridge: SkippyPlugin.showAlert failed', e);
                    // Fallback to web notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(title, { body });
                    }
                }
            } else {
                // Web fallback
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(title, { body, icon: '/logo-premium.png' });
                }
            }
        })
        .subscribe((status) => {
            console.log('🔔 NotificationBridge: Realtime status =', status);
        });

    return channel;
}

export function stopNotificationBridge(channel: any) {
    if (channel) {
        supabase.removeChannel(channel);
        _bridgeActive = false;
        console.log('🔔 NotificationBridge: Stopped');
    }
}
