// TOUCH EL ZENOUKI (بيتا) — Service Worker خاص بفولدر beta/ بس
// نفس فكرة النسخة الأساسية: الصفحة من النت الأول، ولو مفيش نت بيفتح آخر نسخة متخزنة.
// وجوده هنا بيخلّي صفحة البيتا ماتتخزنش مكان صفحة النسخة الأساسية.
// بيمسح الكاش القديم بتاع البيتا بس — مابيلمسش كاش النسخة الأساسية.
const CACHE = 'touch-orders-beta-v1.30.0';
const CORE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('touch-orders-beta-') && k !== CACHE).map((k) => caches.delete(k))))
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
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate';
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
