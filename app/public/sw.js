// 🛡️ EXPERT PWA PERSISTENCE: Immediate Activation (V-NUCLEAR-18.0)
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

/**
 * PING SYSTEM: Verification of Life
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PING') {
        event.source.postMessage({ type: 'PONG', version: 'V13.0-Expert', timestamp: Date.now() });
    }
});

self.addEventListener('push', (event) => {
    console.log('🛡️ SW: Incoming Push Event...');
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'تنبيه من الأكاديمية';
    
    // 🛡️ V26 ULTIMATE FORCE: ABSOLUTE ASSETS & MAX PRIORITY
    const baseUrl = self.location.origin;
    const options = {
        body: data.message || 'لديك رسالة جديدة. افتح التطبيق للمتابعة.',
        icon: `${baseUrl}/logo-premium.png`,
        badge: `${baseUrl}/logo-premium.png`,
        image: data.image ? `${baseUrl}${data.image}` : `${baseUrl}/logo-premium.png`,
        data: data.url || '/',
        
        // ⚡ CLASSIC ANDROID VIBRATION (More compatible)
        vibrate: [500, 200, 500, 200, 500],
        
        // 🚀 HEADS-UP PERSISTENCE
        tag: `alert-${Math.random()}`, 
        renotify: true,
        requireInteraction: true, 
        silent: false, 
        sound: `${baseUrl}/ringtone.mp3`, 
        timestamp: Date.now(),
        
        // 📐 EMERGENCY METADATA
        priority: 2, 
        urgency: 'high',
        importance: 'high',
        interaction: true,
        
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
