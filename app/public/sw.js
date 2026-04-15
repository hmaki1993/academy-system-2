// 🛡️ EXPERT PWA PERSISTENCE: Immediate Activation
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Elite Academy: Official Command';
    
    // 🛡️ EXPERT HEADS-UP (Max Urgency Implementation)
    const options = {
        body: data.message || 'New mission signal received. Tap to execute.',
        icon: '/logo-premium.png',
        badge: '/logo-premium.png',
        data: data.url || '/',
        
        // ⚡ TACTICAL HEAVY VIBRATION (Rhythmic & Intense)
        vibrate: [400, 100, 400, 100, 100, 50, 400],
        
        // 🚀 OS INTERRUPT ENFORCEMENT (Expert Dynamic Strategy)
        tag: data.tag || `alert-${Date.now()}`, // Unique tag forces fresh OS heads-up
        renotify: true,
        requireInteraction: true, 
        silent: false, 
        timestamp: Date.now(),
        priority: 2, // Max OS priority hint
        
        // 🛠️ INTERACTIVE ACTIONS
        actions: [
            { action: 'open', title: 'Open Mission' },
            { action: 'close', title: 'Dismiss' }
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
