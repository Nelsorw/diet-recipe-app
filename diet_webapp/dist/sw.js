self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'NutriGuide'
  const body  = data.body  || 'You have a new notification.'

  event.waitUntil(
    self.registration.showNotification(title, {
      body   : body,
      icon   : '/favicon.ico',
      badge  : '/favicon.ico',
      vibrate: [200, 100, 200],
      tag    : 'nutriguide-notification',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/')
  )
})