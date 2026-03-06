// VeteranFinder Service Worker - Push Notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'VeteranFinder', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    tag: data.tag || 'veteranfinder',
    data: data.data || {},
    vibrate: [100, 50, 100],
    actions: data.data?.type === 'message' || data.data?.type === 'match'
      ? [{ action: 'open', title: 'Open' }]
      : [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'VeteranFinder', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app/brothers';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
