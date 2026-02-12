'use client';

import type { ReactNode } from 'react';
import {
  Inbox,
  Search,
  ShieldX,
  AlertCircle,
  LayoutDashboard,
  Users,
  Mic,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// EmptyState -- reusable component with icon, title, description, and
// optional action button. Pre-configured variants for common scenarios.
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Custom icon node (overrides icon prop) */
  iconNode?: ReactNode;
  /** Main heading */
  title: string;
  /** Supporting description text */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS class for the container */
  className?: string;
}

export function EmptyState({
  icon: Icon,
  iconNode,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className,
      )}
    >
      {/* Icon */}
      {(Icon || iconNode) && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated">
          {iconNode ?? (Icon && <Icon className="h-7 w-7 text-content-tertiary" />)}
        </div>
      )}

      {/* Title */}
      <h3 className="text-heading-md text-content-primary">{title}</h3>

      {/* Description */}
      {description && (
        <p className="mt-1.5 max-w-sm text-body-sm text-content-tertiary">
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'mt-4 inline-flex items-center gap-2 rounded-md px-4 py-2',
            'bg-accent text-white text-body-sm font-medium',
            'hover:bg-accent-hover transition-colors duration-fast',
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-configured empty state variants
// ---------------------------------------------------------------------------

export interface EmptyStateVariantProps {
  /** Optional action override */
  action?: EmptyStateProps['action'];
  className?: string;
}

/** No data available at all (e.g. fresh install) */
export function EmptyStateNoData({ action, className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={Inbox}
      title="No data available yet"
      description="Data will appear here once the system starts receiving call records from DevLink3."
      action={action ?? {
        label: 'Check DevLink3 connection',
        onClick: () => {
          if (typeof window !== 'undefined') window.location.href = '/admin/settings';
        },
      }}
      className={className}
    />
  );
}

/** No results match the current filters */
export function EmptyStateNoResults({
  onClearFilters,
  className,
}: {
  onClearFilters?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No calls match your filters"
      description="Try adjusting your search criteria or clearing filters to see more results."
      action={
        onClearFilters
          ? { label: 'Clear filters', onClick: onClearFilters }
          : undefined
      }
      className={className}
    />
  );
}

/** User does not have access to this section */
export function EmptyStateNoAccess({ className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={ShieldX}
      title="Access denied"
      description="You don't have permission to view this page. Contact your administrator to request access."
      action={{
        label: 'Go to Dashboard',
        onClick: () => {
          if (typeof window !== 'undefined') window.location.href = '/';
        },
      }}
      className={className}
    />
  );
}

/** Loading error occurred */
export function EmptyStateLoadingError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Failed to load data"
      description="An error occurred while loading this content. Please try again."
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
      className={className}
    />
  );
}

/** Dashboard has no widgets */
export function EmptyStateDashboard({ action, className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={LayoutDashboard}
      title="Your dashboard is empty"
      description="Add widgets to start monitoring your call center in real time."
      action={action ?? { label: 'Add your first widget', onClick: () => {} }}
      className={className}
    />
  );
}

/** Agent timeline -- no agents selected */
export function EmptyStateAgentTimeline({ className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={Users}
      title="Select agents to view their timeline"
      description="Use the agent selector above to choose one or more agents."
      className={className}
    />
  );
}

/** Recordings -- no recordings found */
export function EmptyStateRecordings({ action, className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={Mic}
      title="No recordings found"
      description="Adjust your search criteria or date range to find recordings."
      action={action}
      className={className}
    />
  );
}

/** Reports -- no data for the selected period */
export function EmptyStateReports({ className }: EmptyStateVariantProps) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No data for the selected period"
      description="Try selecting a different date range or report configuration."
      className={className}
    />
  );
}
