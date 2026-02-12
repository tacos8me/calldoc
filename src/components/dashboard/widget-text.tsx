'use client';

import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// TextWidget -- static rich text display for labels, instructions, KPIs
// ---------------------------------------------------------------------------

export interface TextWidgetProps {
  /** Text content (supports basic markdown-like formatting) */
  content?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Text color (CSS color string) */
  textColor?: string;
}

/**
 * Very simple markdown-like parser for basic formatting:
 * **bold**, *italic*, \n for line breaks
 */
function renderContent(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      result.push(<br key={`br-${i}`} />);
    }
    const line = lines[i];
    // Process **bold** and *italic*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      if (part.startsWith('**') && part.endsWith('**')) {
        result.push(
          <strong key={`${i}-${j}`} className="font-semibold">
            {part.slice(2, -2)}
          </strong>,
        );
      } else if (part.startsWith('*') && part.endsWith('*')) {
        result.push(
          <em key={`${i}-${j}`} className="italic">
            {part.slice(1, -1)}
          </em>,
        );
      } else {
        result.push(part);
      }
    }
  }

  return result;
}

const DEFAULT_CONTENT = `**Welcome to CallDoc**
Monitor your call center performance in real-time.

*Tip: Use the wallboard editor to customize your display.*

Key Metrics:
- Service Level Target: 80%
- Average Handle Time: < 5 min
- Abandon Rate: < 3%`;

export function TextWidget({
  content = DEFAULT_CONTENT,
  fontSize = 14,
  textAlign = 'left',
  textColor,
}: TextWidgetProps) {
  return (
    <div
      className={cn(
        'h-full overflow-y-auto',
        'text-content-primary leading-relaxed',
      )}
      style={{
        fontSize: `${fontSize}px`,
        textAlign,
        color: textColor ?? undefined,
      }}
    >
      {renderContent(content)}
    </div>
  );
}
