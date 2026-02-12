'use client';

import {
  Hash,
  Phone,
  Users,
  Activity,
  Trophy,
  PieChart,
  ScrollText,
  Clock,
  ImageIcon,
  Globe,
  Type,
  Square,
  Circle,
  Minus,
  BarChart3,
  Group,
  LayoutGrid,
} from 'lucide-react';
import type { WidgetType } from '@/types';
import type { LucideIcon } from 'lucide-react';

import { TitleValueWidget } from './widget-title-value';
import { ActiveCallsWidget } from './widget-active-calls';
import { AgentBoxWidget } from './widget-agent-box';
import { GaugeWidget } from './widget-gauge';
import { ChartWidget } from './widget-chart';
import { GroupBoxWidget } from './widget-group-box';
import { LeaderboardWidget } from './widget-leaderboard';
import { PieChartWidget } from './widget-pie-chart';
import { MarqueeWidget } from './widget-marquee';
import { ClockWidget } from './widget-clock';
import { ImageWidget } from './widget-image';
import { WebPageWidget } from './widget-web-page';
import { TextWidget } from './widget-text';
import { DecorativeWidget } from './widget-decorative';

// ---------------------------------------------------------------------------
// Widget Registry -- central mapping of WidgetType to component metadata
// ---------------------------------------------------------------------------

export type WidgetCategory =
  | 'Real-time'
  | 'Metrics'
  | 'Charts'
  | 'Content'
  | 'Decorative'
  | 'Container';

export interface WidgetRegistryEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  icon: LucideIcon;
  label: string;
  description: string;
  category: WidgetCategory;
  defaultSize: { w: number; h: number };
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetRegistryEntry> = {
  'title-value': {
    component: TitleValueWidget,
    icon: Hash,
    label: 'Title / Value',
    description: 'Single KPI metric with large number display',
    category: 'Metrics',
    defaultSize: { w: 3, h: 2 },
  },
  'active-calls': {
    component: ActiveCallsWidget,
    icon: Phone,
    label: 'Active Calls',
    description: 'Live list of active calls with duration timers',
    category: 'Real-time',
    defaultSize: { w: 4, h: 4 },
  },
  'agent-box': {
    component: AgentBoxWidget,
    icon: Users,
    label: 'Agent Status',
    description: 'Grid of agent cards sorted by state',
    category: 'Real-time',
    defaultSize: { w: 4, h: 4 },
  },
  gauge: {
    component: GaugeWidget,
    icon: Activity,
    label: 'Gauge',
    description: 'Circular gauge with threshold coloring',
    category: 'Metrics',
    defaultSize: { w: 3, h: 3 },
  },
  chart: {
    component: ChartWidget,
    icon: BarChart3,
    label: 'Chart',
    description: 'Bar, line, or area chart for time-series data',
    category: 'Charts',
    defaultSize: { w: 6, h: 3 },
  },
  'group-box': {
    component: GroupBoxWidget,
    icon: Group,
    label: 'Group Status',
    description: 'Hunt group summary with agents, queue, and service level',
    category: 'Real-time',
    defaultSize: { w: 4, h: 3 },
  },
  leaderboard: {
    component: LeaderboardWidget,
    icon: Trophy,
    label: 'Leaderboard',
    description: 'Ranked agent list by metric with bar visualization',
    category: 'Metrics',
    defaultSize: { w: 4, h: 5 },
  },
  'pie-chart': {
    component: PieChartWidget,
    icon: PieChart,
    label: 'Pie / Donut Chart',
    description: 'Pie or donut chart with legend and hover details',
    category: 'Charts',
    defaultSize: { w: 4, h: 4 },
  },
  marquee: {
    component: MarqueeWidget,
    icon: ScrollText,
    label: 'Marquee Ticker',
    description: 'Scrolling text for announcements on TV displays',
    category: 'Content',
    defaultSize: { w: 12, h: 1 },
  },
  clock: {
    component: ClockWidget,
    icon: Clock,
    label: 'Clock',
    description: 'Digital clock with date and timezone support',
    category: 'Content',
    defaultSize: { w: 3, h: 2 },
  },
  image: {
    component: ImageWidget,
    icon: ImageIcon,
    label: 'Image',
    description: 'Static image display for logos and branding',
    category: 'Content',
    defaultSize: { w: 3, h: 3 },
  },
  'web-page': {
    component: WebPageWidget,
    icon: Globe,
    label: 'Web Page',
    description: 'Embedded iframe for external web content',
    category: 'Content',
    defaultSize: { w: 6, h: 4 },
  },
  text: {
    component: TextWidget,
    icon: Type,
    label: 'Text',
    description: 'Static text content for labels and instructions',
    category: 'Metrics',
    defaultSize: { w: 4, h: 3 },
  },
  box: {
    component: DecorativeWidget,
    icon: Square,
    label: 'Box',
    description: 'Rounded rectangle for visual grouping',
    category: 'Decorative',
    defaultSize: { w: 4, h: 3 },
  },
  ellipse: {
    component: DecorativeWidget,
    icon: Circle,
    label: 'Ellipse',
    description: 'Circular shape for visual accents',
    category: 'Decorative',
    defaultSize: { w: 3, h: 3 },
  },
  line: {
    component: DecorativeWidget,
    icon: Minus,
    label: 'Line / Divider',
    description: 'Horizontal or vertical divider line',
    category: 'Decorative',
    defaultSize: { w: 6, h: 1 },
  },
  'widget-group': {
    component: DecorativeWidget,
    icon: LayoutGrid,
    label: 'Widget Group',
    description: 'Container for grouping multiple widgets',
    category: 'Container',
    defaultSize: { w: 6, h: 4 },
  },
};

/** Get all categories with their widget types */
export function getWidgetsByCategory(): { category: WidgetCategory; types: (WidgetType & string)[] }[] {
  const categoryOrder: WidgetCategory[] = [
    'Real-time',
    'Metrics',
    'Charts',
    'Content',
    'Decorative',
    'Container',
  ];

  const grouped: Record<string, WidgetType[]> = {};
  for (const [type, entry] of Object.entries(WIDGET_REGISTRY)) {
    if (!grouped[entry.category]) {
      grouped[entry.category] = [];
    }
    grouped[entry.category].push(type as WidgetType);
  }

  return categoryOrder
    .filter((cat) => grouped[cat]?.length > 0)
    .map((cat) => ({
      category: cat,
      types: grouped[cat] as (WidgetType & string)[],
    }));
}
