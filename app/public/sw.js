// 🛡️ EXPERT PWA PERSISTENCE: Immediate Activation
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'إشعار من الأكاديمية'; // Default Arabic title
    
    // 🛡️ EXPERT HEADS-UP (Max Urgency Implementation)
    const options = {
        body: data.message || 'رسالة جديدة من المدرب. اضغط للمتابعة.',
        icon: '/logo-premium.png',
        badge: '/logo-premium.png',
        data: data.url || '/',
        
        // ⚡ TACTICAL HEAVY VIBRATION (Intense Pattern for Alerts)
        vibrate: [200, 100, 200, 100, 200, 100, 400],
        
        // 🚀 OS INTERRUPT ENFORCEMENT (V3 Expert Strategy)
        tag: data.tag || `elite-alert-${Date.now()}`, 
        renotify: true,
        requireInteraction: true, 
        silent: false, 
        sound: '/ringtone.mp3', // 🔔 High-priority sound trigger
        timestamp: Date.now(),
        
        // Android specific priority
        priority: 2, 
        
        // 🛠️ INTERACTIVE ACTIONS
        actions: [
            { action: 'open', title: 'فتح التطبيق' },
            { action: 'close', title: 'تجاهل' }
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
