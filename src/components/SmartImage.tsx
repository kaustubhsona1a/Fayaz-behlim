import React, { useState, useEffect, useRef } from 'react';
import { getInMemoryImageUrl, getCachedImageUrl } from '../lib/imageCache';
import { CAR_PLACEHOLDER_IMAGE } from '../constants/placeholders';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  cacheLocally?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  fallbackSrc = CAR_PLACEHOLDER_IMAGE,
  alt = '',
  className = '',
  loading = 'lazy',
  cacheLocally = true,
  onError,
  ...props
}) => {
  // If src is an accidental video frame, intercept and replace immediately with placeholder
  const sanitizedSrc = (src && !src.includes('/frames/desktop/frame_') && !src.includes('/frames/mobile/frame_')) ? src : '';
  const inMemory = sanitizedSrc ? getInMemoryImageUrl(sanitizedSrc) : null;
  const [currentSrc, setCurrentSrc] = useState<string>(inMemory || sanitizedSrc || fallbackSrc);
  const [isInView, setIsInView] = useState<boolean>(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync currentSrc whenever src or fallbackSrc changes
  useEffect(() => {
    setHasError(false);
    if (!sanitizedSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    const mem = getInMemoryImageUrl(sanitizedSrc);
    if (mem) {
      setCurrentSrc(mem);
      return;
    }

    // Immediately show direct src so user sees uploaded photo with zero delay
    setCurrentSrc(sanitizedSrc);

    if (cacheLocally && isInView) {
      let isMounted = true;
      getCachedImageUrl(sanitizedSrc).then((cachedUrl) => {
        if (isMounted && cachedUrl) {
          setCurrentSrc(cachedUrl);
        }
      }).catch(() => {
        if (isMounted) {
          setCurrentSrc(sanitizedSrc);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [sanitizedSrc, isInView, cacheLocally, fallbackSrc]);

  // IntersectionObserver: Only trigger background cache fetch when image is near viewport
  useEffect(() => {
    if (loading === 'eager' || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px 0px', threshold: 0.01 }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [loading]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      // If a cached blob URL failed to render, try reverting to direct sanitizedSrc first
      if (currentSrc !== sanitizedSrc && sanitizedSrc) {
        setCurrentSrc(sanitizedSrc);
        return;
      }
      setCurrentSrc(fallbackSrc);
    }
    if (onError) {
      onError(e);
    }
  };

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={handleError}
      {...props}
    />
  );
};
