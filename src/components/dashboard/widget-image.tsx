'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// ImageWidget -- static image display for wallboard branding/logos
// ---------------------------------------------------------------------------

export interface ImageWidgetProps {
  /** Image URL */
  url?: string;
  /** Alt text */
  alt?: string;
  /** Object fit: contain (default) or cover */
  objectFit?: 'contain' | 'cover';
}

export function ImageWidget({
  url,
  alt = 'Widget image',
  objectFit = 'contain',
}: ImageWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-content-tertiary">
        <ImageIcon className="h-10 w-10 opacity-50" />
        <span className="text-caption">
          {error ? 'Failed to load image' : 'No image URL configured'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center h-full w-full overflow-hidden">
      {/* Loading placeholder */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-elevated animate-pulse">
          <ImageIcon className="h-8 w-8 text-content-tertiary opacity-40" />
        </div>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className={cn(
          'max-h-full max-w-full transition-opacity duration-normal',
          loading ? 'opacity-0' : 'opacity-100',
        )}
        style={{ objectFit }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}
