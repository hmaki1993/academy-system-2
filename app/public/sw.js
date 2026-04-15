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
        
        // ⚡ TACTICAL HEAVY VIBRATION (Deep Rhythmic Pattern)
        vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110],
        
        // 🚀 OS INTERRUPT ENFORCEMENT (V2 Expert Strategy)
        tag: data.tag || `elite-mission-${Date.now()}`, // Absolute unique ID forces fresh alert
        renotify: true,
        requireInteraction: true, 
        silent: false, // ENSURE NOT SILENT
        sound: 'default', // 🔔 THE "HEADS-UP" TRIGGER: Some OS only drop-down if sound is present
        timestamp: Date.now(),
        priority: 2, 
        
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
