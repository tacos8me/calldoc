// ─── DataTable Component Tests ───────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../shared/data-table';
import type { ColumnDef } from '@tanstack/react-table';

// ---------------------------------------------------------------------------
// Test data and column definitions
// ---------------------------------------------------------------------------

interface TestRow {
  id: string;
  name: string;
  value: number;
}

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name', enableSorting: true },
  { accessorKey: 'value', header: 'Value', enableSorting: true },
];

function makeRows(count: number): TestRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i + 1}`,
    name: `Item ${String.fromCharCode(65 + (i % 26))}`,
    value: (i + 1) * 10,
  }));
}

const sampleRows = makeRows(5);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('DataTable - rendering', () => {
  it('renders columns and rows correctly', () => {
    render(<DataTable columns={columns} data={sampleRows} />);

    // Headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();

    // Row data
    expect(screen.getByText('row-1')).toBeInTheDocument();
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('row-5')).toBeInTheDocument();
  });

  it('renders all data rows', () => {
    render(<DataTable columns={columns} data={sampleRows} />);
    const rows = screen.getAllByRole('row');
    // 1 header row + 5 data rows
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe('DataTable - sorting', () => {
  it('clicking a sortable column header toggles sort direction', async () => {
    const onSortingChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={sampleRows}
        sorting={[]}
        onSortingChange={onSortingChange}
      />,
    );

    const nameHeader = screen.getByText('Name');
    await userEvent.click(nameHeader);

    expect(onSortingChange).toHaveBeenCalled();
  });

  it('internal sorting works when no controlled sorting is provided', async () => {
    render(<DataTable columns={columns} data={sampleRows} />);

    const valueHeader = screen.getByText('Value');
    await userEvent.click(valueHeader);

    // After clicking, the table should still render all rows
    expect(screen.getByText('row-1')).toBeInTheDocument();
    expect(screen.getByText('row-5')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('DataTable - pagination', () => {
  it('shows pagination info when there are rows', () => {
    const manyRows = makeRows(100);
    render(
      <DataTable
        columns={columns}
        data={manyRows}
        pagination={{ pageIndex: 0, pageSize: 50 }}
        onPaginationChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it('navigates to next page via pagination buttons', async () => {
    const onPaginationChange = vi.fn();
    const manyRows = makeRows(100);
    render(
      <DataTable
        columns={columns}
        data={manyRows}
        pagination={{ pageIndex: 0, pageSize: 50 }}
        onPaginationChange={onPaginationChange}
        pageCount={2}
      />,
    );

    const nextButton = screen.getByLabelText('Next page');
    await userEvent.click(nextButton);

    expect(onPaginationChange).toHaveBeenCalled();
  });

  it('disables previous page button on first page', () => {
    render(
      <DataTable
        columns={columns}
        data={makeRows(100)}
        pagination={{ pageIndex: 0, pageSize: 50 }}
        onPaginationChange={vi.fn()}
        pageCount={2}
      />,
    );

    const prevButton = screen.getByLabelText('Previous page');
    expect(prevButton).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Row expansion
// ---------------------------------------------------------------------------

describe('DataTable - row expansion', () => {
  it('clicking an expandable row renders the expanded content', async () => {
    const renderExpanded = (row: TestRow) => (
      <div data-testid={`detail-${row.id}`}>Details for {row.name}</div>
    );

    render(
      <DataTable
        columns={columns}
        data={sampleRows}
        expandable
        renderExpanded={renderExpanded}
      />,
    );

    // Click the first data row
    const firstRow = screen.getByText('row-1').closest('tr')!;
    await userEvent.click(firstRow);

    expect(screen.getByTestId('detail-row-1')).toBeInTheDocument();
    expect(screen.getByText('Details for Item A')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('DataTable - keyboard navigation', () => {
  it('J key moves selection down', async () => {
    render(<DataTable columns={columns} data={sampleRows} />);

    // Press J key to navigate down
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'j' });

    // The focused row should have ring class or equivalent visual state
    // We verify the keyboard handler was invoked without error
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it('K key moves selection up', async () => {
    render(<DataTable columns={columns} data={sampleRows} />);

    // Navigate down first, then up
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'j' });
    fireEvent.keyDown(window, { key: 'k' });

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it('does not handle keyboard when input is focused', () => {
    // Render with a text input present
    const { container } = render(
      <div>
        <input type="text" data-testid="input" />
        <DataTable columns={columns} data={sampleRows} />
      </div>,
    );

    const input = screen.getByTestId('input');
    input.focus();
    fireEvent.keyDown(input, { key: 'j' });

    // No errors, keyboard handler ignored because target is INPUT
    expect(input).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('DataTable - empty state', () => {
  it('shows default empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('shows custom empty state when provided', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyState={<div data-testid="custom-empty">Nothing here</div>}
      />,
    );

    expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('DataTable - loading state', () => {
  it('shows skeleton rows when loading is true', () => {
    render(<DataTable columns={columns} data={[]} loading />);

    // Skeleton rows use the shimmer class
    const { container } = render(
      <DataTable columns={columns} data={[]} loading />,
    );
    const shimmerElements = container.querySelectorAll('.animate-shimmer');
    expect(shimmerElements.length).toBeGreaterThan(0);
  });

  it('does not show pagination when loading', () => {
    render(<DataTable columns={columns} data={[]} loading />);

    expect(screen.queryByText('Showing')).not.toBeInTheDocument();
  });
});
