// TOUCH EL ZENOUKI — Service Worker
// غيّر رقم الإصدار ده مع كل تحديث للتطبيق عشان المناديب يظهرلهم شريط "فيه تحديث جديد"
const CACHE_PREFIX = 'touch-orders-v1.3';
const CACHE = CACHE_PREFIX + '1.4.1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.indexOf(CACHE_PREFIX) === 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // السيرفر والخرايط والمكتبات من النت على طول
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isPage) {
    // الصفحة: من النت الأول (عشان التحديثات توصل)، ولو النت فاصل من النسخة المحفوظة
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
