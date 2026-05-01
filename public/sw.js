const CACHE_NAME = "lich-am-shell-v15";
const appUrl = (path) => new URL(path, self.registration.scope).toString();
const SHELL_ASSETS = [appUrl("./"), appUrl("manifest.webmanifest"), appUrl("icon.svg")];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function shouldCache(response) {
  return response.ok && (response.type === "basic" || response.type === "cors");
}

async function putCache(request, response) {
  if (!shouldCache(response)) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    await putCache(request, response).catch(() => undefined);
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) {
        return fallback;
      }
    }

    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const scopeUrl = new URL(self.registration.scope);
  const isSameApp = url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname);

  if (event.request.mode === "navigate" || isSameApp) {
    event.respondWith(networkFirst(event.request, event.request.mode === "navigate" ? appUrl("./") : undefined));
  }
});
