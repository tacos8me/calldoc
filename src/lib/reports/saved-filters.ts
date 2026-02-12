// ---------------------------------------------------------------------------
// Saved Filters & Favorites - Persisted filter presets for reports
// ---------------------------------------------------------------------------
// Allows users to save, load, and delete filter presets for quick reuse
// across report generation sessions. Uses the saved_filters table via
// Drizzle ORM with ownership-based access control.

import { eq, and, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { savedFilters } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SavedFilterInput {
  /** Display name for the saved filter */
  name: string;
  /** Which page/context this filter applies to (e.g., 'reports', 'c2g') */
  context: string;
  /** Serialized filter values */
  filtersJson: Record<string, unknown>;
  /** Whether this is the default filter for the context */
  isDefault?: boolean;
}

export interface SavedFilterRecord {
  id: string;
  userId: string;
  name: string;
  context: string;
  filtersJson: Record<string, unknown>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Save a new filter preset to the database.
 *
 * If `isDefault` is true, any existing default filter for the same
 * user and context will be unset first.
 *
 * @param userId - The ID of the user saving the filter
 * @param input - Filter name, context, and filter values
 * @returns The created saved filter record
 */
export async function saveFilter(
  userId: string,
  input: SavedFilterInput
): Promise<SavedFilterRecord> {
  // If setting as default, unset existing defaults for this context
  if (input.isDefault) {
    await db
      .update(savedFilters)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(savedFilters.userId, userId),
          eq(savedFilters.context, input.context),
          eq(savedFilters.isDefault, true)
        )
      );
  }

  const [created] = await db
    .insert(savedFilters)
    .values({
      userId,
      name: input.name,
      context: input.context,
      filtersJson: input.filtersJson,
      isDefault: input.isDefault ?? false,
    })
    .returning();

  return {
    id: created.id,
    userId: created.userId,
    name: created.name,
    context: created.context,
    filtersJson: created.filtersJson,
    isDefault: created.isDefault,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

/**
 * Load all saved filters for a user, optionally filtered by context.
 *
 * @param userId - The ID of the user whose filters to load
 * @param context - Optional context filter (e.g., 'reports', 'c2g')
 * @returns Array of saved filter records
 */
export async function loadFilters(
  userId: string,
  context?: string
): Promise<SavedFilterRecord[]> {
  const conditions: SQL[] = [eq(savedFilters.userId, userId)];

  if (context) {
    conditions.push(eq(savedFilters.context, context));
  }

  const rows = await db
    .select()
    .from(savedFilters)
    .where(and(...conditions))
    .orderBy(savedFilters.name);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    context: r.context,
    filtersJson: r.filtersJson,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Delete a saved filter with ownership verification.
 *
 * @param filterId - The ID of the filter to delete
 * @param userId - The ID of the user requesting deletion (ownership check)
 * @returns True if the filter was deleted, false if not found or not owned
 */
export async function deleteFilter(
  filterId: string,
  userId: string
): Promise<boolean> {
  // Verify ownership before deletion
  const [existing] = await db
    .select({ id: savedFilters.id, userId: savedFilters.userId })
    .from(savedFilters)
    .where(eq(savedFilters.id, filterId))
    .limit(1);

  if (!existing) return false;
  if (existing.userId !== userId) return false;

  await db
    .delete(savedFilters)
    .where(eq(savedFilters.id, filterId));

  return true;
}

/**
 * Load a specific filter and return its filter values.
 * Does not perform ownership check -- caller should verify access.
 *
 * @param filterId - The ID of the filter to load
 * @returns The filter values, or null if not found
 */
export async function applyFilter(
  filterId: string
): Promise<Record<string, unknown> | null> {
  const [row] = await db
    .select({ filtersJson: savedFilters.filtersJson })
    .from(savedFilters)
    .where(eq(savedFilters.id, filterId))
    .limit(1);

  if (!row) return null;
  return row.filtersJson;
}

/**
 * Update an existing saved filter's name or filter values.
 *
 * @param filterId - The ID of the filter to update
 * @param userId - The ID of the user (ownership check)
 * @param updates - Fields to update
 * @returns The updated filter, or null if not found/not owned
 */
export async function updateFilter(
  filterId: string,
  userId: string,
  updates: { name?: string; filtersJson?: Record<string, unknown>; isDefault?: boolean }
): Promise<SavedFilterRecord | null> {
  // Verify ownership
  const [existing] = await db
    .select({ id: savedFilters.id, userId: savedFilters.userId })
    .from(savedFilters)
    .where(eq(savedFilters.id, filterId))
    .limit(1);

  if (!existing || existing.userId !== userId) return null;

  // If setting as default, unset existing defaults
  if (updates.isDefault) {
    const [currentFilter] = await db
      .select({ context: savedFilters.context })
      .from(savedFilters)
      .where(eq(savedFilters.id, filterId))
      .limit(1);

    if (currentFilter) {
      await db
        .update(savedFilters)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(savedFilters.userId, userId),
            eq(savedFilters.context, currentFilter.context),
            eq(savedFilters.isDefault, true)
          )
        );
    }
  }

  const updateValues: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.name !== undefined) updateValues.name = updates.name;
  if (updates.filtersJson !== undefined) updateValues.filtersJson = updates.filtersJson;
  if (updates.isDefault !== undefined) updateValues.isDefault = updates.isDefault;

  const [updated] = await db
    .update(savedFilters)
    .set(updateValues)
    .where(eq(savedFilters.id, filterId))
    .returning();

  return {
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    context: updated.context,
    filtersJson: updated.filtersJson,
    isDefault: updated.isDefault,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}
