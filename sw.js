const delayTime = 20000

String.prototype.ver = function () {
	return +this.substr(1)
}

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
		'/minesweeper/style.css',
		// Bookreader
		'/bookreader/custom-icons.woff',
		'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Philosopher:ital,wght@0,400;0,700;1,400;1,700&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap',
	],
	v2: [
		'/minesweeper/minesweeper.webmanifest',
		'/bookreader/',
		'/bookreader/title.js',
	],
	v5: ['/bookreader/catalog.js', '/bookreader/index.html'],
	v8: ['/bookreader/book.js'],
	v10: ['/bookreader/main.js'],
	v11: ['/bookreader/style.css'],
}
const domain = 'https://urepo.online'
const cacheKeys = Object.keys(cacheData).sort((v1, v2) => v1.ver() > v2.ver())
const curVer = cacheKeys[cacheKeys.length - 1] ?? 'v0'

const urlsToStore = [
	'https://fonts.gstatic.com/',
	'https://server.urepo.com.ua:8443/books/image/',
]

const needToStore = (url) => urlsToStore.find((v) => url.startsWith(v))

self.addEventListener('install', (e) => {
	e.waitUntil(
		(async () => {
			console.log('Installation started')
			let lastVer = (await caches.keys()).reduce(
				(t, v) => (/v\d+?/.test(v) && v.ver() > t.ver() ? v : t),
				'v0'
			)
			if (lastVer.ver() < curVer.ver()) {
				const oldCache = await caches.open(lastVer)
				const newCache = await caches.open(curVer)
				let promises = []
				const controller = new AbortController()
				for (const key of cacheKeys) {
					console.log('key', key, key != curVer)
					if (key != curVer) {
						for (const url of cacheData[key]) {
							console.log('url', url)
							const cache = await oldCache.match(url)
							if (cache) {
								console.log('put')
								promises.push(newCache.put(url, cache))
							} else {
								console.log('add')
								promises.push(
									(async () => {
										try {
											const res = await fetch(url, {
												signal: controller.signal,
											})
											if (res.ok)
												await newCache.put(url, res)
										} catch (err) {}
									})()
								)
							}
						}
					} else {
						for (const url of cacheData[key]) {
							console.log('url', url)
							console.log('add')
							promises.push(
								(async () => {
									try {
										const res = await fetch(url, {
											signal: controller.signal,
										})
										if (res.ok) await newCache.put(url, res)
									} catch (err) {}
								})()
							)
						}
					}
				}
				const timerId = setTimeout(controller.abort, delayTime)
				await Promise.all(promises)
				clearTimeout(timerId)

				promises = []
				for (const key of await oldCache.keys()) {
					if (needToStore(key.url)) {
						promises.push(
							newCache.put(key.url, await oldCache.match(key))
						)
						console.log('url', key.url)
						console.log('put')
					}
				}
				await Promise.all(promises)
			}
			console.log('Installation finished')
		})()
	)
})

self.addEventListener('activate', (e) => {
	e.waitUntil(
		(async () => {
			const promises = []

			for (const key of await caches.keys()) {
				if (key != curVer) promises.push(caches.delete(key))
			}

			await Promise.all(promises)
		})()
	)
})

self.addEventListener('fetch', async (e) => {
	if (e.request.method.toUpperCase() != 'GET') return

	e.respondWith(
		(async () => {
			console.log('fetching', e.request)
			let ret
			const controller = new AbortController()
			const timerId = setTimeout(() => controller.abort(), delayTime)

			try {
				let url = e.request.url
				if (e.request.url.startsWith(domain + '/bookreader/?'))
					url = domain + '/bookreader/'
				const cache = await caches.match(url)
				if (cache) ret = cache
				else if (needToStore(url)) {
					const newCache = await caches.open(curVer)
					const req = new Request(url, {
						mode:
							e.request.mode == 'navigate'
								? 'cors'
								: e.request.mode,
						credentials: e.request.credentials,
						headers: e.request.headers,
						signal: controller.signal,
					})
					console.log('req', req)
					const res = await fetch(req)
					console.log('data', res)
					if (!res.ok) throw new Error('Network response was not OK')
					newCache.put(url, res.clone())
					ret = res
				} else {
					ret = await fetch(url, {
						mode:
							e.request.mode == 'navigate'
								? 'cors'
								: e.request.mode,
						credentials: e.request.credentials,
						headers: e.request.headers,
						signal: controller.signal,
					})
				}
			} catch (err) {
				console.warn(err)
			}

			clearTimeout(timerId)
			if (!ret)
				ret = new Response(null, {
					status: 400,
					statusText: 'No response',
				})
			console.log('response', ret)
			return ret
		})()
	)
})
