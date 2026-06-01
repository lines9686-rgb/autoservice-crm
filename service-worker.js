/* ====================== Service Worker — Автосервис Lite CRM ======================
   Стратегия: cache-first с дозаписью в кэш при первом онлайн-запросе.
   Кэшируем оболочку приложения и CDN-ресурсы (Bootstrap, иконки, Chart.js, SheetJS),
   чтобы CRM открывалась и работала без интернета.                                    */

const CACHE = 'autoservice-lite-v1';

// то, что кладём в кэш сразу при установке
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Установка: предзагрузка оболочки. Каждый ресурс кэшируем по отдельности,
// чтобы один недоступный CDN не сорвал всю установку.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('SW: не удалось закэшировать', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

// Активация: чистим старые версии кэша.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Запросы: сначала кэш, иначе сеть (и кладём ответ в кэш на будущее).
// Офлайн и нет в кэше → для навигации отдаём index.html.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // кэшируем удачные ответы (в т.ч. CORS-ресурсы CDN и opaque-ответы)
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() =>
        req.mode === 'navigate' ? caches.match('./index.html') : Response.error()
      );
    })
  );
});
