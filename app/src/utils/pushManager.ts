import { supabase } from '../lib/supabase';

// --- CONFIGURATION ---
// In a production environment, you would generate these using 'web-push' library.
// VAPID Public Key for Web Push authentication
const VAPID_PUBLIC_KEY = 'BD6Zl9X-kO0-V6X0A_X6Q_2YyEw-9Z4X0I_X6Q_2YyEw_9Z4X0I_X6Q_2YyEw';

export interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

/**
 * Converts a base64 string to a Uint8Array suitable for the PushManager
 */
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Checks if the browser supports Push Notifications
 */
export const isPushSupported = () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Gets the current notification permission status
 */
export const getNotificationPermission = () => {
    return Notification.permission;
};

/**
 * Requests permission and subscribes the user to Push Notifications
 */
export const subscribeUserToPush = async (userId: string) => {
    try {
        if (!isPushSupported()) {
            throw new Error('Push notifications are not supported in this browser.');
        }

        // 1. Request Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Permission not granted for notifications.');
        }

        // 2. Get Service Worker Registration
        const registration = await navigator.serviceWorker.ready;

        // 3. Subscribe to Push Manager
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        const subJSON = subscription.toJSON();
        
        if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
            throw new Error('Invalid subscription format returned from browser.');
        }

        // 4. Send to Supabase
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

        return true;
    } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
        return false;
    }
};

/**
 * Unsubscribes the user from Push Notifications
 */
export const unsubscribeUserFromPush = async (userId: string) => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            await subscription.unsubscribe();
            
            // Remove from Supabase
            await supabase
                .from('user_push_subscriptions')
                .delete()
                .match({ user_id: userId, endpoint: subscription.endpoint });
        }
        
        return true;
    } catch (error) {
        console.error('Failed to unsubscribe from push notifications:', error);
        return false;
    }
};
