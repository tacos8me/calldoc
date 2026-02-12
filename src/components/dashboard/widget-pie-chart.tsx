'use client';

import { useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { CHART_COLORS, chartTooltipStyle, ANIMATION } from '@/lib/theme';

// ---------------------------------------------------------------------------
// PieChartWidget -- pie or donut chart with configurable data
// ---------------------------------------------------------------------------

export interface PieChartDataPoint {
  name: string;
  value: number;
}

export interface PieChartWidgetProps {
  data?: PieChartDataPoint[];
  /** Show as donut (hollow center) */
  donut?: boolean;
  /** Center label for donut mode */
  centerLabel?: string;
  className?: string;
}

const MOCK_DATA: PieChartDataPoint[] = [
  { name: 'Sales', value: 42 },
  { name: 'Support', value: 35 },
  { name: 'Billing', value: 18 },
  { name: 'Tech', value: 12 },
  { name: 'Other', value: 8 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: PieChartDataPoint }>;
}

function PieCustomTooltip({ active, payload }: CustomTooltipProps) {
  const tooltipStyle = chartTooltipStyle();

  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const total = entry.payload.value;
  // We need to compute percentage from the original data
  return (
    <div style={tooltipStyle.contentStyle}>
      <p className="text-body-sm text-content-primary font-medium">
        {entry.name}
      </p>
      <p className="text-body-sm text-content-secondary">
        Value: <span className="text-content-primary font-mono">{total}</span>
      </p>
    </div>
  );
}

export function PieChartWidget({
  data = MOCK_DATA,
  donut = true,
  centerLabel,
  className,
}: PieChartWidgetProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const displayCenterLabel = centerLabel ?? String(total);

  const onMouseEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const onMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-body-sm text-content-tertiary', className)}>
        No chart data
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full relative', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={donut ? '55%' : 0}
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive
            animationDuration={ANIMATION.durations.chart}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                opacity={activeIndex !== null && activeIndex !== index ? 0.5 : 1}
                stroke="transparent"
                style={{ transition: 'opacity 200ms' }}
              />
            ))}
          </Pie>
          <Tooltip content={<PieCustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={28}
            formatter={(value: string) => (
              <span className="text-caption text-content-secondary">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label for donut */}
      {donut && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 28 }}>
          <div className="flex flex-col items-center -mt-[5%]">
            <span className="text-display-sm font-mono text-content-primary tabular-nums">
              {activeIndex !== null ? data[activeIndex].value : displayCenterLabel}
            </span>
            <span className="text-caption text-content-tertiary">
              {activeIndex !== null ? data[activeIndex].name : 'Total'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
