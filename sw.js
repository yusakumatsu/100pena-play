/* 100ペナ Service Worker(PWA): iPhone/Android のホーム画面に追加した時にオフラインでも起動できるようにする。
   方針: 本体(index.html)はネット優先(更新をすぐ反映)、落ちたらキャッシュ。書体・アイコンはキャッシュ優先。
   0.10.769-mwriycrr は配信時(deploy_netlify.js)に版で置き換わり、版が変わると古いキャッシュを捨てる。 */
const VER = '0.10.769-mwriycrr';
const CACHE = '100pena-' + VER;
const PRECACHE = [
  './', './index.html', './manifest.webmanifest',
  './fonts/fonts.css', './fonts/DotGothic16-Regular.ttf', './fonts/ZenKakuGothicNew-Regular.ttf', './fonts/ZenKakuGothicNew-Medium.ttf', './fonts/ZenKakuGothicNew-Bold.ttf',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
PRECACHE.push('./swingmaker/index.html'); /*SMLIVE*/ /* Swing Maker の試合の画面もオフラインで (英語版 /en/ も同じ所を読む) */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const u of PRECACHE) { try { await c.add(new Request(u, { cache: 'reload' })); } catch (err) { } }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.indexOf('100pena-') === 0 && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = (req.mode === 'navigate') || /\.html$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isPage) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        try { const c = await caches.open(CACHE); c.put(req, res.clone()); } catch (err) { }
        return res;
      } catch (err) {
        const c = await caches.open(CACHE);
        return (await c.match(req)) || (await c.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    if (hit) return hit;
    try { const res = await fetch(req); if (res && res.ok) c.put(req, res.clone()); return res; }
    catch (err) { return Response.error(); }
  })());
});
