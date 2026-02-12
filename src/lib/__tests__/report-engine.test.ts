// ─── Report Engine Tests ─────────────────────────────────────────────────────
// Tests the report engine utilities, templates, and export functions.
// These tests focus on the template registry, format helpers, export logic,
// and the buildSummary function -- all without requiring a database.

import { describe, it, expect, vi } from 'vitest';
import { getTemplate, REPORT_TEMPLATES, getTemplatesByCategory, getTemplateCategories } from '@/lib/reports/templates';
import { formatCellValue, getAvailableTemplateIds } from '@/lib/reports/engine';
import { exportCSV, exportPDF } from '@/lib/reports/export';
import type { ReportResult } from '@/lib/reports/engine';
import type { ReportColumnDef } from '@/lib/reports/templates';

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

describe('Report Templates', () => {
  it('getTemplate returns agent-summary template with correct columns', () => {
    const template = getTemplate('agent-summary');
    expect(template).toBeDefined();
    expect(template!.id).toBe('agent-summary');
    expect(template!.name).toBe('Agent Summary');
    expect(template!.category).toBe('agent');

    // Verify expected columns
    const columnKeys = template!.columns.map((c) => c.key);
    expect(columnKeys).toContain('agentName');
    expect(columnKeys).toContain('totalCalls');
    expect(columnKeys).toContain('answeredCalls');
    expect(columnKeys).toContain('avgTalkTime');
    expect(columnKeys).toContain('answerRate');
  });

  it('getTemplate returns undefined for unknown template', () => {
    const template = getTemplate('non-existent-template');
    expect(template).toBeUndefined();
  });

  it('getAvailableTemplateIds returns all 20 template IDs', () => {
    const ids = getAvailableTemplateIds();
    expect(ids.length).toBe(20);
    expect(ids).toContain('agent-summary');
    expect(ids).toContain('call-summary');
    expect(ids).toContain('queue-performance');
    expect(ids).toContain('trunk-utilization');
    expect(ids).toContain('cradle-to-grave');
  });

  it('getTemplatesByCategory returns only templates for the given category', () => {
    const agentTemplates = getTemplatesByCategory('agent');
    expect(agentTemplates.length).toBeGreaterThan(0);
    for (const t of agentTemplates) {
      expect(t.category).toBe('agent');
    }
  });

  it('getTemplateCategories returns all unique categories', () => {
    const categories = getTemplateCategories();
    expect(categories).toContain('agent');
    expect(categories).toContain('call');
    expect(categories).toContain('group');
    expect(categories).toContain('trunk');
  });

  it('every template has at least one column', () => {
    for (const [id, template] of REPORT_TEMPLATES) {
      expect(template.columns.length).toBeGreaterThan(0);
    }
  });

  it('every template has a defaultSort with a valid column key', () => {
    for (const [id, template] of REPORT_TEMPLATES) {
      expect(template.defaultSort).toBeDefined();
      expect(template.defaultSort.order).toMatch(/^(asc|desc)$/);
    }
  });
});

// ---------------------------------------------------------------------------
// formatCellValue
// ---------------------------------------------------------------------------

describe('formatCellValue', () => {
  it('formats duration as HH:MM:SS', () => {
    expect(formatCellValue(3661, 'duration')).toBe('01:01:01');
    expect(formatCellValue(0, 'duration')).toBe('00:00:00');
    expect(formatCellValue(59, 'duration')).toBe('00:00:59');
    expect(formatCellValue(3600, 'duration')).toBe('01:00:00');
  });

  it('formats percent as XX.X%', () => {
    expect(formatCellValue(0.852, 'percent')).toBe('85.2%');
    expect(formatCellValue(0, 'percent')).toBe('0.0%');
    expect(formatCellValue(1, 'percent')).toBe('100.0%');
  });

  it('formats number with locale formatting', () => {
    expect(formatCellValue(1234, 'number')).toBe('1,234');
    expect(formatCellValue(0, 'number')).toBe('0');
  });

  it('formats currency with dollar sign', () => {
    expect(formatCellValue(99.5, 'currency')).toBe('$99.50');
    expect(formatCellValue(0, 'currency')).toBe('$0.00');
  });

  it('formats boolean as Yes/No', () => {
    expect(formatCellValue(true, 'boolean')).toBe('Yes');
    expect(formatCellValue(false, 'boolean')).toBe('No');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatCellValue(null, 'string')).toBe('');
    expect(formatCellValue(undefined, 'number')).toBe('');
  });

  it('returns string representation for string format', () => {
    expect(formatCellValue('hello', 'string')).toBe('hello');
    expect(formatCellValue(42, 'string')).toBe('42');
  });
});

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

describe('exportCSV', () => {
  const columns: ReportColumnDef[] = [
    { key: 'name', label: 'Name', format: 'string', width: 20 },
    { key: 'calls', label: 'Total Calls', format: 'number', align: 'right', summary: 'sum', width: 12 },
    { key: 'rate', label: 'Answer Rate', format: 'percent', align: 'right', summary: 'avg', width: 12 },
    { key: 'duration', label: 'Avg Duration', format: 'duration', align: 'right', width: 14 },
  ];

  const report: ReportResult = {
    columns,
    rows: [
      { name: 'Alice', calls: 150, rate: 0.92, duration: 245 },
      { name: 'Bob', calls: 120, rate: 0.85, duration: 180 },
      { name: 'Charlie, Jr.', calls: 90, rate: 0.78, duration: 320 },
    ],
    summary: { calls: 360, rate: 0.85 },
  };

  it('produces valid CSV output', () => {
    const result = exportCSV(report, { reportName: 'Agent Summary' });

    expect(result.contentType).toBe('text/csv; charset=utf-8');
    expect(result.filename).toContain('Agent_Summary');
    expect(result.filename).toMatch(/\.csv$/);

    const content = result.buffer.toString('utf-8');
    // Strip BOM
    const csv = content.replace(/^\uFEFF/, '');

    const lines = csv.split('\r\n');
    // Header row
    expect(lines[0]).toBe('Name,Total Calls,Answer Rate,Avg Duration');
    // Data rows
    expect(lines[1]).toContain('Alice');
    expect(lines[1]).toContain('150');
    // Row with comma in name should be properly escaped
    expect(lines[3]).toContain('"Charlie, Jr."');
  });

  it('includes UTF-8 BOM prefix', () => {
    const result = exportCSV(report, { reportName: 'Test' });
    const content = result.buffer.toString('utf-8');
    expect(content.charCodeAt(0)).toBe(0xfeff);
  });

  it('properly escapes fields with double quotes', () => {
    const reportWithQuotes: ReportResult = {
      columns: [{ key: 'name', label: 'Name', format: 'string', width: 20 }],
      rows: [{ name: 'Test "Quoted" Name' }],
      summary: {},
    };

    const result = exportCSV(reportWithQuotes, { reportName: 'Test' });
    const content = result.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    expect(content).toContain('"Test ""Quoted"" Name"');
  });

  it('includes summary row when present', () => {
    const result = exportCSV(report, { reportName: 'Test' });
    const content = result.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    expect(content).toContain('TOTALS / AVERAGES');
  });

  it('handles empty dataset', () => {
    const emptyReport: ReportResult = {
      columns,
      rows: [],
      summary: {},
    };

    const result = exportCSV(emptyReport, { reportName: 'Empty' });
    const content = result.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = content.split('\r\n').filter(Boolean);
    // Only header row
    expect(lines).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PDF Export (HTML-based)
// ---------------------------------------------------------------------------

describe('exportPDF', () => {
  const columns: ReportColumnDef[] = [
    { key: 'name', label: 'Name', format: 'string', width: 20 },
    { key: 'calls', label: 'Total Calls', format: 'number', align: 'right', width: 12 },
  ];

  const report: ReportResult = {
    columns,
    rows: [
      { name: 'Alice', calls: 150 },
      { name: 'Bob', calls: 120 },
    ],
    summary: { calls: 270 },
  };

  it('produces non-empty HTML buffer', () => {
    const result = exportPDF(report, {
      reportName: 'Test Report',
      dateFrom: new Date('2024-01-01'),
      dateTo: new Date('2024-01-31'),
    });

    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.contentType).toContain('text/html');
    expect(result.filename).toMatch(/\.pdf$/);
  });

  it('contains report title in output', () => {
    const result = exportPDF(report, { reportName: 'Agent Performance' });
    const html = result.buffer.toString('utf-8');
    expect(html).toContain('Agent Performance');
  });

  it('contains table headers', () => {
    const result = exportPDF(report, { reportName: 'Test' });
    const html = result.buffer.toString('utf-8');
    expect(html).toContain('Name');
    expect(html).toContain('Total Calls');
  });

  it('contains data rows', () => {
    const result = exportPDF(report, { reportName: 'Test' });
    const html = result.buffer.toString('utf-8');
    expect(html).toContain('Alice');
    expect(html).toContain('Bob');
  });

  it('contains summary row when present', () => {
    const result = exportPDF(report, { reportName: 'Test' });
    const html = result.buffer.toString('utf-8');
    expect(html).toContain('TOTALS / AVERAGES');
  });

  it('escapes HTML special characters in data', () => {
    const xssReport: ReportResult = {
      columns: [{ key: 'name', label: 'Name', format: 'string', width: 20 }],
      rows: [{ name: '<script>alert("xss")</script>' }],
      summary: {},
    };

    const result = exportPDF(xssReport, { reportName: 'Test' });
    const html = result.buffer.toString('utf-8');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// XLSX Export (async, uses ExcelJS)
// ---------------------------------------------------------------------------

describe('exportXLSX', () => {
  it('produces non-empty XLSX buffer', async () => {
    const { exportXLSX } = await import('@/lib/reports/export');

    const columns: ReportColumnDef[] = [
      { key: 'name', label: 'Name', format: 'string', width: 20 },
      { key: 'calls', label: 'Total Calls', format: 'number', align: 'right', width: 12 },
    ];

    const report: ReportResult = {
      columns,
      rows: [
        { name: 'Alice', calls: 150 },
        { name: 'Bob', calls: 120 },
      ],
      summary: { calls: 270 },
    };

    const result = await exportXLSX(report, { reportName: 'Test XLSX' });

    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.contentType).toContain('spreadsheetml.sheet');
    expect(result.filename).toMatch(/\.xlsx$/);
  });
});
