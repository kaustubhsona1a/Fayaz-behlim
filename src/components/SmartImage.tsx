import React, { useState, useEffect, useRef } from 'react';
import { getInMemoryImageUrl, getCachedImageUrl } from '../lib/imageCache';

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  cacheLocally?: boolean;
}

const DEFAULT_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500' fill='%2318181b'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2371717a' font-family='sans-serif' font-size='16'>Loading Image...</text></svg>";

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  fallbackSrc = DEFAULT_PLACEHOLDER,
  alt = '',
  className = '',
  loading = 'lazy',
  cacheLocally = true,
  onError,
  ...props
}) => {
  const inMemory = src ? getInMemoryImageUrl(src) : null;
  const [currentSrc, setCurrentSrc] = useState<string>(inMemory || src || fallbackSrc);
  const [isInView, setIsInView] = useState<boolean>(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // IntersectionObserver: Only trigger fetches when image is within 250px of viewport
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

  // Fetch and cache when in view
  useEffect(() => {
    if (!src || !isInView) return;

    if (!cacheLocally) {
      setCurrentSrc(src);
      return;
    }

    const mem = getInMemoryImageUrl(src);
    if (mem) {
      setCurrentSrc(mem);
      return;
    }

    let isMounted = true;
    getCachedImageUrl(src).then((cachedUrl) => {
      if (isMounted && cachedUrl) {
        setCurrentSrc(cachedUrl);
      }
    }).catch(() => {
      if (isMounted) {
        setCurrentSrc(src);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [src, isInView, cacheLocally]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
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
