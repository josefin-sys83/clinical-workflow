import type { ResultInput } from '@/shared/api/results';

export type SourceCellRange = {
  filename: string;
  sheet?: string;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
};
type Provenance = { header: SourceCellRange[]; rows: SourceCellRange[][] };
export type ImportDraft = { key: string; input: ResultInput };

function table(input: ResultInput) {
  const { headers, rows, provenance } = input.content;
  if (
    !Array.isArray(headers) ||
    !Array.isArray(rows) ||
    !rows.every(Array.isArray)
  )
    throw new Error('Only tabular detections can be split or merged.');
  const sources = provenance as Provenance | undefined;
  if (!sources || sources.rows.length !== rows.length)
    throw new Error(
      'Source row information is missing. Upload this file again before splitting or merging.',
    );
  return { headers, rows: rows as unknown[][], sources };
}

// Collapse adjacent original ranges, preserving separate sheets/files and gaps.
export function sourceSummary(provenance: Provenance) {
  const groups = new Map<string, SourceCellRange[]>();
  for (const range of [...provenance.header, ...provenance.rows.flat()]) {
    const key = JSON.stringify([
      range.filename,
      range.sheet,
      range.columnStart,
      range.columnEnd,
    ]);
    const group = groups.get(key);
    if (group) group.push(range);
    else groups.set(key, [range]);
  }
  const descriptions: string[] = [];
  for (const ranges of groups.values()) {
    ranges.sort((a, b) => a.rowStart - b.rowStart);
    const compact: SourceCellRange[] = [];
    for (const range of ranges) {
      const last = compact[compact.length - 1];
      if (last && range.rowStart <= last.rowEnd + 1)
        last.rowEnd = Math.max(last.rowEnd, range.rowEnd);
      else compact.push({ ...range });
    }
    for (const range of compact)
      descriptions.push(
        `${range.filename}${range.sheet ? ` · Sheet: ${range.sheet}` : ''} · rows ${range.rowStart}–${range.rowEnd}, columns ${range.columnStart}–${range.columnEnd}`,
      );
  }
  return descriptions.join('; ');
}

function withTable(
  input: ResultInput,
  headers: unknown[],
  rows: unknown[][],
  provenance: Provenance,
): ResultInput {
  if ((rows.length + 1) * headers.length > 100000)
    throw new Error(
      'The combined table is too large. Keep these detections separate.',
    );
  const sourceFilename = [
    ...new Set(
      [...provenance.header, ...provenance.rows.flat()].map((r) => r.filename),
    ),
  ].join('; ');
  const sourceLocation = sourceSummary(provenance);
  if (sourceFilename.length > 1000 || sourceLocation.length > 2000)
    throw new Error(
      'Too many source ranges for one result. Keep these detections separate.',
    );
  return {
    ...input,
    sourceFilename,
    sourceLocation,
    content: { ...input.content, headers, rows, provenance },
  };
}

export function splitDraft(
  input: ResultInput,
  afterRows: number,
  useNextRowAsHeader: boolean,
): ResultInput[] {
  const { headers, rows, sources } = table(input);
  if (!Number.isInteger(afterRows) || afterRows < 1 || afterRows >= rows.length)
    throw new Error(
      'Choose a split after a data row, leaving data in both drafts.',
    );
  if (useNextRowAsHeader && afterRows >= rows.length - 1)
    throw new Error(
      'The second draft needs a header and at least one data row.',
    );
  const skip = useNextRowAsHeader ? 1 : 0;
  return [
    withTable(
      { ...input, title: `${input.title.slice(0, 990)} (1)` },
      headers,
      rows.slice(0, afterRows),
      { header: sources.header, rows: sources.rows.slice(0, afterRows) },
    ),
    withTable(
      { ...input, title: `${input.title.slice(0, 990)} (2)` },
      useNextRowAsHeader ? rows[afterRows] : headers,
      rows.slice(afterRows + skip),
      {
        header: useNextRowAsHeader ? sources.rows[afterRows] : sources.header,
        rows: sources.rows.slice(afterRows + skip),
      },
    ),
  ];
}

export function mergeDrafts(inputs: ResultInput[]): ResultInput {
  if (inputs.length < 2)
    throw new Error('Select at least two detections to merge.');
  const tables = inputs.map(table);
  const width = Math.max(...tables.map((t) => t.headers.length));
  const pad = (row: unknown[]) => [
    ...row,
    ...Array(Math.max(0, width - row.length)).fill(''),
  ];
  const headers = pad(tables[0].headers);
  const rows: unknown[][] = [];
  const provenance: Provenance = { header: [], rows: [] };
  for (const t of tables) {
    if (JSON.stringify(pad(t.headers)) === JSON.stringify(headers))
      provenance.header.push(...t.sources.header);
    else {
      rows.push(pad(t.headers));
      provenance.rows.push(t.sources.header);
    }
    for (let i = 0; i < t.rows.length; i++) {
      rows.push(pad(t.rows[i]));
      provenance.rows.push(t.sources.rows[i]);
    }
  }
  const description = [
    ...new Set(inputs.map((input) => input.description).filter(Boolean)),
  ].join('\n\n');
  if (description.length > 20000)
    throw new Error(
      'Combined descriptions are too long. Keep these detections separate.',
    );
  return withTable({ ...inputs[0], description }, headers, rows, provenance);
}
