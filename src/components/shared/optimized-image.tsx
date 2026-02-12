'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// OptimizedImage -- Wrapper around next/image with performance defaults.
//
// Features:
// - Blur placeholder for perceived performance (shimmer while loading)
// - Lazy loading by default (loads when entering viewport)
// - Proper srcSet generation via Next.js image optimization
// - Error state with fallback
// - Aspect ratio preservation
//
// Performance: reduces Largest Contentful Paint (LCP) by lazy-loading
// off-screen images and showing placeholders for above-the-fold images.
// ---------------------------------------------------------------------------

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Whether this image is above the fold and should load eagerly */
  priority?: boolean;
  /** Object-fit behavior (default: 'cover') */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  /** Aspect ratio string (e.g., '16/9', '1/1') */
  aspectRatio?: string;
  /** Custom blur data URL for placeholder */
  blurDataURL?: string;
  /** Quality 1-100 (default: 75 for good balance of quality/size) */
  quality?: number;
  /** Sizes attribute for responsive srcSet */
  sizes?: string;
  className?: string;
  /** Container className */
  containerClassName?: string;
  /** Called when image fails to load */
  onError?: () => void;
}

// Tiny 1x1 pixel shimmer placeholder
const DEFAULT_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMyNzI3MkEiLz48L3N2Zz4=';

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  objectFit = 'cover',
  aspectRatio,
  blurDataURL = DEFAULT_BLUR_DATA_URL,
  quality = 75,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw',
  className,
  containerClassName,
  onError: onErrorProp,
}: OptimizedImageProps) {
  const [hasError, setHasError] = React.useState(false);

  const handleError = React.useCallback(() => {
    setHasError(true);
    onErrorProp?.();
  }, [onErrorProp]);

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-surface-elevated text-content-tertiary',
          containerClassName,
        )}
        style={{
          width: width ?? '100%',
          height: height ?? 'auto',
          aspectRatio,
        }}
        role="img"
        aria-label={alt}
      >
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
      </div>
    );
  }

  // Use fill mode when no explicit dimensions provided
  const useFill = !width || !height;

  return (
    <div
      className={cn('relative overflow-hidden', containerClassName)}
      style={{
        width: useFill ? '100%' : width,
        height: useFill ? '100%' : height,
        aspectRatio: useFill ? aspectRatio : undefined,
      }}
    >
      <Image
        src={src}
        alt={alt}
        {...(useFill ? { fill: true } : { width, height })}
        quality={quality}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
        placeholder="blur"
        blurDataURL={blurDataURL}
        onError={handleError}
        className={cn(
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          className,
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LazyIframe -- Iframe with loading="lazy" for web-page widgets.
// Performance: prevents iframes from loading until scrolled into view.
// ---------------------------------------------------------------------------

interface LazyIframeProps {
  src: string;
  title: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  /** Allow specific iframe features */
  allow?: string;
  /** Sandbox restrictions */
  sandbox?: string;
}

export function LazyIframe({
  src,
  title,
  width = '100%',
  height = 400,
  className,
  allow,
  sandbox,
}: LazyIframeProps) {
  return (
    <iframe
      src={src}
      title={title}
      width={width}
      height={height}
      loading="lazy"
      className={cn('border-0', className)}
      allow={allow}
      sandbox={sandbox}
    />
  );
}
