// Frame sequence storage and custom frame manager (Desktop & Mobile Support)

const DB_NAME = 'ApexFramesDB';
const DB_VERSION = 2;
const STORE_NAME = 'frames';

export type DeviceTarget = 'desktop' | 'mobile';

export interface FrameSequenceMeta {
  isCustom: boolean;
  totalFrames: number;
  fps?: number;
  name?: string;
  target: DeviceTarget;
  source: 'preset' | 'custom';
}

function getStoreKey(target: DeviceTarget): string {
  return target === 'mobile' ? 'custom_frames_mobile' : 'custom_frames_sequence';
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Helper to test if a given image data URL is solid black or blank
function isImageDataUrlBlack(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof window === 'undefined') {
      resolve(false);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(false);
          return;
        }
        ctx.drawImage(img, 0, 0, 48, 48);
        const imgData = ctx.getImageData(0, 0, 48, 48).data;
        let totalBrightness = 0;
        const totalPixels = 48 * 48;
        for (let i = 0; i < imgData.length; i += 4) {
          totalBrightness += (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
        }
        const avg = totalBrightness / totalPixels;
        resolve(avg < 10); // Average RGB brightness < 10 is solid black
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(true);
    img.src = dataUrl;
  });
}

// Save custom uploaded frame blobs or data URLs for desktop or mobile
export async function saveCustomFrames(images: string[], target: DeviceTarget = 'desktop'): Promise<void> {
  const db = await openDB();
  const key = getStoreKey(target);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: key, urls: images, target, updatedAt: Date.now() });
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('apex_custom_frames_updated', { detail: { target } }));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Load custom frames if any exist for desktop or mobile and automatically purge any leading black frames
export async function loadCustomFrames(target: DeviceTarget = 'desktop'): Promise<string[] | null> {
  try {
    const db = await openDB();
    const key = getStoreKey(target);
    const urls: string[] | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.urls) && req.result.urls.length > 0) {
          resolve(req.result.urls);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });

    if (!urls || urls.length === 0) return null;

    // Detect if first frame is black and find the first visible frame
    let firstValidIndex = 0;
    const maxCheck = Math.min(urls.length, 30);
    for (let i = 0; i < maxCheck; i++) {
      const isBlack = await isImageDataUrlBlack(urls[i]);
      if (!isBlack) {
        firstValidIndex = i;
        break;
      }
    }

    // If leading frames were black, trim them out permanently
    if (firstValidIndex > 0) {
      const sanitized = urls.slice(firstValidIndex);
      if (sanitized.length >= 4) {
        await saveCustomFrames(sanitized, target);
        return sanitized;
      } else {
        await clearCustomFrames(target);
        return null;
      }
    }

    return urls;
  } catch (err) {
    console.warn('Failed to load custom frames from DB:', err);
    return null;
  }
}

// Clear custom frames and revert to default preset
export async function clearCustomFrames(target: DeviceTarget | 'all' = 'all'): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (target === 'all') {
        store.delete('custom_frames_sequence');
        store.delete('custom_frames_mobile');
      } else {
        store.delete(getStoreKey(target));
      }
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('apex_custom_frames_updated', { detail: { target } }));
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

// Get the first frame URL from either custom sequence or default preset sequence
export async function getFirstFrameUrl(target: DeviceTarget = 'desktop'): Promise<string> {
  try {
    const custom = await loadCustomFrames(target);
    if (custom && custom.length > 0 && custom[0]) {
      return custom[0];
    }
  } catch {
    // fallback
  }
  return `/frames/${target}/frame_0001.webp`;
}

// Get the last frame URL from either custom sequence or default preset sequence
export async function getLastFrameUrl(target: DeviceTarget = 'desktop'): Promise<string> {
  try {
    const custom = await loadCustomFrames(target);
    if (custom && custom.length > 0 && custom[custom.length - 1]) {
      return custom[custom.length - 1];
    }
  } catch {
    // fallback
  }
  return `/frames/${target}/frame_0096.webp`;
}


