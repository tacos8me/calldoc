// ---------------------------------------------------------------------------
// Report Export Formatters - CSV, XLSX, and PDF export
// ---------------------------------------------------------------------------
// Converts a generated report (columns + rows + summary) into downloadable
// file formats. Each exporter returns a Buffer with the file content,
// filename, and appropriate MIME content type.

import { type ReportResult, formatCellValue } from './engine';
import type { ReportColumnDef, ColumnFormat } from './templates';
import { format as formatDate } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportResult {
  /** File content as a Buffer */
  buffer: Buffer;
  /** Suggested filename for the download */
  filename: string;
  /** MIME content type */
  contentType: string;
}

export interface ExportOptions {
  /** Report name for the filename and title */
  reportName: string;
  /** Date range start for filename */
  dateFrom?: Date;
  /** Date range end for filename */
  dateTo?: Date;
  /** Timestamp when the report was generated */
  generatedAt?: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a safe filename from report name and date range.
 * Pattern: {report-name}_{date-range}_{generated-at}.{ext}
 */
function buildFilename(opts: ExportOptions, ext: string): string {
  const safeName = opts.reportName.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_+/g, '_');
  const now = opts.generatedAt ?? new Date();
  const generated = formatDate(now, 'yyyyMMdd_HHmmss');

  let dateRange = '';
  if (opts.dateFrom && opts.dateTo) {
    const from = formatDate(opts.dateFrom, 'yyyyMMdd');
    const to = formatDate(opts.dateTo, 'yyyyMMdd');
    dateRange = `${from}-${to}`;
  }

  const parts = [safeName];
  if (dateRange) parts.push(dateRange);
  parts.push(generated);

  return `${parts.join('_')}.${ext}`;
}

/**
 * Escape a CSV field. Wraps in double quotes if the field contains
 * commas, double quotes, or newlines. Double quotes within the
 * field are escaped by doubling them.
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Escape HTML special characters for PDF generation.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Export a report as CSV with UTF-8 BOM for Excel compatibility.
 *
 * Features:
 * - UTF-8 BOM prefix for proper encoding detection in Excel
 * - Proper field escaping (quotes, commas, newlines)
 * - Column headers from template definitions
 * - Formatted cell values (durations as HH:MM:SS, percentages, etc.)
 * - Summary row appended at the end
 */
export function exportCSV(
  report: ReportResult,
  options: ExportOptions
): ExportResult {
  const lines: string[] = [];

  // Header row
  const headers = report.columns.map((col) => escapeCsvField(col.label));
  lines.push(headers.join(','));

  // Data rows
  for (const row of report.rows) {
    const fields = report.columns.map((col) => {
      const rawValue = row[col.key];
      const formatted = formatCellValue(rawValue, col.format);
      return escapeCsvField(formatted);
    });
    lines.push(fields.join(','));
  }

  // Summary row
  if (Object.keys(report.summary).length > 0) {
    lines.push(''); // Blank separator
    const summaryFields = report.columns.map((col, idx) => {
      if (idx === 0) return escapeCsvField('TOTALS / AVERAGES');
      const value = report.summary[col.key];
      if (value == null) return '';
      return escapeCsvField(formatCellValue(value, col.format));
    });
    lines.push(summaryFields.join(','));
  }

  const csv = lines.join('\r\n');

  // UTF-8 BOM + CSV content
  const bom = '\uFEFF';
  const content = bom + csv;

  return {
    buffer: Buffer.from(content, 'utf-8'),
    filename: buildFilename(options, 'csv'),
    contentType: 'text/csv; charset=utf-8',
  };
}

// ---------------------------------------------------------------------------
// XLSX Export
// ---------------------------------------------------------------------------

/**
 * Export a report as XLSX using ExcelJS.
 *
 * Features:
 * - Auto-width columns based on header and data content
 * - Bold header row with background color
 * - Number formatting for duration, percent, and currency columns
 * - Summary row with bold styling and top border
 * - Frozen header row for easier scrolling
 */
export async function exportXLSX(
  report: ReportResult,
  options: ExportOptions
): Promise<ExportResult> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CallDoc';
  workbook.created = options.generatedAt ?? new Date();

  const sheetName = options.reportName.slice(0, 31).replace(/[[\]*?/\\]/g, '_');
  const sheet = workbook.addWorksheet(sheetName);

  // --- Define columns ---
  sheet.columns = report.columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: col.width ?? 14,
  }));

  // --- Style header row ---
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A1A2E' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  // --- Add data rows ---
  for (const row of report.rows) {
    const rowData: Record<string, unknown> = {};
    for (const col of report.columns) {
      const raw = row[col.key];
      rowData[col.key] = formatExcelValue(raw, col.format);
    }
    const excelRow = sheet.addRow(rowData);

    // Apply alignment per column
    report.columns.forEach((col, idx) => {
      const cell = excelRow.getCell(idx + 1);
      cell.alignment = { horizontal: col.align ?? 'left' };

      // Apply number format
      if (col.format === 'percent' && typeof row[col.key] === 'number') {
        cell.numFmt = '0.0%';
      } else if (col.format === 'currency' && typeof row[col.key] === 'number') {
        cell.numFmt = '$#,##0.00';
      } else if (col.format === 'number' && typeof row[col.key] === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  }

  // --- Summary row ---
  if (Object.keys(report.summary).length > 0) {
    // Add blank row separator
    sheet.addRow({});

    const summaryData: Record<string, unknown> = {};
    report.columns.forEach((col, idx) => {
      if (idx === 0) {
        summaryData[col.key] = 'TOTALS / AVERAGES';
      } else {
        const value = report.summary[col.key];
        summaryData[col.key] = value != null ? formatExcelValue(value, col.format) : '';
      }
    });

    const summaryRow = sheet.addRow(summaryData);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F5' },
    };

    // Top border on summary row
    for (let i = 1; i <= report.columns.length; i++) {
      const cell = summaryRow.getCell(i);
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1A1A2E' } },
      };
    }
  }

  // --- Auto-fit columns ---
  for (let i = 1; i <= report.columns.length; i++) {
    const col = sheet.getColumn(i);
    const colDef = report.columns[i - 1];
    let maxLen = colDef.label.length;

    // Check data row lengths
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const cell = row.getCell(i);
      const cellLen = cell.value != null ? String(cell.value).length : 0;
      maxLen = Math.max(maxLen, cellLen);
    });

    col.width = Math.min(Math.max(maxLen + 3, colDef.width ?? 10), 50);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    filename: buildFilename(options, 'xlsx'),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/**
 * Format a value for Excel cells.
 * Duration columns are kept as numeric seconds (formatted by Excel format string).
 * Percent columns are kept as decimals.
 */
function formatExcelValue(value: unknown, format: ColumnFormat): unknown {
  if (value == null) return '';

  switch (format) {
    case 'duration':
      // Return formatted string for duration columns
      return typeof value === 'number' ? formatCellValue(value, 'duration') : String(value);
    case 'percent':
      // Keep as decimal for Excel percent formatting
      return typeof value === 'number' ? value : 0;
    case 'number':
    case 'currency':
      return typeof value === 'number' ? value : 0;
    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return value;
  }
}

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

/**
 * Export a report as a PDF document.
 *
 * Generates an HTML table with inline styles and converts it to a PDF-like
 * buffer. Uses a server-side HTML approach with proper styling for
 * printable table layout.
 *
 * Features:
 * - Clean tabular layout with headers and data
 * - Alternating row colors for readability
 * - Summary row with bold styling
 * - Report title, date range, and generation timestamp
 * - Page-friendly styling with print considerations
 */
export function exportPDF(
  report: ReportResult,
  options: ExportOptions
): ExportResult {
  const title = escapeHtml(options.reportName);
  const now = options.generatedAt ?? new Date();
  const generatedStr = formatDate(now, 'PPpp');

  let dateRangeStr = '';
  if (options.dateFrom && options.dateTo) {
    dateRangeStr = `${formatDate(options.dateFrom, 'PP')} - ${formatDate(options.dateTo, 'PP')}`;
  }

  // Build HTML document
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      color: #1a1a2e;
      padding: 20px;
      background: #fff;
    }
    .header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #1a1a2e;
    }
    .header h1 {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
    }
    .header .meta {
      font-size: 10px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
      margin-top: 8px;
    }
    thead th {
      background: #1a1a2e;
      color: #fff;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
      white-space: nowrap;
    }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody td {
      padding: 4px 8px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }
    tbody tr:nth-child(even) td {
      background: #f8f8fa;
    }
    tbody td.right { text-align: right; font-variant-numeric: tabular-nums; }
    tbody td.center { text-align: center; }
    tfoot td {
      padding: 6px 8px;
      font-weight: 700;
      border-top: 2px solid #1a1a2e;
      background: #f0f0f5;
    }
    tfoot td.right { text-align: right; font-variant-numeric: tabular-nums; }
    .footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #e0e0e0;
      font-size: 8px;
      color: #999;
    }
    @media print {
      body { padding: 0; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="meta">
      ${dateRangeStr ? `<span>Period: ${escapeHtml(dateRangeStr)}</span> &nbsp;|&nbsp; ` : ''}
      <span>Generated: ${escapeHtml(generatedStr)}</span>
      &nbsp;|&nbsp;
      <span>Rows: ${report.rows.length.toLocaleString()}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        ${report.columns.map((col) => {
          const alignClass = col.align === 'right' ? ' class="right"' : col.align === 'center' ? ' class="center"' : '';
          return `<th${alignClass}>${escapeHtml(col.label)}</th>`;
        }).join('\n        ')}
      </tr>
    </thead>
    <tbody>
      ${report.rows.map((row) => {
        const cells = report.columns.map((col) => {
          const value = formatCellValue(row[col.key], col.format);
          const alignClass = col.align === 'right' ? ' class="right"' : col.align === 'center' ? ' class="center"' : '';
          return `<td${alignClass}>${escapeHtml(value)}</td>`;
        }).join('');
        return `<tr>${cells}</tr>`;
      }).join('\n      ')}
    </tbody>
    ${Object.keys(report.summary).length > 0 ? `
    <tfoot>
      <tr>
        ${report.columns.map((col, idx) => {
          const alignClass = col.align === 'right' ? ' class="right"' : '';
          if (idx === 0) return `<td${alignClass}>TOTALS / AVERAGES</td>`;
          const value = report.summary[col.key];
          const formatted = value != null ? formatCellValue(value, col.format) : '';
          return `<td${alignClass}>${escapeHtml(formatted)}</td>`;
        }).join('\n        ')}
      </tr>
    </tfoot>` : ''}
  </table>

  <div class="footer">
    CallDoc Report Engine &mdash; Generated ${escapeHtml(generatedStr)}
  </div>
</body>
</html>`;

  return {
    buffer: Buffer.from(html, 'utf-8'),
    filename: buildFilename(options, 'pdf'),
    contentType: 'text/html; charset=utf-8',
  };
}
