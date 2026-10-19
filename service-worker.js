const CACHE_NAME = 'istrong-v1';
const urlsToCache = [
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './splash.mp4'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(cacheNames.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});

self.addEventListener('message', (event) => {
    const data = event.data;
    if (data.type === 'SHOW_PERSISTENT_NOTIFICATION') {
        showPersistentNotification(data.title, data.body);
    }
    if (data.type === 'CLEAR_PERSISTENT_NOTIFICATION') {
        self.registration.getNotifications({ tag: 'no-smoking-timer' })
            .then(notifs => notifs.forEach(n => n.close()));
    }
});

function showPersistentNotification(title, body) {
    self.registration.showNotification(title || '⏱️ iStrong - Não Fumar', {
        body: body || '',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'no-smoking-timer',
        requireInteraction: false,
        silent: true,
        renotify: true,
        actions: [
            { action: 'log_cigarette', title: '🚬 Registrar Cigarro' },
            { action: 'help', title: '🆘 Ajuda' }
        ]
    });
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const wantsHelp = event.action === 'help';
    const wantsLogCigarette = event.action === 'log_cigarette';

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    if (wantsHelp) client.postMessage({ type: 'OPEN_HELP_REQUEST' });
                    if (wantsLogCigarette) client.postMessage({ type: 'LOG_CIGARETTE_REQUEST' });
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                let url = './index.html';
                if (wantsHelp) url = './index.html?help=1';
                if (wantsLogCigarette) url = './index.html?logcig=1';
                return clients.openWindow(url);
            }
        })
    );
});
