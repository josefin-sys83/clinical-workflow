import { Workbook } from 'exceljs';
import JSZip from 'jszip';
import { parseTable, previewResultFile } from './result-intake';

describe('result intake', () => {
  it('preserves quoted CSV cells, escaped quotes, multiline values, and zeroes', () => {
    expect(
      parseTable(
        '\uFEFFGroup,N,Note\r\n"Treatment, A",0,"He said ""yes""\nnext line"\r\n',
      ),
    ).toEqual({
      headers: ['Group', 'N', 'Note'],
      rows: [['Treatment, A', '0', 'He said "yes"\nnext line']],
    });
  });
  it('accepts spreadsheet paste and preserves empty cells', () => {
    expect(parseTable('Group\tN\tNote\nA\t42\t\n')).toEqual({
      headers: ['Group', 'N', 'Note'],
      rows: [['A', '42', '']],
    });
  });
  it.each([
    '',
    'A,B',
    'A,B\n1',
    'A,B\n"unclosed,2',
    'A,B\n"a"x,2',
    'A,B\n1,\0',
  ])('rejects invalid input %p', (value) => {
    expect(() => parseTable(value)).toThrow();
  });
  it('creates one draft per nonempty worksheet with source names and formula results', async () => {
    const workbook = new Workbook();
    const first = workbook.addWorksheet('Population');
    first.addRow(['Group', 'N']);
    first.addRow(['A', 42]);
    const second = workbook.addWorksheet('Safety');
    second.addRow(['Event', 'N']);
    second.addRow(['Headache', { formula: '2+3', result: 5 }]);
    workbook.addWorksheet('Empty');
    const { drafts } = await previewResultFile({
      originalname: 'analysis.xlsx',
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    });
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      type: 'table',
      sourceFilename: 'analysis.xlsx',
      sourceLocation: 'Sheet: Population, rows 1–2, columns 1–2',
      content: { rows: [['A', '42']] },
    });
    expect(drafts[1].content.rows).toEqual([['Headache', '5']]);
  });
  it('reads workbooks that use an explicit SpreadsheetML namespace prefix', async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('T14.1');
    sheet.addRows([
      ['Group', 'N'],
      ['Safety population', 100],
    ]);
    const zip = await JSZip.loadAsync(await workbook.xlsx.writeBuffer());
    const names = Object.keys(zip.files).filter((name) =>
      name.endsWith('.xml'),
    );
    await Promise.all(
      names.map(async (name) => {
        const xml = await zip.files[name].async('string');
        if (
          !xml.includes(
            'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
          )
        )
          return;
        zip.file(
          name,
          xml
            .replace(
              'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
              'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
            )
            .replace(/<(\/?)(?=[A-Za-z])/g, '<$1x:'),
        );
      }),
    );
    const { drafts } = await previewResultFile({
      originalname: 'prefixed.xlsx',
      buffer: Buffer.from(await zip.generateAsync({ type: 'nodebuffer' })),
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].content).toMatchObject({
      headers: ['Group', 'N'],
      rows: [['Safety population', '100']],
    });
  });
  it('does not silently drop a worksheet with incomplete tabular data', async () => {
    const workbook = new Workbook();
    workbook.addWorksheet('Incomplete').addRow(['Only header']);
    const preview = await previewResultFile({
      originalname: 'analysis.xlsx',
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
    });
    expect(preview.drafts).toEqual([]);
    expect(preview.issues[0]).toContain('needs a header');
  });
  it('returns text as a listing without executing it or asserting AI provenance', async () => {
    const { drafts } = await previewResultFile({
      originalname: 'output.txt',
      buffer: Buffer.from('<script>alert(1)</script>'),
    });
    expect(drafts[0]).toEqual({
      type: 'listing',
      title: 'output',
      sourceFilename: 'output.txt',
      sourceLocation: 'Extracted document text',
      content: { text: '<script>alert(1)</script>' },
    });
  });
  it('detects stacked and side-by-side regions and preserves their coordinates', async () => {
    const wb = new Workbook();
    const sheet = wb.addWorksheet('Mixed');
    sheet.getRow(3).values = ['Group', 'N', null, 'Event', 'N'];
    sheet.getRow(4).values = ['A', 0, null, 'Headache', 2];
    sheet.getRow(7).values = ['Measure', 'Value'];
    sheet.getRow(8).values = ['RR', 99];
    const preview = await previewResultFile({
      originalname: 'mixed.xlsx',
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    });
    expect(preview.issues).toEqual([]);
    expect(preview.drafts).toHaveLength(3);
    expect(preview.drafts.map((d) => d.sourceLocation)).toEqual([
      'Sheet: Mixed, rows 3–4, columns 1–2',
      'Sheet: Mixed, rows 3–4, columns 4–5',
      'Sheet: Mixed, rows 7–8, columns 1–2',
    ]);
    expect(preview.drafts[0].content.rows).toEqual([['A', '0']]);
    expect(preview.drafts[1].content.provenance).toMatchObject({
      header: [
        {
          filename: 'mixed.xlsx',
          sheet: 'Mixed',
          rowStart: 3,
          rowEnd: 3,
          columnStart: 4,
          columnEnd: 5,
        },
      ],
      rows: [[{ rowStart: 4, rowEnd: 4 }]],
    });
  });

  it('keeps readable tables and flags formula errors and incomplete regions', async () => {
    const wb = new Workbook();
    const sheet = wb.addWorksheet('Mixed');
    sheet.addRows([
      ['Group', 'N'],
      ['A', 1],
      [],
      ['Value'],
      [{ formula: '1+1' }],
      [],
      ['Note only'],
    ]);
    const preview = await previewResultFile({
      originalname: 'mixed.xlsx',
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    });
    expect(preview.drafts).toHaveLength(1);
    expect(preview.issues).toHaveLength(2);
    expect(preview.issues[0]).toContain('rows 4–5');
    expect(preview.issues[0]).toContain('formula without a saved value');
    expect(preview.issues[1]).toContain('rows 7–7');
  });

  it('records physical CSV lines including multiline cells and skipped blank lines', async () => {
    const preview = await previewResultFile({
      originalname: 'quoted.csv',
      buffer: Buffer.from('Group,Note\nA,"first\nsecond"\n\nB,end\n'),
    });
    const draft = preview.drafts[0];
    expect(draft.sourceLocation).toBe('rows 1–5, columns 1–2');
    expect(draft.content.rows).toEqual([
      ['A', 'first\nsecond'],
      ['B', 'end'],
    ]);
    expect(draft.content.provenance).toMatchObject({
      header: [{ rowStart: 1, rowEnd: 1 }],
      rows: [[{ rowStart: 2, rowEnd: 3 }], [{ rowStart: 5, rowEnd: 5 }]],
    });
  });

  it('reports corrupt workbooks as parse failures', async () => {
    await expect(
      previewResultFile({
        originalname: 'broken.xlsx',
        buffer: Buffer.from('not a workbook'),
      }),
    ).rejects.toThrow('could not be read');
  });
});
