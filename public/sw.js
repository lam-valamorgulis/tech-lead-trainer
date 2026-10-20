// The service worker: it only shows reminders. It caches nothing, so the app never goes stale.
// The server sends { title, body, url }. The url is a route name, never a user id (design 12.7).

self.addEventListener("push", (event) => {
  let message = { title: "Tech Lead Trainer", body: "Your daily practice is ready.", url: "/" };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // An empty or broken push still shows the plain reminder.
  }
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/icons/icon-192.png",
      // One reminder at a time on the lock screen.
      tag: "reminder",
      data: { url: message.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = appUrl(event.notification.data?.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!open) return self.clients.openWindow(target);
      // navigate() fails for a window this worker does not control, so open the link instead.
      return open
        .focus()
        .then((client) => client.navigate(target))
        .catch(() => self.clients.openWindow(target));
    }),
  );
});

/** A link inside this app only: a reminder can never open another site. */
function appUrl(path) {
  try {
    const url = new URL(typeof path === "string" ? path : "/", self.location.origin);
    if (url.origin === self.location.origin) return url.href;
  } catch {
    // Fall through to the home screen.
  }
  return new URL("/", self.location.origin).href;
}
