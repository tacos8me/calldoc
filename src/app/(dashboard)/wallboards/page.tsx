'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Monitor,
  Edit3,
  Trash2,
  Copy,
  Clock,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWallboardStore } from '@/stores/wallboard-store';
import type { WallboardConfig } from '@/types';

// ---------------------------------------------------------------------------
// Wallboard List Page -- management grid with create, edit, delete, duplicate
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface WallboardCardProps {
  wallboard: WallboardConfig;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function WallboardCard({ wallboard, onView, onEdit, onDelete, onDuplicate }: WallboardCardProps) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border border-border bg-surface-card overflow-hidden',
        'transition-all duration-normal hover:shadow-md hover:border-border-strong',
        'cursor-pointer group',
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onView}
    >
      {/* Thumbnail preview area */}
      <div className="relative h-40 bg-surface-base flex items-center justify-center overflow-hidden">
        {/* Mock widget layout preview */}
        <div className="grid grid-cols-4 gap-1 p-3 w-full h-full opacity-60">
          {wallboard.widgets.slice(0, 6).map((w, idx) => (
            <div
              key={w.id}
              className={cn(
                'rounded bg-surface-elevated border border-border/50',
                idx === 3 && 'col-span-2 row-span-2',
                idx === 4 && 'col-span-2',
              )}
            />
          ))}
        </div>

        {/* Widget count badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-elevated/80 backdrop-blur-sm">
          <LayoutGrid className="h-3 w-3 text-content-tertiary" />
          <span className="text-caption text-content-secondary">
            {wallboard.widgets.length} widgets
          </span>
        </div>

        {/* Hover overlay with actions */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-2',
            'bg-surface-base/80 backdrop-blur-sm',
            'transition-opacity duration-normal',
            hovering ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-white text-caption font-medium hover:bg-accent-hover transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-elevated text-content-secondary text-caption font-medium hover:text-content-primary transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-status-danger/10 text-status-danger text-caption font-medium hover:bg-status-danger/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1 p-4">
        <h3 className="text-heading-md text-content-primary truncate">
          {wallboard.name}
        </h3>
        <div className="flex items-center gap-3 text-caption text-content-tertiary">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(wallboard.updatedAt)}
          </span>
          <span>{wallboard.createdBy}</span>
        </div>
      </div>
    </div>
  );
}

type TabType = 'my' | 'shared';

export default function WallboardsPage() {
  const router = useRouter();
  const wallboards = useWallboardStore((s) => s.wallboards);
  const loadWallboards = useWallboardStore((s) => s.loadWallboards);
  const createWallboard = useWallboardStore((s) => s.createWallboard);
  const deleteWallboard = useWallboardStore((s) => s.deleteWallboard);
  const duplicateWallboard = useWallboardStore((s) => s.duplicateWallboard);
  const [activeTab, setActiveTab] = useState<TabType>('my');

  useEffect(() => {
    loadWallboards();
  }, [loadWallboards]);

  const handleCreate = useCallback(() => {
    const id = createWallboard('New Wallboard');
    router.push(`/wallboards/${id}/edit`);
  }, [createWallboard, router]);

  const handleView = useCallback(
    (id: string) => router.push(`/wallboards/${id}`),
    [router],
  );

  const handleEdit = useCallback(
    (id: string) => router.push(`/wallboards/${id}/edit`),
    [router],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm('Are you sure you want to delete this wallboard?')) {
        deleteWallboard(id);
      }
    },
    [deleteWallboard],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateWallboard(id);
    },
    [duplicateWallboard],
  );

  // Filter by tab
  const filteredWallboards = wallboards.filter((wb) =>
    activeTab === 'my'
      ? wb.createdBy === 'admin' || wb.createdBy === 'current-user'
      : wb.createdBy !== 'admin' && wb.createdBy !== 'current-user',
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-xl text-content-primary">Wallboards</h1>
          <p className="text-body-md text-content-secondary mt-1">
            Create and manage wallboard displays for your call center.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md',
            'bg-accent text-white text-body-md font-medium',
            'hover:bg-accent-hover transition-colors duration-fast',
          )}
        >
          <Plus className="h-4 w-4" />
          New Wallboard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('my')}
          className={cn(
            'px-4 py-2 text-body-md border-b-2 transition-colors duration-fast',
            activeTab === 'my'
              ? 'border-accent text-accent font-medium'
              : 'border-transparent text-content-secondary hover:text-content-primary',
          )}
        >
          My Wallboards
        </button>
        <button
          onClick={() => setActiveTab('shared')}
          className={cn(
            'px-4 py-2 text-body-md border-b-2 transition-colors duration-fast',
            activeTab === 'shared'
              ? 'border-accent text-accent font-medium'
              : 'border-transparent text-content-secondary hover:text-content-primary',
          )}
        >
          Shared Wallboards
        </button>
      </div>

      {/* Wallboard grid */}
      {filteredWallboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-content-tertiary">
          <Monitor className="h-12 w-12 opacity-50" />
          <p className="text-body-md">
            {activeTab === 'my'
              ? 'No wallboards yet. Create your first one!'
              : 'No shared wallboards available.'}
          </p>
          {activeTab === 'my' && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-body-md font-medium hover:bg-accent-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Wallboard
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredWallboards.map((wb) => (
            <WallboardCard
              key={wb.id}
              wallboard={wb}
              onView={() => handleView(wb.id)}
              onEdit={() => handleEdit(wb.id)}
              onDelete={() => handleDelete(wb.id)}
              onDuplicate={() => handleDuplicate(wb.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
