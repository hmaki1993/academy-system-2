import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '../lib/supabase';

let _bridgeActive = false;
let _channelCreated = false;

const CHANNEL_ID = 'skippy_toes_alerts';
let _notifId = 1000;

/**
 * 🔔 NotificationBridge
 * Listens to Supabase Realtime and fires LOCAL system notifications.
 * This bypasses FCM delivery issues entirely - the app fires its own
 * heads-up banners with sound & vibration. Same pattern as Scooter Fuel.
 */
export async function startNotificationBridge(userId: string) {
    if (_bridgeActive || !userId) return;
    _bridgeActive = true;

    console.log('🔔 NotificationBridge: Starting for user', userId);

    // 1. Setup LocalNotifications channel (Android only)
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        try {
            if (!_channelCreated) {
                // Request permissions first
                const perm = await LocalNotifications.checkPermissions();
                if (perm.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }

                // Delete old channel and create fresh high-importance one
                try { await LocalNotifications.deleteChannel({ id: 'epic_alerts' }); } catch {}
                try { await LocalNotifications.deleteChannel({ id: CHANNEL_ID }); } catch {}

                await LocalNotifications.createChannel({
                    id: CHANNEL_ID,
                    name: 'Skippy Alerts',
                    description: 'Urgent training alerts',
                    importance: 5,       // MAX → heads-up banner
                    visibility: 1,       // PUBLIC
                    vibration: true,
                    lights: true,
                    lightColor: '#FF3B30',
                    sound: 'default',
                } as any);

                _channelCreated = true;
                console.log('🔔 NotificationBridge: Channel created ✅');
            }
        } catch (e) {
            console.warn('🔔 NotificationBridge: Channel setup failed', e);
        }
    }

    // 2. Subscribe to Supabase Realtime for this user
    const channel = supabase
        .channel(`user-notifications:${userId}`)
        .on('broadcast', { event: 'mission-alert' }, async (payload) => {
            console.log('🔔 NotificationBridge: Received broadcast!', payload);

            const title = payload?.payload?.title || '🏆 Skippy Toes Q8';
            const body  = payload?.payload?.body  || 'لديك رسالة جديدة';

            if (Capacitor.isNativePlatform()) {
                // 🔥 FIRE LOCAL NOTIFICATION — Guaranteed heads-up banner
                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            id: _notifId++,
                            title: title,
                            body: body,
                            channelId: CHANNEL_ID,
                            sound: 'default',
                            smallIcon: 'ic_launcher',
                            actionTypeId: '',
                            extra: null,
                        }]
                    });
                    console.log('🔔 NotificationBridge: Local notification fired ✅');
                } catch (e) {
                    console.error('🔔 NotificationBridge: LocalNotification failed', e);
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
