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
    
    // 🛡️ V4 EXPERT: MAXIMUM URGENCY (Oppo/Android Force)
    const options = {
        body: data.message || 'لديك رسالة جديدة. افتح التطبيق للمتابعة.',
        icon: '/logo-premium.png',
        badge: '/logo-premium.png',
        data: data.url || '/',
        
        // ⚡ INTENSE TACTICAL VIBRATION (3 long pulse pattern)
        vibrate: [0, 500, 150, 500, 150, 500],
        
        // 🚀 HEADS-UP FORCE: Dynamic Tagging
        // Using a unique tag for each message FORCES the OS to drop down the banner again.
        tag: `mission-${Date.now()}`, 
        renotify: true,
        requireInteraction: true, 
        silent: false, 
        sound: '/ringtone.mp3', // Absolute path
        timestamp: Date.now(),
        
        // 📐 ANDROID CHANNELS / IMPORTANCE / URGENCY
        priority: 2, 
        urgency: 'high',
        
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
