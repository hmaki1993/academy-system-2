import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// --- CONFIGURATION ---
// In a production environment, you would generate these using 'web-push' library.
// VAPID Public Key for Web Push authentication
const VAPID_PUBLIC_KEY = 'BELzOEt47g5qmytP8tX8deVC-P1YQR-MB2qr6ePeOYmQEVQDlLb1yyNKwxRtMADvPMCIgyJrvp3oZZOr3zhIh7s';

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
        window.alert('DEBUG STEP 1: Requesting Permission...');
        const permission = await Notification.requestPermission();
        window.alert(`DEBUG: Permission Result: ${permission}`);
        if (permission !== 'granted') {
            throw new Error(`Permission not granted: ${permission}`);
        }

        // 2. Get Service Worker Registration
        window.alert('DEBUG STEP 2: Waiting for Service Worker to be Ready...');
        const registration = await navigator.serviceWorker.ready;
        window.alert('DEBUG: Service Worker READY!');

        // 3. Subscribe to Push Manager
        window.alert('DEBUG STEP 3: Browser Subscription starting...');
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        window.alert('DEBUG: Browser Subscription SUCCESS!');

        const subJSON = subscription.toJSON();
        
        if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
            throw new Error('Invalid subscription format returned from browser.');
        }

        // 4. Send to Supabase
        window.alert('DEBUG STEP 4: Sending to Supabase...');
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
    } catch (error: any) {
        console.error('Push Subscription Error:', error);
        toast.error(`Notification Error: ${error.message || 'Unknown error'}`);
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
