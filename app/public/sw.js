self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Elite Alpha: Mission Alert';
    
    // 🛡️ PRO NOTIFICATION OPTIONS (Tactical Level)
    const options = {
        body: data.message || 'New mission target received from Bridge.',
        icon: '/logo-premium.png',
        badge: '/logo-premium.png',
        data: data.url || '/',
        
        // ⚡ TACTICAL VIBRATION: (Pulse, Pulse, Long) - Rhythmic and noticeable
        vibrate: [100, 50, 100, 50, 400],
        
        // 🚀 FORCE HEADS-UP: Unique tag and renotify forces drop-down behavior
        tag: 'elite-tactical-signal',
        renotify: true,
        
        // 🛠️ ACTIONS: Makes the alert interactive/priority
        actions: [
            { action: 'open', title: 'Launch Mission' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
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
