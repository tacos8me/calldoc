'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// MarqueeWidget -- scrolling text ticker for wallboard announcements
// ---------------------------------------------------------------------------

export interface MarqueeWidgetProps {
  /** Text content to scroll */
  content?: string;
  /** Scroll speed in pixels per second */
  scrollSpeed?: number;
  /** Font size in pixels */
  fontSize?: number;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
}

export function MarqueeWidget({
  content = 'Welcome to CallDoc. Service level target: 80% of calls answered within 20 seconds. Remember to update your after-call work notes promptly.',
  scrollSpeed = 60,
  fontSize = 16,
  backgroundColor,
  textColor,
}: MarqueeWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure text and container widths
  useEffect(() => {
    if (!textRef.current || !containerRef.current) return;

    const measureFn = () => {
      if (textRef.current) {
        setTextWidth(textRef.current.scrollWidth);
      }
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    measureFn();

    const observer = new ResizeObserver(measureFn);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [content, fontSize]);

  // Calculate animation duration based on distance and speed
  const totalDistance = textWidth + containerWidth;
  const duration = scrollSpeed > 0 ? totalDistance / scrollSpeed : 20;

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex items-center h-full overflow-hidden rounded-md',
      )}
      style={{
        backgroundColor: backgroundColor ?? 'transparent',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={textRef}
        className="whitespace-nowrap"
        style={{
          fontSize: `${fontSize}px`,
          color: textColor ?? 'var(--text-primary)',
          fontWeight: 500,
          animation: `marquee-scroll ${duration}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {content}
      </div>

      {/* Inline keyframes via style tag */}
      <style>{`
        @keyframes marquee-scroll {
          0% {
            transform: translateX(${containerWidth}px);
          }
          100% {
            transform: translateX(-${textWidth}px);
          }
        }
      `}</style>
    </div>
  );
}
