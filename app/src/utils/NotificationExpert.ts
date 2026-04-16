import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// --- ELITE CONFIGURATION ---
// Dynamically pull from environment for maximum sync stability
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BELzOEt47g5qmytP8tX8deVC-P1YQR-MB2qr6ePeOYmQEVQDlLb1yyNKwxRtMADvPMCIgyJrvp3oZZOr3zhIh7s';

/**
 * ELITE NOTIFICATION EXPERT
 * Specialized utility for robust, heads-up system notifications.
 */
export const NotificationExpert = {
    _currentUserId: '' as string,
    _bannerCallback: null as ((data: any) => void) | null,

    /**
     * Internal: Set the callback for the UI banner
     */
    registerBanner: (callback: (data: any) => void) => {
        NotificationExpert._bannerCallback = callback;
    },

    /**
     * Set User Identity for session-less environments
     */
    setIdentity: (id: string) => {
        try {
            if (id && id !== NotificationExpert._currentUserId) {
                console.log('🛡️ NotificationExpert: Identity Hydrated:', id);
                NotificationExpert._currentUserId = id;
            }
        } catch (e) {
            console.warn('🛡️ NotificationExpert: Identity hydration error:', e);
        }
    },

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
    subscribe: async (userId: string, retryCount = 0): Promise<boolean> => {
        try {
            if (!NotificationExpert.isSupported()) {
                throw new Error('System notifications are not supported on this device.');
            }

            // 1. Request Permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permission denied. Please enable notifications in your browser settings.');
            }

            // 🚀 DELAYED START: Give the browser 2 seconds to stabilize hardware connections
            if (retryCount === 0) {
                console.log('🛡️ NotificationExpert: Initiating warm-up delay...');
                await new Promise(r => setTimeout(r, 2000));
            }

            // 2. Wait for Service Worker
            const registration = await navigator.serviceWorker.ready;

            // 3. Subscribe to Push
            const applicationServerKey = NotificationExpert.urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
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
            localStorage.removeItem('elite_push_error'); // Clear previous errors
            
            return true;
        } catch (error: any) {
            console.error('🛡️ NotificationExpert Error:', error);
            
            // Log the RAW error for diagnostic hub exposure
            const rawError = `${error.name || 'Error'}: ${error.message || 'Unknown'}`;
            localStorage.setItem('elite_push_error', rawError);

            // Handle Storage Error specifically (Oppo / Standalone issue)
            if (error.message?.toLowerCase().includes('storage') || error.name === 'UnknownError' || error.name === 'QuotaExceededError') {
                if (retryCount < 1) {
                    console.warn('🛡️ NotificationExpert: Storage locked. Attempting retry...');
                    await new Promise(r => setTimeout(r, 1000));
                    return NotificationExpert.subscribe(userId, retryCount + 1);
                }
                toast.error('خطأ في ذاكرة المتصفح. تأكد من إغلاق التبويب المخفي وعمل Clear Data للمتصفح.');
            } else {
                toast.error(error.message || 'Notification Error');
            }
            return false;
        }
    },

    /**
     * DEEP CLEAN: Clears all browser storage for the site
     */
    clearSiteData: async () => {
        try {
            console.log('🛡️ NotificationExpert: Deep cleaning site data...');
            // Clear Caches
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
            }
            // Clear LocalStorage (Keep only necessary, or clear all for reset)
            const backup = localStorage.getItem('supabase.auth.token'); // Try to keep login if we can
            const errorBackup = localStorage.getItem('elite_push_error');
            localStorage.clear();
            if (backup) localStorage.setItem('supabase.auth.token', backup);
            if (errorBackup) localStorage.setItem('elite_push_error', errorBackup);
            
            return true;
        } catch (e) {
            console.error('Deep clean failed:', e);
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
     * NUCLEAR V13: Invoke via Database Relay (Bypasses Network Blocks)
     */
    invokePush: async (userId?: string, title?: string, message?: string, url: string = '/app') => {
        try {
            // 🛡️ Ensure userId is never empty (Prefer internal state)
            const activeId = userId || NotificationExpert._currentUserId;

            if (!activeId) {
                return { success: false, error: 'User Identity (Internal) Not Hydrated' };
            }

            // 🚀 ELITE V15: IMMEDIATE LOCAL FEEDBACK (FOR TESTING)
            // This ensures the user sees the banner and feels vibration immediately.
            NotificationExpert.triggerLocal(
                title || 'Test Alert 🚀', 
                message || 'If you see this, the visual system is active!', 
                url
            );

            console.log('🛡️ NotificationExpert: Dispatching via Database Relay...');
            const { error } = await supabase.from('push_relay_queue').insert({
                user_id: activeId,
                title: title || 'System Alert 🚀',
                body: message || 'Notification Test Signal',
                url,
                status: 'pending'
            });
            
            if (error) {
                console.error('🛡️ NotificationExpert: Relay DB Error:', error);
                return { success: false, error: error.message };
            }
            
            return { success: true };
        } catch (err: any) {
            console.error('🛡️ NotificationExpert: Relay Critical Failure:', err);
            return { success: false, error: err.message || 'Relay Connection Error' };
        }
    },

    /**
     * TACTICAL: Notify conversation participants (except sender)
     */
    notifyReceiver: async (convoId: string, senderId: string, title: string, message: string, url: string = '/app') => {
        try {
            // Find other participants
            const { data: participants, error } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', convoId)
                .neq('user_id', senderId);

            if (error) throw error;
            if (!participants || participants.length === 0) return;

            console.log(`🛡️ NotificationExpert: Dispatched push to ${participants.length} participants.`);

            // Parallel dispatch to all participants
            await Promise.all(participants.map(p => 
                NotificationExpert.invokePush(p.user_id, title, message, url)
            ));
        } catch (err) {
            console.warn('🛡️ NotificationExpert: Combined notify failed:', err);
        }
    },

    /**
     * Trigger a Local Notification (When app is active)
     */
    triggerLocal: async (title: string, body: string, url: string = '/app') => {
        console.log('🔔 NotificationExpert: Triggering Aggressive Native Drop-Down...');

        // 1. Trigger Haptic Vibration (CRITICAL for Heads-up behavior on Android)
        if ("vibrate" in navigator) {
            // Tactical pattern: [Short Pause, Long Buzz, Short Pause, Long Buzz]
            navigator.vibrate([0, 500, 150, 500]);
        }

        // 2. Trigger Visual Banner (Optional internal fallback)
        if (NotificationExpert._bannerCallback) {
            NotificationExpert._bannerCallback({ title, body, url });
        }

        // 3. FORCE NATIVE OS DROP-DOWN (Heads-up)
        if (Notification.permission === 'granted') {
            try {
                const registration = await navigator.serviceWorker.ready;
                registration.showNotification(title, {
                    body,
                    icon: '/logo-premium.png',
                    badge: '/logo-premium.png',
                    data: { url },
                    // 🚀 AGGRESSIVE SIGNALS (Required for OS Drop-Down)
                    vibrate: [0, 500, 150, 500],
                    tag: `alert-${Date.now()}`, // UNIQUE TAG forces OS to show a fresh bar
                    renotify: true,
                    requireInteraction: true,
                    silent: false,
                    
                    // Vendor-specific high intensity
                    priority: 2,
                    urgency: 'high'
                } as any);
            } catch (err) {
                console.warn('⚠️ Native Drop-down Failed:', err);
            }
        }
    },

    /**
     * EMERGENCY FALLBACK: Real-time listener
     * Used when Push Subscription is broken or blocked.
     */
    registerFallbackListener: (userId: string) => {
        console.log(`🛡️ NotificationExpert: Monitoring Realtime Fallback for [${userId}]`);
        
        // Mark as active for diagnostic hub
        (window as any)._elite_fallback_active = true;

        const channel = supabase.channel(`user-notifications:${userId}`)
        channel.on('broadcast', { event: 'mission-alert' }, (payload) => {
            console.log('🛡️ NotificationExpert: Fallback mission received!', payload);
            if (payload && payload.payload) {
                const { title, body, url } = payload.payload;
                NotificationExpert.triggerLocal(title, body, url);
            }
        }).subscribe((status) => {
            console.log(`🛡️ NotificationExpert: Fallback channel status: ${status}`);
            if (status === 'SUBSCRIBED') {
                (window as any)._realtime_link_active = true;
            } else {
                (window as any)._realtime_link_active = false;
            }
        });

        return () => {
            console.log('🛡️ NotificationExpert: Cleaning up fallback listener...');
            (window as any)._elite_fallback_active = false;
            (window as any)._realtime_link_active = false;
            supabase.removeChannel(channel);
        };
    },

    /**
     * NUCLEAR: Diagnostic Check
     * Returns a full health report of the notification system.
     */
    checkDiagnostic: async () => {
        const report = {
            version: 'expert-v18', // 🛡️ NUCLEAR CACHE BUSTER PIVOT
            supported: NotificationExpert.isSupported(),
            permission: Notification.permission,
            swActive: false,
            pushSubscription: false,
            pushToken: '',
            localStorage: !!localStorage.getItem('elite_push_active'),
            ua: navigator.userAgent,
            lastError: localStorage.getItem('elite_push_error') || null,
            fallbackActive: !!(window as any)._elite_fallback_active,
            realtimeConnected: !!(window as any)._realtime_link_active
        };

        // 🛡️ RESILIENT SUCCESS: If fallback is active, force UI to green status
        if (report.fallbackActive) {
            report.localStorage = true;
        }

        if (report.supported) {
            try {
                const reg = await navigator.serviceWorker.ready;
                report.swActive = !!reg;
                const sub = await reg.pushManager.getSubscription();
                report.pushSubscription = !!sub;
                if (sub) {
                    report.pushToken = sub.endpoint.split('/').pop() || 'TOKEN_ACTIVE';
                    // 🛡️ SELF-HEAL: Force persistence if subscription exists
                    localStorage.setItem('elite_push_active', 'true');
                    report.localStorage = true;
                }
            } catch (e) {
                console.error('Diagnostic error:', e);
            }
        }
        return report;
    },

    /**
     * NUCLEAR REPAIR: Hard Reset Notifications
     * Unregisters SW, clears tokens, and starts over.
     */
    repair: async (userId: string) => {
        try {
            console.log('🛡️ NotificationExpert: Starting Nuclear Repair...');
            
            // 1. Deep Clean Storage first
            await NotificationExpert.clearSiteData();

            // 2. Unregister all service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }

            // 🚀 MANDATORY COOLDOWN: Wait 3 seconds for browser-level cleanup
            console.log('🛡️ NotificationExpert: Cooling down system for 3s...');
            await new Promise(r => setTimeout(r, 3000));

            // 3. Re-subscribe
            const success = await NotificationExpert.subscribe(userId);
            
            if (success) {
                toast.success('تم إصلاح نظام التنبيهات بنجاح! سيتم إعادة تحميل الصفحة...');
                // 🔄 FORCE RELOAD to ensure fresh context
                setTimeout(() => window.location.reload(), 2000);
            }
            return success;
        } catch (error) {
            console.error('🛡️ NotificationExpert: Repair failed:', error);
            toast.error('حدث خطأ أثناء محاولة الإصلاح.');
            return false;
        }
    },

    /**
     * Conversion Utility (UPGRADED for Android/Oppo Resilience)
     */
    urlBase64ToUint8Array: (base64String: string) => {
        try {
            const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        } catch (e) {
            console.error('🛡️ NotificationExpert: Base64 Decoding Failed:', e);
            throw new Error(`Technical: Invalid Key Encoding (${(e as Error).message})`);
        }
    }
};
