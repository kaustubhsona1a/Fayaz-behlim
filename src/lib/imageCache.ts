/**
 * 4-Tier Client-Side Image Cache & Egress Shield
 * Tier 1 (0ms Instant): In-Memory Map<string, string> containing parsed Object URLs
 * Tier 2 (Dedup): In-Flight Promise Dedup so concurrent renders share 1 network request
 * Tier 3 (Persistent IDB): Browser IndexedDB storing raw compressed binary Blobs
 * Tier 4 (Service/Cache API): Standard caches.open('media-cache-v1')
 */

const DB_NAME = 'media_cache_store';
const STORE_NAME = 'blobs';
const CACHE_STORAGE_NAME = 'media-cache-v1';

const memoryBlobMap = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string>>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

// IndexedDB Initializer
function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE_NAME)) {
            req.result.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

async function getFromIDB(key: string): Promise<Blob | null> {
  try {
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToIDB(key: string, blob: Blob): Promise<void> {
  try {
    const db = await getIDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
  } catch {}
}

export function isCacheableUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:') || url.startsWith('blob:')) return false;
  return url.startsWith('http');
}

export function getInMemoryImageUrl(url?: string): string | null {
  if (!url) return null;
  return memoryBlobMap.get(url) || null;
}

/**
 * Resolves an image URL: checks memory -> IDB -> CacheStorage -> network
 */
export async function getCachedImageUrl(url: string): Promise<string> {
  if (!url || !url.startsWith('http')) return url;

  // Tier 1: In-Memory (0ms)
  if (memoryBlobMap.has(url)) return memoryBlobMap.get(url)!;

  // Tier 2: In-Flight Dedup (Prevents redundant simultaneous fetches)
  if (inFlightRequests.has(url)) return inFlightRequests.get(url)!;

  const fetchPromise = (async () => {
    // Tier 3: Persistent IndexedDB
    try {
      const idbBlob = await getFromIDB(url);
      if (idbBlob && idbBlob.size > 0) {
        const blobUrl = URL.createObjectURL(idbBlob);
        memoryBlobMap.set(url, blobUrl);
        return blobUrl;
      }
    } catch {}

    // Tier 4: CacheStorage API
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_STORAGE_NAME);
        const match = await cache.match(url);
        if (match) {
          const blob = await match.blob();
          saveToIDB(url, blob);
          const blobUrl = URL.createObjectURL(blob);
          memoryBlobMap.set(url, blobUrl);
          return blobUrl;
        }
      } catch {}
    }

    // Network Fetch
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      // Persist in IDB and CacheStorage
      saveToIDB(url, blob);
      if (typeof window !== 'undefined' && 'caches' in window) {
        caches.open(CACHE_STORAGE_NAME).then((c) => c.put(url, new Response(blob))).catch(() => {});
      }

      const blobUrl = URL.createObjectURL(blob);
      memoryBlobMap.set(url, blobUrl);
      return blobUrl;
    } catch {
      return url; // Fallback to direct URL if offline/fetch fails
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, fetchPromise);
  return fetchPromise;
}

/**
 * Pre-caches a list of image URLs in the background without blocking the UI
 */
export function precacheImages(urls: string[]) {
  if (typeof window === 'undefined') return;
  const validUrls = urls.filter(isCacheableUrl);
  if (validUrls.length === 0) return;

  const runner = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1000));
  runner(() => {
    validUrls.slice(0, 8).forEach(url => {
      getCachedImageUrl(url).catch(() => {});
    });
  });
}
