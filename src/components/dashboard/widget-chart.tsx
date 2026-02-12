'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  CHART_COLORS,
  chartAxisStyle,
  chartTooltipStyle,
  ANIMATION,
  SURFACES,
} from '@/lib/theme';

// ---------------------------------------------------------------------------
// ChartWidget -- time-series chart (area, bar, or line) using Recharts
// ---------------------------------------------------------------------------

export interface ChartDataPoint {
  /** X-axis label (e.g. time bucket) */
  label: string;
  /** One or more numeric series */
  [key: string]: string | number;
}

export interface ChartWidgetProps {
  /** Chart type */
  chartType?: 'area' | 'bar' | 'line';
  /** Data points array */
  data: ChartDataPoint[];
  /** Series keys to render (defaults to all numeric keys except 'label') */
  series?: string[];
  /** Whether to show the grid */
  showGrid?: boolean;
  className?: string;
}

export function ChartWidget({
  chartType = 'area',
  data,
  series,
  showGrid = true,
  className,
}: ChartWidgetProps) {
  // Infer series keys from data if not provided
  const seriesKeys =
    series ??
    (data.length > 0
      ? Object.keys(data[0]).filter(
          (k) => k !== 'label' && typeof data[0][k] === 'number',
        )
      : []);

  const axisStyle = chartAxisStyle();
  const tooltipStyle = chartTooltipStyle();

  const commonAxisProps = {
    tick: axisStyle,
    tickLine: false,
    axisLine: { stroke: SURFACES.elevated },
  };

  const gridElement = showGrid ? (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke={SURFACES.elevated}
      vertical={false}
    />
  ) : null;

  const tooltipElement = (
    <Tooltip
      contentStyle={tooltipStyle.contentStyle}
      itemStyle={tooltipStyle.itemStyle}
      labelStyle={tooltipStyle.labelStyle}
    />
  );

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-body-sm text-content-tertiary', className)}>
        No chart data
      </div>
    );
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' ? (
          <BarChart data={data}>
            {gridElement}
            <XAxis dataKey="label" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {tooltipElement}
            {seriesKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={ANIMATION.durations.chart}
              />
            ))}
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart data={data}>
            {gridElement}
            <XAxis dataKey="label" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {tooltipElement}
            {seriesKeys.map((key, idx) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={ANIMATION.durations.chart}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart data={data}>
            {gridElement}
            <XAxis dataKey="label" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {tooltipElement}
            {seriesKeys.map((key, idx) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
                isAnimationActive
                animationDuration={ANIMATION.durations.chart}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
