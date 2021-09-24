const cacheData = {
    main: [
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
    ],
    minesweeper: [
        '/Minesweeper/',
        '/Minesweeper/img/apple-touch-icon.png',
        '/Minesweeper/img/icon-192.png',
        '/Minesweeper/img/icon-512.png',
        '/Minesweeper/img/mstile-150.png',
        '/Minesweeper/img/safari-pinned-tab.svg',
        '/Minesweeper/browserconfig.xml',
        '/Minesweeper/index.html',
        '/Minesweeper/main.js',
        '/Minesweeper/minesweeper.webmanifest',
        '/Minesweeper/style.css'
    ]
}

self.addEventListener('install', e => {
    e.waitUntil(Promise.all(Object.keys(cacheData).map(name => 
        caches.open(name).then(cache => 
            cache.addAll(cacheData[name])
        )
    )))
})

self.addEventListener('activate', e => e.waitUntil(caches.keys().then(names => 
    Promise.all(names.map(name => {
        if (!Object.keys(cacheData).includes(name)) return caches.delete(name)
    }))
)))

self.addEventListener('fetch', e => {
    e.respondWith((async () => {
        if (ret = await caches.match(e.request)) return ret
        return await fetch(e.request)
    })())
})