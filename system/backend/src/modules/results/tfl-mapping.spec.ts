import 'reflect-metadata';
import { Workbook } from 'exceljs';
import JSZip from 'jszip';
import PDFDocument from 'pdfkit';
import { extractTflText, withPlacementBasis } from './tfl-mapping';
import { ResultsService } from './results.service';
import { AuditService } from '../audit/audit.service';
import { getPool } from '../../db/pg';

jest.mock('../../db/pg', () => ({ getPool: jest.fn() }));

const mapping = 'Table 14.2.1. Delivered-volume accuracy -> Clinical Performance Results';
const document = { id: 'owned-tfl', filename: 'synthetic-tfl.txt', text: mapping };
const suggestion = { title: 'Synthetic volume accuracy', description: 'Synthetic results.',
  reportSectionKey: 'performance', limitation: null, alternativeSectionKeys: [] };

describe('TFL extraction', () => {
  it('reads complete UTF-8 text, including notes', async () => {
    const text = `${mapping}\nSynthetic software-test mapping only.\nÅäö`;
    expect(await extractTflText('TFL.TXT', Buffer.from(text))).toBe(text);
  });

  it('reads real DOCX text without parsing it as result objects', async () => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${mapping.replace('>', '&gt;')}</w:t></w:r></w:p></w:body></w:document>`);
    const text = await extractTflText('tfl.docx', await zip.generateAsync({ type: 'nodebuffer' }));
    expect(text).toContain(mapping);
  });

  it('reads a text-based PDF', async () => {
    const pdf = new PDFDocument({ compress: false });
    const bytes = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdf.on('data', chunk => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);
    });
    pdf.text(mapping);
    pdf.end();
    expect(await extractTflText('tfl.pdf', await bytes)).toContain(mapping);
  });

  it('rejects partial PDF extraction when another page has no readable text', async () => {
    const pdf = new PDFDocument();
    const bytes = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdf.on('data', chunk => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);
    });
    pdf.text(mapping);
    pdf.addPage();
    pdf.rect(20, 20, 100, 100).fill();
    pdf.end();
    await expect(extractTflText('partial.pdf', await bytes)).rejects.toThrow('Not every TFL PDF page');
  });

  it('preserves all sheets, row positions, single-row notes and merged values in XLSX', async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Performance');
    sheet.addRow(['Synthetic test mapping']);
    sheet.getCell('A3').value = 'Table 14.2.1';
    sheet.getCell('B3').value = 'Clinical Performance Results';
    sheet.mergeCells('B3:C3');
    workbook.addWorksheet('Safety').addRow(['Listing 16.2.1', 'Safety Analysis']);
    const text = await extractTflText('tfl.xlsx', Buffer.from(await workbook.xlsx.writeBuffer()));
    expect(text).toContain('Sheet: Performance\nRow 1: Synthetic test mapping');
    expect(text).toContain('Row 3: Table 14.2.1\tClinical Performance Results');
    expect(text).toContain('Sheet: Safety\nRow 1: Listing 16.2.1\tSafety Analysis');
  });

  it.each([['legacy.doc', 'text'], ['legacy.xls', 'text'], ['scan.png', 'image'],
    ['broken.pdf', 'broken'], ['broken.docx', 'broken'], ['broken.xlsx', 'broken'],
    ['empty.txt', '  '], ['null.txt', 'a\0b'], ['large.txt', 'x'.repeat(60001)],
  ])('rejects unusable attachment %s', async (filename, content) => {
    await expect(extractTflText(filename, Buffer.from(content))).rejects.toThrow();
  });

  it('rejects invalid UTF-8 rather than replacing source characters', async () => {
    await expect(extractTflText('tfl.txt', Buffer.from([0xff, 0xfe, 0x41]))).rejects.toThrow();
  });

  it.each([{ formula: '1+1' }, { error: '#REF!' }])('rejects unreadable spreadsheet cells', async value => {
    const workbook = new Workbook();
    workbook.addWorksheet('Mapping').addRow(['Table 14.2.1', value]);
    await expect(extractTflText('tfl.xlsx', Buffer.from(await workbook.xlsx.writeBuffer()))).rejects.toThrow();
  });
});

describe('placement labels', () => {
  it('labels content inference only when no TFL is attached', () => {
    expect(withPlacementBasis(suggestion, null)).toEqual({ ...suggestion, placementBasisLabel: 'no TFL, based on content' });
  });

  it('labels mapped placement and keeps internal quotes out of the UI response', () => {
    expect(withPlacementBasis({ ...suggestion, tflEvidence: [{ documentId: document.id, quote: mapping }] },
      { documents: [document], limitation: null })).toEqual({ ...suggestion, placementBasisLabel: 'Using TFL mapping' });
  });

  it.each([{ tflEvidence: [] }, { tflEvidence: [{ documentId: 'foreign', quote: mapping }] },
    { tflEvidence: [{ documentId: document.id, quote: 'invented' }] }])(
    'does not label unverified evidence %p as TFL usage', ({ tflEvidence }) => {
      expect(withPlacementBasis({ ...suggestion, tflEvidence }, { documents: [document], limitation: null }))
        .toMatchObject({ reportSectionKey: null, placementBasisLabel: null, alternativeSectionKeys: [] });
    });

  it('keeps mapping conflict explanations and never falls back to content', () => {
    const result = withPlacementBasis({ ...suggestion, reportSectionKey: null, limitation: 'Conflicting TFL entries.' },
      { documents: [document], limitation: null });
    expect(result.limitation).toBe('Conflicting TFL entries.');
    expect(result.placementBasisLabel).toBeNull();
  });
});

describe('project-owned TFL access', () => {
  const query = jest.fn();
  const service = new ResultsService({ record: jest.fn() } as unknown as AuditService);
  beforeEach(() => {
    query.mockReset();
    (getPool as jest.Mock).mockReturnValue({ query });
  });

  it('scopes metadata to project and type and reads every document through project access', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'one', filename: 'one.txt' }, { id: 'two', filename: 'two.txt' }] });
    query.mockResolvedValue({ rows: [{ filename: 'tfl.txt', bytes: Buffer.from(mapping) }] });
    const context = await service.tflContext('project');
    expect(query.mock.calls[0]).toEqual([expect.stringMatching(/where project_id=\$1 and type='tfl'/), ['project']]);
    expect(query.mock.calls[1]).toEqual([expect.stringContaining('id=$1 and project_id=$2'), ['one', 'project']]);
    expect(query.mock.calls[2][1]).toEqual(['two', 'project']);
    expect(context?.documents.map(doc => doc.id)).toEqual(['one', 'two']);
  });

  it('returns absence only when no TFL exists', async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await service.tflContext('project')).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not truncate an oversized collection of otherwise readable TFL files', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'one', filename: 'one.txt' }, { id: 'two', filename: 'two.txt' }] });
    query.mockResolvedValue({ rows: [{ bytes: Buffer.from('x'.repeat(31000)) }] });
    expect(await service.tflContext('project')).toEqual({ documents: [], limitation: expect.stringContaining('too large') });
  });

  it('withholds all mapping text if even one document is unreadable', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'one', filename: 'one.txt' }, { id: 'two', filename: 'two.pdf' }] });
    query.mockResolvedValueOnce({ rows: [{ bytes: Buffer.from(mapping) }] });
    query.mockResolvedValueOnce({ rows: [{ bytes: Buffer.from('not PDF') }] });
    expect(await service.tflContext('project')).toEqual({ documents: [], limitation: expect.stringContaining('two.pdf') });
  });

  it('does not call a deleted or inaccessible document absence of TFL', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'gone', filename: 'gone.txt' }] });
    query.mockResolvedValueOnce({ rows: [] });
    expect(await service.tflContext('project')).toEqual({ documents: [], limitation: expect.stringContaining('gone.txt') });
  });
});
