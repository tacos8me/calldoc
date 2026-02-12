// ─── FilterBuilder Component Tests ──────────────────────────────────────────
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FilterBuilder,
  ActiveFilterChips,
  type FilterSchema,
  type FilterState,
} from '../shared/filter-builder';

// ---------------------------------------------------------------------------
// Test schema
// ---------------------------------------------------------------------------

const schema: FilterSchema = {
  fields: [
    { key: 'name', label: 'Agent Name', type: 'text', category: 'Agent' },
    {
      key: 'direction',
      label: 'Direction',
      type: 'select',
      category: 'Call',
      options: [
        { label: 'Inbound', value: 'inbound' },
        { label: 'Outbound', value: 'outbound' },
      ],
    },
    {
      key: 'groups',
      label: 'Groups',
      type: 'multiselect',
      category: 'Call',
      options: [
        { label: 'Sales', value: 'sales' },
        { label: 'Support', value: 'support' },
      ],
    },
    { key: 'hasRecording', label: 'Has Recording', type: 'boolean', category: 'Call' },
  ],
};

// ---------------------------------------------------------------------------
// FilterBuilder - category rendering
// ---------------------------------------------------------------------------

describe('FilterBuilder - rendering', () => {
  it('renders filter categories', () => {
    render(
      <FilterBuilder
        schema={schema}
        value={{}}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Call')).toBeInTheDocument();
  });

  it('expands a category when clicked', async () => {
    render(
      <FilterBuilder
        schema={schema}
        value={{}}
        onChange={vi.fn()}
      />,
    );

    const agentCategory = screen.getByText('Agent');
    await userEvent.click(agentCategory);

    // Should now show the Agent Name field label
    expect(screen.getByText('Agent Name')).toBeInTheDocument();
  });

  it('returns null when collapsed is true', () => {
    const { container } = render(
      <FilterBuilder
        schema={schema}
        value={{}}
        onChange={vi.fn()}
        collapsed
      />,
    );

    expect(container.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// FilterBuilder - clear all / reset
// ---------------------------------------------------------------------------

describe('FilterBuilder - reset', () => {
  it('calls onReset when reset button is clicked', async () => {
    const onReset = vi.fn();
    render(
      <FilterBuilder
        schema={schema}
        value={{ name: 'test' }}
        onChange={vi.fn()}
        onReset={onReset}
      />,
    );

    const resetButton = screen.getByTitle('Reset filters');
    await userEvent.click(resetButton);

    expect(onReset).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// FilterBuilder - keyboard shortcut
// ---------------------------------------------------------------------------

describe('FilterBuilder - keyboard shortcut', () => {
  it('F key toggles the filter panel via onToggleCollapsed', () => {
    const onToggle = vi.fn();
    render(
      <FilterBuilder
        schema={schema}
        value={{}}
        onChange={vi.fn()}
        onToggleCollapsed={onToggle}
      />,
    );

    fireEvent.keyDown(window, { key: 'f' });
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('does not toggle when Ctrl+F is pressed', () => {
    const onToggle = vi.fn();
    render(
      <FilterBuilder
        schema={schema}
        value={{}}
        onChange={vi.fn()}
        onToggleCollapsed={onToggle}
      />,
    );

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(onToggle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ActiveFilterChips
// ---------------------------------------------------------------------------

describe('ActiveFilterChips', () => {
  it('renders chips for active filters', () => {
    render(
      <ActiveFilterChips
        schema={schema}
        value={{ name: 'John', direction: 'inbound' }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Agent Name:')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Direction:')).toBeInTheDocument();
    expect(screen.getByText('Inbound')).toBeInTheDocument();
  });

  it('removing a filter chip calls onChange without that filter', async () => {
    const onChange = vi.fn();
    render(
      <ActiveFilterChips
        schema={schema}
        value={{ name: 'John', direction: 'inbound' }}
        onChange={onChange}
      />,
    );

    const removeButton = screen.getByLabelText('Remove Agent Name filter');
    await userEvent.click(removeButton);

    expect(onChange).toHaveBeenCalledWith({ direction: 'inbound' });
  });

  it('clear all button calls onReset', async () => {
    const onReset = vi.fn();
    render(
      <ActiveFilterChips
        schema={schema}
        value={{ name: 'John' }}
        onChange={vi.fn()}
        onReset={onReset}
      />,
    );

    const clearAll = screen.getByText('Clear all');
    await userEvent.click(clearAll);

    expect(onReset).toHaveBeenCalledOnce();
  });

  it('renders nothing when no active filters', () => {
    const { container } = render(
      <ActiveFilterChips
        schema={schema}
        value={{}}
        onChange={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when all filter values are empty', () => {
    const { container } = render(
      <ActiveFilterChips
        schema={schema}
        value={{ name: '', groups: [] }}
        onChange={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe('');
  });
});
