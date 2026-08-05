// Minimal service worker for the admin PWA — exists solely to receive Web Push
// notifications (iOS 16.4+ only delivers push to a registered SW inside an
// installed PWA, never to a plain browser tab).

self.addEventListener('push', (event) => {
  let payload = { title: 'Wedding admin', body: '' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon.png',
      data: { url: payload.url || '/admin' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
