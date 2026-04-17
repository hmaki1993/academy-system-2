import { messaging, getToken, onMessage, FCM_VAPID_KEY } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

let _foregroundListenerActive = false;
let _registrationInProgress = false;

/**
 * 🔥 Hybrid FCM Manager (Native Capacitor + Web Push)
 * Uses high-priority Native Push internally on APKs to bypass Oppo/Xiaomi limitations.
 */
export const FCMManager = {

    register: async (userId: string, force = false): Promise<boolean> => {
        if (_registrationInProgress && !force) return false;
        _registrationInProgress = true;

        try {
            if (!userId) return false;
            console.log(`🔥 FCMManager: Starting registration (Native: ${Capacitor.isNativePlatform()}) (force=${force})...`);

            if (Capacitor.isNativePlatform()) {
                return await registerNativePush(userId);
            } else {
                return await registerWebPush(userId, force);
            }
        } catch (err: any) {
            console.warn('🔥 FCMManager: Registration skipped -', err?.message || err);
            return false;
        } finally {
            _registrationInProgress = false;
        }
    },

    listenForeground: (callback: (payload: any) => void) => {
        if (_foregroundListenerActive) return;
        _foregroundListenerActive = true;

        if (Capacitor.isNativePlatform()) {
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('🚀 FCMManager Native: Foreground notification received', notification);
                callback({ notification: { title: notification.title, body: notification.body }, data: notification.data });
            });
        } else {
            try {
                onMessage(messaging, (payload) => {
                    console.log('🔥 FCMManager Web: Foreground notification received');
                    callback(payload);
                });
            } catch (err) {
                console.warn('🔥 FCMManager: Web Foreground listener error:', err);
                _foregroundListenerActive = false;
            }
        }
    }
};

/**
 * 📲 NATIVE CAPACITOR PUSH LOGIC (Guaranteed Drop-Down & Sound)
 */
async function registerNativePush(userId: string): Promise<boolean> {
    try {
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.warn('🚨 FCMManager Native: User denied push permissions.');
            return false;
        }

        // Register with Apple / Google
        await PushNotifications.register();

        return new Promise((resolve) => {
            PushNotifications.addListener('registration', async (token) => {
                console.log('🚀 Native FCM Token:', token.value);
                await saveTokenToSupabase(userId, token.value, 'Native APK: ' + Capacitor.getPlatform());
                resolve(true);
            });

            PushNotifications.addListener('registrationError', (error: any) => {
                console.error('🚨 Native Push Registration Error:', error);
                resolve(false);
            });
        });
    } catch (e) {
        console.error('🚨 FCMManager Native Setup Error:', e);
        return false;
    }
}

/**
 * 🌐 WEB PUSH LOGIC (Chrome Fallback / TWA)
 */
async function registerWebPush(userId: string, force: boolean): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('🔥 FCMManager: Push not supported on this browser');
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('🔥 FCMManager: Web Permission denied');
        return false;
    }

    if (force) {
        console.log('🔥 FCMManager: ☢️ NUCLEAR RESET INITIATED...');
        try {
            const allRegistrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of allRegistrations) {
                await reg.unregister();
            }
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {}
    }

    console.log('🔥 FCMManager: Registering Firebase Web Service Worker...');
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const fcmToken = await getToken(messaging, { vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: swRegistration });

    if (!fcmToken) return false;

    console.log('🔥 FCMManager: Web Token obtained ✅');
    return await saveTokenToSupabase(userId, fcmToken, navigator.userAgent.substring(0, 200));
}

async function saveTokenToSupabase(userId: string, token: string, deviceInfo: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert({
            user_id: userId,
            fcm_token: token,
            device_info: deviceInfo,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,fcm_token' });

    if (error) {
        console.error('🔥 FCMManager: DB save error:', error.message);
        return false;
    }
    return true;
}
