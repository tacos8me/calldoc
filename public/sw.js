// ---------------------------------------------------------------------------
// CallDoc Service Worker -- Connection resilience and asset caching
//
// This is a lightweight service worker for network awareness, NOT a full PWA.
// It caches the app shell for fast reloads and provides offline detection.
//
// Strategies:
// - App shell (HTML, CSS, JS): Cache-first with network update
// - API calls: Network-first with queue for failed mutations
// - Static assets: Cache-first (long-lived)
// ---------------------------------------------------------------------------

const CACHE_NAME = 'calldoc-v1';
const API_CACHE_NAME = 'calldoc-api-v1';
const MUTATION_QUEUE_NAME = 'calldoc-mutation-queue';

// App shell files to cache on install
const APP_SHELL_FILES = [
  '/',
  '/calls',
  '/agent-timeline',
  '/recordings',
  '/reports',
];

// ---------------------------------------------------------------------------
// Install: Pre-cache app shell
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Don't fail install if some URLs fail to cache
        return Promise.allSettled(
          APP_SHELL_FILES.map((url) =>
            cache.add(url).catch(() => {
              // Silently skip files that fail to cache during install
            })
          )
        );
      })
      .then(() => {
        // Activate immediately without waiting for old SW to die
        return self.skipWaiting();
      })
  );
});

// ---------------------------------------------------------------------------
// Activate: Clean up old caches
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE_NAME &&
                key !== API_CACHE_NAME &&
                key !== MUTATION_QUEUE_NAME
            )
            .map((key) => caches.delete(key))
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// ---------------------------------------------------------------------------
// Fetch: Route-based caching strategies
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests for caching (but handle mutation queueing)
  if (event.request.method !== 'GET') {
    event.respondWith(handleMutation(event.request));
    return;
  }

  // API calls: Network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // Static assets (_next/static): Cache-first (immutable hashed files)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // Next.js data fetches: Network-first
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // HTML pages: Network-first with cache fallback (stale-while-revalidate)
  if (
    event.request.headers.get('accept')?.includes('text/html') ||
    APP_SHELL_FILES.includes(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidateStrategy(event.request));
    return;
  }

  // Everything else: Cache-first with network fallback
  event.respondWith(cacheFirstStrategy(event.request));
});

// ---------------------------------------------------------------------------
// Cache-first strategy (static assets)
// Performance: eliminates network latency for cached assets
// ---------------------------------------------------------------------------

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a basic offline response
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ---------------------------------------------------------------------------
// Network-first strategy (API calls)
// Performance: always gets fresh data, falls back to cache when offline
// ---------------------------------------------------------------------------

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Stale-while-revalidate strategy (HTML pages)
// Performance: instant page loads with background updates
// ---------------------------------------------------------------------------

async function staleWhileRevalidateStrategy(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available, otherwise wait for network
  if (cached) {
    // Fire and forget the network update
    fetchPromise.catch(() => {});
    return cached;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;

  return new Response('Offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ---------------------------------------------------------------------------
// Mutation queueing (POST/PUT/DELETE/PATCH)
// Queues failed mutations in IndexedDB for retry when back online
// ---------------------------------------------------------------------------

async function handleMutation(request) {
  try {
    return await fetch(request);
  } catch {
    // Queue the mutation for retry when online
    try {
      await queueMutation(request);
    } catch {
      // Queue failed, nothing more we can do
    }

    return new Response(
      JSON.stringify({
        error: 'Mutation queued for retry',
        queued: true,
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// IndexedDB helpers for mutation queue
// ---------------------------------------------------------------------------

function openMutationDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('calldoc-sw', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('mutations')) {
        db.createObjectStore('mutations', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueMutation(request) {
  const db = await openMutationDB();
  const body = await request.text();

  return new Promise((resolve, reject) => {
    const tx = db.transaction('mutations', 'readwrite');
    const store = tx.objectStore('mutations');
    store.add({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function retryQueuedMutations() {
  let db;
  try {
    db = await openMutationDB();
  } catch {
    return;
  }

  return new Promise((resolve) => {
    const tx = db.transaction('mutations', 'readwrite');
    const store = tx.objectStore('mutations');
    const req = store.getAll();

    req.onsuccess = async () => {
      const mutations = req.result || [];
      const retried = [];

      for (const mutation of mutations) {
        try {
          await fetch(mutation.url, {
            method: mutation.method,
            headers: mutation.headers,
            body: mutation.body || undefined,
          });
          retried.push(mutation.id);
        } catch {
          // Still offline for this mutation, leave in queue
        }
      }

      // Remove successfully retried mutations
      if (retried.length > 0) {
        const delTx = db.transaction('mutations', 'readwrite');
        const delStore = delTx.objectStore('mutations');
        for (const id of retried) {
          delStore.delete(id);
        }

        // Notify clients about retried mutations
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: 'MUTATIONS_RETRIED',
            count: retried.length,
          });
        }
      }

      resolve();
    };
  });
}

// ---------------------------------------------------------------------------
// Message handler (communication with the main app)
// ---------------------------------------------------------------------------

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'RETRY_MUTATIONS') {
    retryQueuedMutations();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
    caches.delete(API_CACHE_NAME);
  }
});

// ---------------------------------------------------------------------------
// Online detection: Retry queued mutations when connectivity returns
// ---------------------------------------------------------------------------

self.addEventListener('online', () => {
  retryQueuedMutations();
});
