/**
 * SnapCover Service Worker
 * Handles Web Push notifications and notification click events.
 */

const APP_SHELL_URL = '/app';

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push ─────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'SnapCover', body: event.data?.text() ?? '' };
  }

  const {
    title = 'SnapCover',
    body  = '',
    icon  = '/icon-192.png',
    tag   = 'default',
    data: notifData,
  } = data;

  const options = {
    body,
    icon,
    tag,
    badge: '/icon-192.png',
    renotify: true,
    requireInteraction: tag === 'expired',
    data: notifData,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url ?? APP_SHELL_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.startsWith(APP_SHELL_URL) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
          return;
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    }),
  );
});

// ─── Push Subscription Change ─────────────────────────────────────────────────
// Fired when a subscription is invalidated or replaced.
// The browser re-subscribes automatically with the same key.
// We just need to send the new subscription to the server.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then((subscription) =>
        fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription, action: 'update' }),
        }),
      )
      .catch((err) => console.error('[SW] Subscription update failed:', err)),
  );
});
