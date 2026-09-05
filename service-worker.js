// ============================================
// SERVICE WORKER - PAI DE AÇO
// Gerencia notificações em background
// ============================================

const CACHE_NAME = 'pai-de-aco-v1';
const urlsToCache = [
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Ativação
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Interceptar requisições (cache offline)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// ============================================
// RECEBER MENSAGENS DO APP PRINCIPAL
// ============================================
self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'SHOW_NOTIFICATION') {
        showNotification(data.title, data.body, data.tag);
    }

    if (data.type === 'SCHEDULE_NOTIFICATION') {
        scheduleNotification(data.payload);
    }

    if (data.type === 'SHOW_PERSISTENT_NOTIFICATION') {
        showPersistentNotification(data.title, data.body);
    }

    if (data.type === 'CLEAR_PERSISTENT_NOTIFICATION') {
        self.registration.getNotifications({ tag: 'no-smoking-timer' }).then(notifications => {
            notifications.forEach(notification => notification.close());
        });
    }
});

// ============================================
// MOSTRAR NOTIFICAÇÃO SIMPLES (manhã/noite)
// ============================================
function showNotification(title, body, tag) {
    self.registration.showNotification(title, {
        body: body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: tag || 'daily-message',
        vibrate: [200, 100, 200],
        requireInteraction: false
    });
}

// ============================================
// NOTIFICAÇÃO PERSISTENTE (modo No Smoking)
// ============================================
function showPersistentNotification(title, body) {
    self.registration.showNotification(title || '⏱️ Pai de Aço - Não Fumar', {
        body: body || '',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'no-smoking-timer',
        requireInteraction: true,
        silent: true,
        renotify: true
    });
}

// ============================================
// CLIQUE NA NOTIFICAÇÃO
// ============================================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});

// ============================================
// SINCRONIZAÇÃO EM BACKGROUND (verificar horários)
// ============================================
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-daily-messages') {
        event.waitUntil(checkAndSendDailyMessages());
    }
});

async function checkAndSendDailyMessages() {
    // Esta função verifica se é hora de mandar mensagem
    // baseado nos horários configurados pelo usuário
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Buscar dados salvos (via IndexedDB seria ideal, mas localStorage não é acessível aqui)
    // Por isso o app principal precisa registrar o sync periodicamente
    
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
        // Se o app está aberto, pedir pra ele verificar
        clients[0].postMessage({ type: 'CHECK_TIME', time: currentTimeStr });
    }
}
