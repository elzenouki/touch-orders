// TOUCH EL ZENOUKI — Service Worker
// الصفحة بتتجاب من النت الأول دايمًا (عشان أي تحديث يوصل للمناديب على طول)،
// ولو مفيش نت بيفتح آخر نسخة متخزنة — فالتطبيق يفضل يفتح من غير نت.
// طلبات السيرفر (Google Apps Script) والخطوط والمكتبات مش بيلمسها خالص.
const CACHE = 'touch-orders-v1.7.1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // كل ملف لوحده — لو ملف مش موجود مايوقفش التثبيت
      Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// زرار "تحديث الآن" في التطبيق بيبعت الرسالة دي
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate';
  // الصفحة: من النت من غير أي كاش للمتصفح • باقي الملفات (أيقونات/manifest): عادي
  const net = isPage ? fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }) : fetch(req);

  e.respondWith(
    net.then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(isPage ? './index.html' : req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(isPage ? './index.html' : req).then((r) => r || caches.match('./') || Response.error())
    )
  );
});
