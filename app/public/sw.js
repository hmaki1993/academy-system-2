self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Elite Academy: Special Mission';
    
    // 🛡️ ELITE HEADS-UP OPTIONS (Enforce Visibility)
    const options = {
        body: data.message || 'Mission objectives updated. Immediate attention required.',
        icon: '/logo-premium.png',
        badge: '/logo-premium.png',
        data: data.url || '/',
        
        // ⚡ TACTICAL HEAVY VIBRATION: (Long-Short-Long-Pulse) - Highly disruptive
        vibrate: [400, 100, 400, 100, 100, 50, 400],
        
        // 🚀 DROP-DOWN ENFORCEMENT: 
        tag: 'elite-mission-critical',
        renotify: true,
        requireInteraction: true, // MUST for drop-down persistence
        silent: false, // Ensure OS plays sound/vibrate
        timestamp: Date.now(),
        
        // 🛠️ ACTIONS: (Forces larger, more interactive notification area)
        actions: [
            { action: 'open', title: 'Open Mission' },
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
