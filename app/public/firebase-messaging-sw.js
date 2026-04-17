// 🔥 Firebase Cloud Messaging Service Worker - V1
// هذا الملف مطلوب من Firebase عشان يستقبل التنبيهات في الـ Background

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ✅ Firebase Config
firebase.initializeApp({
  apiKey: "AIzaSyAI0B5eqfwRzQWG24gEs1tOw0RTdPt30Ss",
  authDomain: "skippy-toes-q8.firebaseapp.com",
  projectId: "skippy-toes-q8",
  storageBucket: "skippy-toes-q8.firebasestorage.app",
  messagingSenderId: "872245266489",
  appId: "1:872245266489:web:e64ff4b09d1c13adf4e5e8"
});

const messaging = firebase.messaging();

// ✅ استقبال التنبيهات في الـ Background (لما التطبيق مقفول)
// Firebase لو مفيش فيه 'notification' هينادي الدالة دي (Data-Only Message)
messaging.onBackgroundMessage((payload) => {
  console.log('🔥 Firebase SW: Background message received:', payload);

  // استخراج الداتا (سواء كانت مبعوتة في notification أو data)
  const title = payload.notification?.title || payload.data?.title || 'تنبيه جديد';
  const body = payload.notification?.body || payload.data?.message || payload.data?.body || 'لديك رسالة جديدة';
  
  const notificationOptions = {
    body: body,
    icon: '/logo-premium.png',
    badge: '/logo-premium.png',
    // 📳 الهز الإجباري (بيصحي الموبايل)
    vibrate: [500, 250, 500, 250, 500],
    // 🏷️ الـ Tag لازم يكون ثابت عشان renotify تشتغل وميضربش Crash
    tag: 'elite-urgent-alert',
    renotify: true,
    requireInteraction: true,
    data: { url: payload.data?.url || '/app' },
    actions: [
      { action: 'open', title: 'دخول' },
      { action: 'close', title: 'تجاهل' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
});

// ✅ فتح التطبيق لما المستخدم يضغط على التنبيه
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
