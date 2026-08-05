// Minimal service worker for the admin PWA — exists solely to receive Web Push
// notifications (iOS 16.4+ only delivers push to a registered SW inside an
// installed PWA, never to a plain browser tab).

// Refreshes the home-screen icon badge from the real unread count (rather than
// incrementing a counter in the service worker, which would drift the moment
// the admin reads something from a different device or the SW restarts).
async function syncBadge() {
  if (!self.navigator || !self.navigator.setAppBadge) return;
  try {
    const res = await fetch('/admin/api/push/unread-count');
    if (!res.ok) return;
    const { count } = await res.json();
    if (count > 0) {
      await self.navigator.setAppBadge(count);
    } else {
      await self.navigator.clearAppBadge();
    }
  } catch {
    // best-effort — a stale badge is better than a crashed push handler
  }
}

self.addEventListener('push', (event) => {
  let payload = { title: 'Wedding admin', body: '' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: '/icon.png',
        data: { url: payload.url || '/admin' },
      }),
      syncBadge(),
    ])
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
