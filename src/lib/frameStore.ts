// Frame sequence storage and custom frame manager

const DB_NAME = 'ApexFramesDB';
const DB_VERSION = 1;
const STORE_NAME = 'frames';

export interface FrameSequenceMeta {
  isCustom: boolean;
  totalFrames: number;
  fps?: number;
  name?: string;
  source: 'preset' | 'custom';
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

// Save custom uploaded frame blobs or data URLs
export async function saveCustomFrames(images: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: 'custom_frames_sequence', urls: images, updatedAt: Date.now() });
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('apex_custom_frames_updated'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Load custom frames if any exist and automatically purge any leading black frames
export async function loadCustomFrames(): Promise<string[] | null> {
  try {
    const db = await openDB();
    const urls: string[] | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('custom_frames_sequence');
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
        await saveCustomFrames(sanitized);
        return sanitized;
      } else {
        await clearCustomFrames();
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
export async function clearCustomFrames(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete('custom_frames_sequence');
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('apex_custom_frames_updated'));
        resolve();
      };
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

// Get the first frame URL from either custom sequence or default preset sequence
export async function getFirstFrameUrl(): Promise<string> {
  try {
    const custom = await loadCustomFrames();
    if (custom && custom.length > 0 && custom[0]) {
      return custom[0];
    }
  } catch {
    // fallback
  }
  return '/frames/frame_0001.webp';
}

// Get the last frame URL from either custom sequence or default preset sequence
export async function getLastFrameUrl(): Promise<string> {
  try {
    const custom = await loadCustomFrames();
    if (custom && custom.length > 0 && custom[custom.length - 1]) {
      return custom[custom.length - 1];
    }
  } catch {
    // fallback
  }
  return '/frames/frame_0060.webp';
}

