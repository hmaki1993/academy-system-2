import { messaging, getToken, onMessage, FCM_VAPID_KEY } from '../lib/firebase';
import { supabase } from '../lib/supabase';

/**
 * 🔥 FCM Manager - Google Firebase Cloud Messaging
 * هذا هو النظام الرسمي اللي بتستخدمه WhatsApp وكل التطبيقات الكبيرة
 * يضمن Drop-down + Vibration حقيقي من نظام التشغيل
 */
export const FCMManager = {

    /**
     * تسجيل الجهاز وحفظ الـ FCM Token في Supabase
     */
    register: async (userId: string): Promise<boolean> => {
        try {
            console.log('🔥 FCMManager: Starting registration...');

            // 1. طلب Permission من المستخدم
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('🔥 FCMManager: Permission denied');
                return false;
            }

            // 2. انتظر الـ Service Worker
            await navigator.serviceWorker.ready;

            // 3. احصل على الـ FCM Token (المفتاح السري للجهاز)
            const fcmToken = await getToken(messaging, {
                vapidKey: FCM_VAPID_KEY,
                serviceWorkerRegistration: await navigator.serviceWorker.ready
            });

            if (!fcmToken) {
                console.error('🔥 FCMManager: Failed to get token');
                return false;
            }

            console.log('🔥 FCMManager: Token obtained:', fcmToken.substring(0, 20) + '...');

            // 4. احفظ الـ Token في Supabase
            const { error } = await supabase
                .from('user_fcm_tokens')
                .upsert({
                    user_id: userId,
                    fcm_token: fcmToken,
                    device_info: navigator.userAgent.substring(0, 100),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,fcm_token'
                });

            if (error) {
                console.error('🔥 FCMManager: DB save failed:', error);
                return false;
            }

            console.log('🔥 FCMManager: ✅ Registration complete!');
            return true;

        } catch (err) {
            console.error('🔥 FCMManager: Registration error:', err);
            return false;
        }
    },

    /**
     * الاستماع للتنبيهات لما التطبيق مفتوح (Foreground)
     * ملاحظة: لما التطبيق مغلق، الـ Service Worker يتولى الأمر تلقائياً
     */
    listenForeground: (callback: (payload: any) => void) => {
        try {
            onMessage(messaging, (payload) => {
                console.log('🔥 FCMManager: Foreground message received:', payload);
                callback(payload);
            });
        } catch (err) {
            console.warn('🔥 FCMManager: Foreground listener error:', err);
        }
    }
};
