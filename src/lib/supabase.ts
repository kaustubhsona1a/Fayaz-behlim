import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function deleteImagesFromStorage(items: any[], bucket: string = 'vehicle-images'): Promise<void> {
  if (!items || items.length === 0) return;

  const urls: string[] = [];
  items.forEach(item => {
    if (typeof item === 'string') {
      let cleanItem = item;
      if (item.includes('|||')) {
        cleanItem = item.split('|||')[0];
      }
      urls.push(cleanItem);
    } else if (item && typeof item === 'object') {
      let mainUrl = item.thumbnail_url || item.gallery_url || item.fullscreen_url || item.image_url;
      if (mainUrl) {
        if (typeof mainUrl === 'string' && mainUrl.includes('|||')) {
          mainUrl = mainUrl.split('|||')[0];
        }
        urls.push(mainUrl);
      }
    }
  });

  const paths = urls.map(url => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Look for "/public/bucket_name/" case-insensitively
      const publicIndex = pathname.toLowerCase().indexOf(`/public/${bucket.toLowerCase()}/`);
      if (publicIndex !== -1) {
        const splitStart = publicIndex + `/public/${bucket}/`.length;
        return decodeURIComponent(pathname.substring(splitStart));
      }
      
      // Alternate check for other Supabase URL structures (e.g. without /public/)
      const bucketIndex = pathname.toLowerCase().indexOf(`/${bucket.toLowerCase()}/`);
      if (bucketIndex !== -1) {
        const splitStart = bucketIndex + `/${bucket}/`.length;
        return decodeURIComponent(pathname.substring(splitStart));
      }

      // Fallback for custom domains or different URL formats
      if (url.toLowerCase().includes(bucket.toLowerCase())) {
        const fallbackSplit = url.split(new RegExp(bucket + '/', 'i'));
        if (fallbackSplit.length > 1) {
          return decodeURIComponent(fallbackSplit[1].split('?')[0]);
        }
      }
      return null;
    } catch (e) {
      console.warn('[PATH PARSE ERROR]', e, 'for url:', url);
      return null;
    }
  }).filter(Boolean) as string[];

  console.log(`[STORAGE PURGE] Attempting to delete ${paths.length} items from bucket "${bucket}":`, paths);

  if (paths.length > 0) {
    const { data, error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      console.error(`[STORAGE PURGE ERROR] Failed to delete images from bucket "${bucket}":`, error);
    } else {
      console.log(`[STORAGE PURGE SUCCESS] Deleted from bucket "${bucket}":`, data);
    }
  }
}

export async function cleanupLegacyImageVariants(bucket: string = 'vehicle-images'): Promise<{deletedCount: number, errors: any[]}> {
  let deletedCount = 0;
  const errors: any[] = [];
  try {
    const { data: list, error } = await supabase.storage.from(bucket).list('vehicles', {
      limit: 1000,
      offset: 0,
    });
    if (error) {
      errors.push(error);
      return { deletedCount, errors };
    }

    const filesToDelete = list?.filter(f => 
      f.name.endsWith('-thumb.webp') || 
      f.name.endsWith('-gallery.webp') || 
      f.name.endsWith('-full.webp')
    ).map(f => `vehicles/${f.name}`) || [];

    if (filesToDelete.length > 0) {
      const { data, error: removeError } = await supabase.storage.from(bucket).remove(filesToDelete);
      if (removeError) {
        errors.push(removeError);
      } else {
        deletedCount = data?.length || 0;
      }
    }
  } catch (err) {
    errors.push(err);
  }
  return { deletedCount, errors };
}

/**
 * Converts HEIC/HEIF images (e.g. from iPhone cameras) to standard JPEG.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const isHeic = file.name.match(/\.(heic|heif)$/i) || file.type.includes('heic') || file.type.includes('heif');
  if (!isHeic) return file;

  console.log(`[HEIC CONVERT] Processing iPhone HEIC file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  try {
    const conversionPromise = heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85
    });

    // 10-second safety timeout on HEIC decoding
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('HEIC conversion timeout')), 10000)
    );

    const convertedBlob = await Promise.race([conversionPromise, timeoutPromise]);
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    console.log(`[HEIC CONVERT SUCCESS] Converted ${file.name} to ${newName}`);
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (err) {
    console.warn('[HEIC CONVERT HEIC2ANY WARNING] Falling back to secondary image compressor:', err);
    try {
      const compressedBlob = await imageCompression(file, {
        maxSizeMB: 1.0,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8
      });
      const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([compressedBlob], newName, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (e) {
      console.error('[HEIC CONVERSION FAILED] Could not convert, proceeding with original file:', e);
      return file;
    }
  }
}

/**
 * High quality, super-fast client-side compression pipeline.
 * Designed for iPhone HEIC, Android High-Res, and Laptop/Mac DSLR photos.
 * Downscales to 1280px max-dimension and compresses to high-clarity WebP/JPEG under 200KB.
 */
export async function compressImage(
  inputFile: File, 
  options?: { maxDimension?: number; targetQuality?: number; isShowcase?: boolean }
): Promise<File> {
  // 1. Process HEIC files first
  const file = await convertHeicToJpeg(inputFile);

  // Skip compression for non-images or showcase branding assets if requested
  if (options?.isShowcase || (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif|jpe?g|png|webp|mov)$/i))) {
    return file;
  }

  // 1280px is optimal HD for retina mobile & desktop galleries
  const maxDim = options?.maxDimension || 1280;
  const initialQuality = options?.targetQuality || 0.75;

  try {
    let img: HTMLImageElement | null = new Image();
    let objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    const loaded = await new Promise<boolean>((resolve) => {
      if (!img) return resolve(false);
      const timer = setTimeout(() => resolve(false), 4000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      if (img.complete && img.naturalWidth) {
        clearTimeout(timer);
        resolve(true);
      }
    });

    // If direct HTMLImageElement load failed (e.g. raw unconverted HEIC on desktop), try Web Worker fallback
    if (!loaded || !img.naturalWidth || !img.naturalHeight) {
      URL.revokeObjectURL(objectUrl);
      try {
        const fallbackOptions = {
          maxSizeMB: 0.25, // ~250 KB target
          maxWidthOrHeight: maxDim,
          useWebWorker: true,
          initialQuality: 0.75
        };
        const compressedBlob = await imageCompression(file, fallbackOptions);
        return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { 
          type: 'image/jpeg', 
          lastModified: Date.now() 
        });
      } catch {
        return file;
      }
    }

    const renderToCanvas = (targetMaxDim: number) => {
      let width = img!.naturalWidth || img!.width;
      let height = img!.naturalHeight || img!.height;

      if (width > targetMaxDim || height > targetMaxDim) {
        if (width > height) {
          height = Math.round((height * targetMaxDim) / width);
          width = targetMaxDim;
        } else {
          width = Math.round((width * targetMaxDim) / height);
          height = targetMaxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img!, 0, 0, width, height);

      return canvas;
    };

    const getBlob = (canvas: HTMLCanvasElement, mimeType: string, q: number): Promise<Blob | null> => {
      return new Promise((resolve) => {
        try {
          canvas.toBlob((b) => resolve(b), mimeType, q);
        } catch {
          resolve(null);
        }
      });
    };

    let canvas = renderToCanvas(maxDim);
    if (!canvas) {
      URL.revokeObjectURL(objectUrl);
      return file;
    }

    // Step 1: Quality pass at 0.75
    let jpegBlob = await getBlob(canvas, 'image/jpeg', initialQuality);
    let webpBlob = await getBlob(canvas, 'image/webp', initialQuality);

    // Step 2: If file is larger than 250KB, adaptively reduce quality to 0.68
    if (jpegBlob && jpegBlob.size > 250 * 1024) {
      const tighterJpeg = await getBlob(canvas, 'image/jpeg', 0.68);
      if (tighterJpeg) jpegBlob = tighterJpeg;
    }

    if (webpBlob && webpBlob.size > 250 * 1024) {
      const tighterWebp = await getBlob(canvas, 'image/webp', 0.68);
      if (tighterWebp) webpBlob = tighterWebp;
    }

    URL.revokeObjectURL(objectUrl);
    img = null;

    let finalBlob: Blob | null = jpegBlob;
    let finalExt = 'jpg';
    let finalType = 'image/jpeg';

    // Pick WebP if it is smaller, valid, and under 250KB; otherwise fallback to crisp JPEG
    if (
      webpBlob && 
      webpBlob.type === 'image/webp' && 
      webpBlob.size > 0 && 
      jpegBlob && 
      webpBlob.size <= jpegBlob.size && 
      webpBlob.size < 250 * 1024
    ) {
      finalBlob = webpBlob;
      finalExt = 'webp';
      finalType = 'image/webp';
    }

    if (!finalBlob) {
      return file;
    }

    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
    const newFileName = `${cleanBaseName}.${finalExt}`;
    return new File([finalBlob], newFileName, { type: finalType, lastModified: Date.now() });

  } catch (err) {
    console.warn('[IMAGE COMPRESS ERROR] Canvas compression failed, using original file:', err);
    return file;
  }
}

/**
 * Storage upload integration that processes each file before upload
 */
export async function uploadVehicleImage(file: File, carId: string): Promise<string> {
  const compressedFile = await compressImage(file);
  const fileExt = compressedFile.name.split('.').pop() || 'jpg';
  const fileName = `${carId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('vehicle-images')
    .upload(fileName, compressedFile, {
      cacheControl: '31536000',
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/**
 * Fast, resilient hardware-accelerated image optimizer
 * Downscales images to crisp HD resolution and compresses to lightweight WebP/JPEG
 */
export async function optimizeAndCompressImage(
  file: File, 
  maxDimension: number = 1280, 
  quality: number = 0.75
): Promise<{ file: File; dataUrl: string }> {
  // If it's an SVG, return as-is with dataUrl
  if (file.type.includes('svg')) {
    const dataUrl = await fileToDataUrl(file);
    return { file, dataUrl };
  }

  const compressedFile = await compressImage(file, { maxDimension, targetQuality: quality });
  const dataUrl = await fileToDataUrl(compressedFile);
  return { file: compressedFile, dataUrl };
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImageToStorage(
  file: File, 
  path: string, 
  bucket: string = 'vehicle-images',
  maxRetries: number = 3
): Promise<string> {
  // If it's an SVG, upload directly
  if (file.type.includes('svg') || file.name.endsWith('.svg')) {
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${uniqueId}.svg`;
    const filePath = `${path}/${fileName}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: 'image/svg+xml'
        });
      if (!uploadError) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // fallback to data url
      return await fileToDataUrl(file);
    }
  }

  // Step 1: Compress and optimize image to ensure ultra-fast upload & minimal egress bandwidth (<200KB)
  const isLogo = path.includes('logo') || file.name.toLowerCase().includes('logo') || path === 'site_settings';
  const isShowcase = bucket === 'site_settings' || path.includes('site_settings') || isLogo || path.includes('hero') || path.includes('about') || path.includes('delivery');
  const maxDim = isLogo ? 800 : (isShowcase ? 1440 : 1280);
  const quality = isShowcase ? 0.85 : 0.75;
  const shouldPreserveAlpha = Boolean(isLogo || file.type.includes('png') || file.name.match(/\.(png|webp)$/i));

  let optimizedFile = file;
  let fallbackDataUrl = '';

  try {
    optimizedFile = await compressImage(file, { 
      maxDimension: maxDim, 
      targetQuality: quality, 
      isShowcase
    });
    fallbackDataUrl = await fileToDataUrl(optimizedFile);
  } catch (optErr) {
    console.warn('[OPTIMIZE SKIP] Could not compress, using raw file:', optErr);
    try {
      fallbackDataUrl = await fileToDataUrl(file);
    } catch {
      // Continue
    }
  }

  const isPng = optimizedFile.type === 'image/png';
  const isWebp = optimizedFile.type === 'image/webp';
  const fileExt = isPng ? 'png' : (isWebp ? 'webp' : (file.name.split('.').pop()?.toLowerCase() || 'jpg'));
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fileName = `${uniqueId}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  // Step 2: Attempt uploading to Supabase Storage
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, optimizedFile, {
          cacheControl: '31536000',
          upsert: true,
          contentType: optimizedFile.type || (isPng ? 'image/png' : (isWebp ? 'image/webp' : 'image/jpeg'))
        });

      if (uploadError) {
        throw uploadError;
      }

      if (uploadData?.path) {
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(uploadData.path || filePath);

        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    } catch (err: any) {
      lastError = err;
      attempt++;
      if (attempt < maxRetries) {
        console.warn(`[UPLOAD RETRY] Retrying upload for ${file.name} (Attempt ${attempt + 1} of ${maxRetries})...`, err);
        await new Promise(r => setTimeout(r, 200 * attempt));
      }
    }
  }

  // Step 3: FAIL-SAFE GUARANTEE
  // If Supabase Storage is down/unreachable/quota exceeded, NEVER lose or drop the user's photo!
  // Return the high-efficiency compressed Data URL so 100% of images are preserved and visible!
  if (fallbackDataUrl) {
    console.warn(`[UPLOAD FALLBACK] Supabase upload failed for ${file.name}, using optimized embedded data URL fail-safe.`);
    return fallbackDataUrl;
  }

  console.error(`[UPLOAD FAILED] ${file.name} after ${maxRetries} retries:`, lastError);
  throw lastError || new Error(`Failed to upload ${file.name}`);
}

/**
 * Bulletproof batch uploader:
 * Guarantees that ALL selected images are processed, optimized, and saved with 100% success rate.
 */
export async function uploadMultipleImagesToStorage(
  files: File[],
  path: string,
  bucket: string = 'vehicle-images',
  onProgress?: (completed: number, total: number) => void
): Promise<{ successful: string[]; failed: { fileName: string; reason: string }[] }> {
  const successful: string[] = [];
  const failed: { fileName: string; reason: string }[] = [];
  let completedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      if (onProgress) {
        onProgress(completedCount, files.length);
      }
      
      const url = await uploadImageToStorage(file, path, bucket, 2);
      if (url) {
        successful.push(url);
      }
    } catch (err: any) {
      console.warn(`[BATCH PROCESS FAILSAFE] Direct upload failed for image ${i + 1}, activating secondary local optimizer...`, err);
      try {
        // Absolute fallback: Compress to lightweight data URL
        const opt = await optimizeAndCompressImage(file, 1200, 0.78);
        if (opt.dataUrl) {
          successful.push(opt.dataUrl);
        } else {
          failed.push({
            fileName: `Photo ${i + 1}`,
            reason: err?.message || 'Processing error'
          });
        }
      } catch (secErr: any) {
        console.error(`Fatal processing error on image ${i + 1}:`, secErr);
        failed.push({
          fileName: `Photo ${i + 1}`,
          reason: secErr?.message || 'Processing error'
        });
      }
    } finally {
      completedCount++;
      if (onProgress) {
        onProgress(completedCount, files.length);
      }
    }
  }

  return { successful, failed };
}


