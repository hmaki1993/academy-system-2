import { messaging, getToken, onMessage, FCM_VAPID_KEY } from '../lib/firebase';
import { supabase } from '../lib/supabase';

let _foregroundListenerActive = false;
let _registrationInProgress = false;

/**
 * 🔥 FCM Manager - Google Firebase Cloud Messaging
 * النظام الرسمي اللي بتستخدمه كل التطبيقات الكبيرة
 * يضمن Drop-down + Vibration حقيقي من نظام التشغيل
 */
export const FCMManager = {

    /**
     * تسجيل الجهاز وحفظ الـ FCM Token في Supabase
     * آمن من التشغيل المتعدد (idempotent)
     */
    register: async (userId: string): Promise<boolean> => {
        // منع التسجيل المتكرر
        if (_registrationInProgress) return false;
        _registrationInProgress = true;

        try {
            if (!userId) return false;
            console.log('🔥 FCMManager: Starting registration...');

            // 1. Check لو الـ Browser يدعم الـ Push
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn('🔥 FCMManager: Push not supported on this browser');
                return false;
            }

            // 2. طلب Permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('🔥 FCMManager: Permission denied');
                return false;
            }

            // 3. 🧹 NUCLEAR CLEANUP: امسح أي اشتراكات قديمة أو Service Workers متعارضة
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    const sub = await reg.pushManager.getSubscription();
                    if (sub) await sub.unsubscribe();
                    console.log('🔥 FCMManager: Unsubscribed old registration');
                }
            } catch (cleanupErr) {
                console.warn('🔥 FCMManager: Cleanup error (ignored):', cleanupErr);
            }

            // 4. انتظر الـ Service Worker الأساسي وخد الـ Token
            const swRegistration = await navigator.serviceWorker.ready;
            const fcmToken = await getToken(messaging, {
                vapidKey: FCM_VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });

            if (!fcmToken) {
                console.error('🔥 FCMManager: Failed to get token - check VAPID key');
                return false;
            }

            console.log('🔥 FCMManager: Token obtained ✅');

            // 5. احفظ الـ Token في Supabase (Upsert = Update or Insert)
            const { error } = await supabase
                .from('user_fcm_tokens')
                .upsert({
                    user_id: userId,
                    fcm_token: fcmToken,
                    device_info: navigator.userAgent.substring(0, 200),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,fcm_token' });

            if (error) {
                console.error('🔥 FCMManager: DB save error:', error.message);
                return false;
            }

            console.log('🔥 FCMManager: ✅ Device registered for native notifications!');
            return true;

        } catch (err: any) {
            // إذا الخطأ من Firebase نفسه (مش مشكلة), نوضحه بس ما نكرهش التطبيق
            console.warn('🔥 FCMManager: Registration skipped -', err?.message || err);
            return false;
        } finally {
            _registrationInProgress = false;
        }
    },

    /**
     * الاستماع للتنبيهات لما التطبيق مفتوح (Foreground)
     * مضمون مش هيتسجل أكتر من مرة
     */
    listenForeground: (callback: (payload: any) => void) => {
        if (_foregroundListenerActive) return; // منع التكرار
        _foregroundListenerActive = true;

        try {
            onMessage(messaging, (payload) => {
                console.log('🔥 FCMManager: Foreground notification received');
                callback(payload);
            });
        } catch (err) {
            console.warn('🔥 FCMManager: Foreground listener error:', err);
            _foregroundListenerActive = false;
        }
    }
};
