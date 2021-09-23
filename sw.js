const cacheVersion = 'v0.1'
const contentToCache = [
    '/',
    '/css/style.css',
    '/img/download.svg',
    '/img/goal.svg',
    '/img/home.svg',
    '/img/idea.svg',
    '/img/links.svg',
    '/img/menu.svg',
    '/img/profile.svg',
    '/img/sprite.svg',
    '/img/wip.svg',
    '/js/main.js',
    '/favicon.ico',
    '/index.html'
]

self.addEventListener('install', e => {
    e.waitUntil((async () => {
        const cache = await caches.open(cacheVersion)
        await cache.addAll(contentToCache)
    })())
})

self.addEventListener('fetch', e => {
    e.respondWith((async () => {
        if (ret = await caches.match(e.request)) return ret
        const res = await fetch(e.request)
        const cache = await caches.open(cacheVersion)
        cache.put(e.request, res.clone())
        return res
    })())
})