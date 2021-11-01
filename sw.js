const cacheData = {
    v1: [
        // Main
        '/',
        '/css/style.css',
        '/img/administrator.svg',
        '/img/download.svg',
        '/img/Ghost Logo.svg',
        '/img/goal.svg',
        '/img/home.svg',
        '/img/idea.svg',
        '/img/links.svg',
        '/img/menu.svg',
        '/img/moderator.svg',
        '/img/mstile-150.png',
        '/img/premium.svg',
        '/img/profile.svg',
        '/img/sprite.svg',
        '/img/wip.svg',
        '/js/main.js',
        '/browserconfig.xml',
        '/favicon.ico',
        '/index.html',
        // Minesweeper
        '/minesweeper/',
        '/minesweeper/img/apple-touch-icon.png',
        '/minesweeper/img/icon-192.png',
        '/minesweeper/img/icon-512.png',
        '/minesweeper/img/safari-pinned-tab.svg',
        '/minesweeper/index.html',
        '/minesweeper/main.js',
        '/minesweeper/minesweeper.webmanifest',
        '/minesweeper/style.css',
        // Bookreader
        '/bookreader/',
        '/bookreader/custom-icons.woff',
        '/bookreader/index.html',
        '/bookreader/main.js',
        '/bookreader/style.css',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Philosopher:ital,wght@0,400;0,700;1,400;1,700&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap'
    ]
}
const cacheKeys = Object.keys(cacheData)
const curVer = cacheKeys.find(v => /^v\d+?$/.test(v))

self.addEventListener('install', e => {
    e.waitUntil(new Promise(async res => {
        let lastVer = (await caches.keys()).find(v => /^v\d+?$/.test(v))
        lastVer = (lastVer ? +lastVer : 0)
        if (lastVer < curVer) {
            const cache = await caches.open(lastVer)
            const newCache = await caches.open(curVer)
            const promises = []
            for (const key of await cache.keys()) {
                if (cacheKeys.filter(v => v <= lastVer).find(v => (key in cacheData(v)))) {
                    promises.push(newCache.put(key, await cache.match(key)))
                }
            }
            for (const cacheKey of cacheKeys.filter(v => v > lastVer)) {
                promises.push(newCache.addAll(cacheData(cacheKey)))
            }
            await Promise.all(promises)
        }
        res()
    }))
})

self.addEventListener('activate', e => {
    e.waitUntil(new Promise(async res => {
        const promises = []

        for (const name of (await caches.keys()).filter(v => /^v\d+?$/.test(v) && v != curVer)) {
            promises.push(caches.delete(name))
        }
        promises.push(caches.delete('main'))
        promises.push(caches.delete('minesweeper'))

        Promise.all(promises).then(() => res())
    }))
})

self.addEventListener('fetch', e => {
    e.respondWith((async () => {
        try {
            const cache = await caches.match(e.request)
            if (cache) return cache
            return await fetch(e.request)
        } catch (err) {
            console.error(err)
        }
        return new Response(null, { status: 400 })
    })())
})