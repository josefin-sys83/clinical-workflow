import { BadRequestException } from '@nestjs/common';
import { ValueType, Workbook } from 'exceljs';
import JSZip from 'jszip';
import { CreateResultDto } from './dto';
import { validateFigureBytes } from './figure-image';

const MAX_CELLS = 100000;

// Some standards-compliant generators prefix SpreadsheetML elements with `x:`.
// ExcelJS only recognises the same namespace when it is the default namespace.
async function normalizeSpreadsheetNamespace(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter(
    (name) => name.endsWith('.xml') && !zip.files[name].dir,
  );
  let changed = false;
  await Promise.all(
    names.map(async (name) => {
      const entry = zip.files[name];
      const xml = await entry.async('string');
      if (
        !xml.includes(
          'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
        )
      )
        return;
      changed = true;
      zip.file(
        name,
        xml
          .replace(
            'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
            'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
          )
          .replace(/<(\/?)x:/g, '<$1'),
      );
    }),
  );
  return changed
    ? Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }))
    : buffer;
}

// Preserve quoted commas, tabs, newlines, and escaped quotes from spreadsheet paste/CSV.
function parseRecords(text: string, delimiterOverride?: string) {
  if (!text.trim() || text.length > 2_000_000 || text.includes('\0'))
    throw new BadRequestException(
      'Provide table data up to 2 MB without null bytes',
    );
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const delimiter =
    delimiterOverride ?? (source.split('\n')[0].includes('\t') ? '\t' : ',');
  const records: string[][] = [];
  const ranges: { start: number; end: number }[] = [];
  let line = 1,
    start = 1;
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false,
    cells = 0;
  const endCell = () => {
    if (++cells > MAX_CELLS)
      throw new BadRequestException(
        'Table is too large; split it into smaller results',
      );
    row.push(cell);
    cell = '';
    closed = false;
  };
  const endRow = () => {
    endCell();
    if (row.some((value) => value.trim())) {
      records.push(row);
      ranges.push({ start, end: line });
    }
    row = [];
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else cell += char;
    } else if (char === delimiter) endCell();
    else if (char === '\n') endRow();
    else if (char === '"' && !cell && !closed) quoted = true;
    else {
      if (closed || char === '"')
        throw new BadRequestException('Invalid quoting in table data');
      cell += char;
    }
    if (char === '\n') {
      line++;
      if (!quoted) start = line;
    }
  }
  if (quoted) throw new BadRequestException('A quoted cell is not closed');
  endRow();
  if (records.length < 2)
    throw new BadRequestException('Include a header and at least one data row');
  const [headers, ...rows] = records;
  if (rows.some((record) => record.length !== headers.length))
    throw new BadRequestException(
      'Every row must have the same number of columns as the header',
    );
  return { headers, rows, ranges };
}

export function parseTable(text: string) {
  const { headers, rows } = parseRecords(text);
  return { headers, rows };
}

type Source = {
  filename: string;
  sheet?: string;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
};
export type ImportPreview = { drafts: CreateResultDto[]; issues: string[] };

function tableDraft(
  base: { title: string; sourceFilename: string },
  records: string[][],
  sources: Source[],
): CreateResultDto {
  const first = sources[0],
    last = sources[sources.length - 1];
  return {
    ...base,
    type: 'table',
    sourceLocation: `${first.sheet ? `Sheet: ${first.sheet}, ` : ''}rows ${first.rowStart}–${last.rowEnd}, columns ${first.columnStart}–${first.columnEnd}`,
    content: {
      headers: records[0],
      rows: records.slice(1),
      provenance: {
        header: [first],
        rows: sources.slice(1).map((source) => [source]),
      },
    },
  };
}

// Empty rows/columns are candidate boundaries, not semantic classification.
// Recurse after each cut to handle stacked and side-by-side table layouts.
function regions(
  grid: string[][],
  top: number,
  bottom: number,
  left: number,
  right: number,
): number[][] {
  const bands = (
    start: number,
    end: number,
    occupied: (n: number) => boolean,
  ) => {
    const found: number[][] = [];
    let first = -1;
    for (let n = start; n <= end + 1; n++) {
      if (n <= end && occupied(n)) {
        if (first < 0) first = n;
      } else if (first >= 0) {
        found.push([first, n - 1]);
        first = -1;
      }
    }
    return found;
  };
  const rowBands = bands(top, bottom, (r) =>
    grid[r].slice(left, right + 1).some((v) => v.trim()),
  );
  if (!rowBands.length) return [];
  if (
    rowBands.length > 1 ||
    rowBands[0][0] !== top ||
    rowBands[0][1] !== bottom
  )
    return rowBands.flatMap(([a, b]) => regions(grid, a, b, left, right));
  const colBands = bands(left, right, (c) =>
    grid.slice(top, bottom + 1).some((row) => row[c].trim()),
  );
  if (
    colBands.length > 1 ||
    colBands[0][0] !== left ||
    colBands[0][1] !== right
  )
    return colBands.flatMap(([a, b]) => regions(grid, top, bottom, a, b));
  return [[top, bottom, left, right]];
}

export async function previewResultFile(file: {
  originalname: string;
  buffer: Buffer;
}): Promise<ImportPreview> {
  if (!file?.buffer?.length)
    throw new BadRequestException('Choose a non-empty file');
  const filename = file.originalname.split(/[\\/]/).pop()!;
  const extension = filename.split('.').pop()?.toLowerCase();
  const base = {
    title: filename.replace(/\.[^.]+$/, ''),
    sourceFilename: filename,
  };
  try {
    if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
      const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
      validateFigureBytes(file.buffer, mime);
      return {
        drafts: [
          {
            ...base,
            type: 'figure',
            sourceLocation: 'Original figure image',
            content: {
              image: {
                dataUrl: `data:${mime};base64,${file.buffer.toString('base64')}`,
                alt: base.title,
                filename,
              },
            },
          },
        ],
        issues: [],
      };
    }
    if (extension === 'csv' || extension === 'tsv') {
      const { headers, rows, ranges } = parseRecords(
        file.buffer.toString('utf8'),
        extension === 'tsv' ? '\t' : ',',
      );
      const sources = ranges.map((range) => ({
        filename,
        rowStart: range.start,
        rowEnd: range.end,
        columnStart: 1,
        columnEnd: headers.length,
      }));
      return {
        drafts: [tableDraft(base, [headers, ...rows], sources)],
        issues: [],
      };
    }
    if (extension === 'xlsx') {
      const workbook = new Workbook();
      const workbookBuffer = await normalizeSpreadsheetNamespace(file.buffer);
      await workbook.xlsx.load(workbookBuffer as any);
      const drafts: CreateResultDto[] = [];
      const issues: string[] = [];
      let cells = 0;
      workbook.eachSheet((sheet) => {
        const width = sheet.columnCount;
        cells += width * sheet.rowCount;
        if (cells > MAX_CELLS)
          throw new BadRequestException(
            'Workbook is too large; split it into smaller files',
          );
        const invalidCells = new Set<string>();
        const grid = Array.from({ length: sheet.rowCount }, (_, r) =>
          Array.from({ length: width }, (_, c) => {
            const cell = sheet.getRow(r + 1).getCell(c + 1);
            if (
              (cell.formula && cell.result === undefined) ||
              cell.type === ValueType.Error
            ) {
              invalidCells.add(`${r}:${c}`);
              return cell.text || '#UNREADABLE';
            }
            return cell.text;
          }),
        );
        if (!width || !grid.length) return;
        for (const [top, bottom, left, right] of regions(
          grid,
          0,
          grid.length - 1,
          0,
          width - 1,
        )) {
          const location = `Sheet: ${sheet.name}, rows ${top + 1}–${bottom + 1}, columns ${left + 1}–${right + 1}`;
          const records = grid
            .slice(top, bottom + 1)
            .map((row) => row.slice(left, right + 1));
          if (top === bottom) {
            issues.push(
              `${location}: needs a header and at least one data row. Use manual entry for this region.`,
            );
            continue;
          }
          if (
            records.some((row, r) =>
              row.some((_, c) => invalidCells.has(`${top + r}:${left + c}`)),
            )
          ) {
            issues.push(
              `${location}: contains an Excel error or a formula without a saved value. Recalculate in Excel or enter this region manually.`,
            );
            continue;
          }
          const sources = records.map((_, r) => ({
            filename,
            sheet: sheet.name,
            rowStart: top + r + 1,
            rowEnd: top + r + 1,
            columnStart: left + 1,
            columnEnd: right + 1,
          }));
          drafts.push(
            tableDraft(
              {
                ...base,
                title: `${base.title} — ${sheet.name} (rows ${top + 1}–${bottom + 1})`,
              },
              records,
              sources,
            ),
          );
        }
      });
      if (!drafts.length && !issues.length)
        throw new BadRequestException(
          'No data found in workbook. Paste a table or build a result manually.',
        );
      return { drafts, issues };
    }
    let text = '';
    if (extension === 'docx')
      text = (await require('mammoth').extractRawText({ buffer: file.buffer }))
        .value;
    else if (extension === 'pdf')
      text = (await require('pdf-parse')(file.buffer)).text;
    else if (extension === 'txt') text = file.buffer.toString('utf8');
    else
      throw new BadRequestException(
        'Use CSV, TSV, XLSX, PDF, DOCX, TXT, PNG, or JPEG files',
      );
    if (!text.trim())
      throw new BadRequestException(
        'No readable text found. Paste the table or build the result manually.',
      );
    if (text.length > 2_000_000)
      throw new BadRequestException(
        'Extracted text is too large; split the file',
      );
    return {
      drafts: [
        {
          ...base,
          type: 'listing',
          sourceLocation: 'Extracted document text',
          content: { text },
        },
      ],
      issues: [],
    };
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(
      'This file could not be read. Try exporting it again or paste the table.',
    );
  }
}
