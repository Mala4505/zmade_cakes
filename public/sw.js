// Service worker: push notification handling only.
// No offline caching / precaching — intentionally out of scope.

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const { title, body, url, notificationId } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: notificationId,
      data: { url },
      // Glyph-only mark, not the full text wordmark — notification icons render too small
      // (~24-48px) for the "ZMade / Made with Love!" text to stay legible.
      icon: '/favicon.png',
      badge: '/favicon.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data && event.notification.data.url;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const targetClient =
          clientList.find((client) => client.url === url) ||
          clientList.find((client) => new URL(client.url).origin === self.location.origin);

        if (targetClient) {
          if ('focus' in targetClient) {
            targetClient.focus();
          }
          if (url && 'navigate' in targetClient) {
            targetClient.navigate(url);
          }
          return;
        }

        if (url) {
          return clients.openWindow(url);
        }
      })
  );
});
