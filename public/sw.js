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
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
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
