import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxDimension?: number; // Default: 1280px
  targetQuality?: number; // Default: 0.75 (75%)
  maxSizeMB?: number; // Target max size (e.g. 0.25 = 250KB)
  isShowcase?: boolean;
}

/**
 * Universal Image Compressor for iOS, Android, and Desktop photos.
 * Handles HEIC, PNG, JPEG, and WebP, converting to ultra-efficient WebP/JPEG.
 */
export async function compressImage(
  file: File,
  options?: CompressionOptions
): Promise<File> {
  // Skip non-images or SVGs
  if (
    options?.isShowcase ||
    file.type.includes('svg') || 
    (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif|jpe?g|png|webp)$/i))
  ) {
    return file;
  }

  const maxDim = options?.maxDimension || 1280;
  const initialQuality = options?.targetQuality || 0.75;

  // 1. Primary Engine: Worker-based compression (handles EXIF orientation & iOS HEIC)
  try {
    const workerOptions = {
      maxSizeMB: options?.maxSizeMB || 0.25, // ~250 KB
      maxWidthOrHeight: maxDim,
      useWebWorker: true,
      initialQuality: initialQuality,
      fileType: 'image/webp'
    };

    const compressedBlob = await imageCompression(file, workerOptions);
    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
    
    return new File([compressedBlob], `${cleanBaseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now()
    });
  } catch (workerErr) {
    console.warn('[COMPRESS WORKER FALLBACK]', workerErr);
  }

  // 2. Secondary Fallback: HTML5 High-DPI Canvas Rendering
  try {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;

    await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      if (img.complete && img.naturalWidth) resolve(true);
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    // Aspect-ratio bounding box
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const getBlob = (mimeType: string, q: number): Promise<Blob | null> =>
      new Promise((res) => canvas.toBlob((b) => res(b), mimeType, q));

    // Try WebP first; fallback to JPEG
    let blob = await getBlob('image/webp', initialQuality);
    let ext = 'webp';
    let mime = 'image/webp';

    if (!blob || blob.size === 0) {
      blob = await getBlob('image/jpeg', initialQuality);
      ext = 'jpg';
      mime = 'image/jpeg';
    }

    URL.revokeObjectURL(objectUrl);
    if (!blob) return file;

    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
    return new File([blob], `${cleanBaseName}.${ext}`, { type: mime, lastModified: Date.now() });
  } catch (err) {
    console.warn('[CANVAS COMPRESS FAILED]', err);
    return file;
  }
}
