const cacheVersion = 'v0.2'
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
    '/index.html',
    '/Minesweeper/',
    '/Minesweeper/img/apple-touch-icon.png',
    '/Minesweeper/img/icon-192.png',
    '/Minesweeper/img/icon-512.png',
    '/Minesweeper/img/mstile-150.png',
    '/Minesweeper/img/safari-pinned-tab.svg',
    '/Minesweeper/img/browserconfig.xml',
    '/Minesweeper/index.html',
    '/Minesweeper/main.js',
    '/Minesweeper/minesweeper.webmanifest',
    '/Minesweeper/style.css'
]

self.addEventListener('install', e => {
    e.waitUntil((async () => {
        const cache = await caches.open(cacheVersion)
        await cache.addAll(contentToCache)
    })())
})

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(kL => Promise.all(kL.map(k => {
        if (!contentToCache.includes(k)) return caches.delete(k)
    }))))
})

self.addEventListener('fetch', e => {
    e.respondWith((async () => {
        if (ret = await caches.match(e.request)) return ret
        return await fetch(e.request)
    })())
})