self.addEventListener("push", (event) => {
  let payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {};
    }
  }

  const notification = payload.notification || {};
  const title = notification.title || "QueueFlow";
  const options = {
    body: notification.body || "",
    data: {
      url: notification.url || "/",
    },
    tag: payload.event || "queueflow",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url === url);
      if (existingClient) {
        return existingClient.focus();
      }

      return self.clients.openWindow(url);
    }),
  );
});
