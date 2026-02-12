'use client';

import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// DecorativeWidget -- boxes, ellipses, and lines for visual grouping
// ---------------------------------------------------------------------------

export interface DecorativeWidgetProps {
  /** Shape type */
  shapeType?: 'box' | 'ellipse' | 'line';
  /** Fill color (CSS color string) */
  fillColor?: string;
  /** Border color */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Opacity 0-1 */
  opacity?: number;
  /** Line orientation (for line type) */
  lineOrientation?: 'horizontal' | 'vertical';
}

export function DecorativeWidget({
  shapeType = 'box',
  fillColor = 'transparent',
  borderColor = '#3F3F46',
  borderWidth = 1,
  opacity = 1,
  lineOrientation = 'horizontal',
}: DecorativeWidgetProps) {
  if (shapeType === 'line') {
    return (
      <div
        className="flex items-center justify-center h-full w-full"
        style={{ opacity }}
      >
        <div
          className={cn(
            lineOrientation === 'horizontal' ? 'w-full' : 'h-full',
          )}
          style={{
            [lineOrientation === 'horizontal' ? 'height' : 'width']: `${borderWidth}px`,
            [lineOrientation === 'horizontal' ? 'minHeight' : 'minWidth']: `${borderWidth}px`,
            backgroundColor: borderColor,
          }}
        />
      </div>
    );
  }

  if (shapeType === 'ellipse') {
    return (
      <div
        className="h-full w-full"
        style={{
          borderRadius: '50%',
          backgroundColor: fillColor,
          border: `${borderWidth}px solid ${borderColor}`,
          opacity,
        }}
      />
    );
  }

  // Default: box (rounded rectangle)
  return (
    <div
      className="h-full w-full rounded-lg"
      style={{
        backgroundColor: fillColor,
        border: `${borderWidth}px solid ${borderColor}`,
        opacity,
      }}
    />
  );
}
