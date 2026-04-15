// 🛡️ EXPERT PWA PERSISTENCE: Immediate Activation
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'تنبيه من الأكاديمية';
    
    // 🛡️ OPPO/ANDROID OPTIMIZED NOTIFICATION
    const options = {
        body: data.message || 'لديك رسالة جديدة. افتح التطبيق للمتابعة.',
        icon: '/logo-premium.png',
        badge: '/logo-premium.png',
        data: data.url || '/',
        
        // ⚡ SIMPLIFIED VIBRATION (More compatible with Oppo/ColorOS)
        vibrate: [0, 500, 200, 500],
        
        // 🚀 HIGH VISIBILITY SETTINGS
        tag: 'academy-alert', // Constant tag ensures it overwrites and stays visible
        renotify: true,
        requireInteraction: true, 
        silent: false, 
        sound: '/ringtone.mp3', // Ensure absolute path starting with /
        timestamp: Date.now(),
        
        // Android specific priority/importance
        priority: 2, 
        
        // 🛠️ ACTIONS
        actions: [
            { action: 'open', title: 'فتح الآن' },
            { action: 'close', title: 'إغلاق' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Attempt to focus or open the app window
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow(event.notification.data || '/');
        })
    );
});
