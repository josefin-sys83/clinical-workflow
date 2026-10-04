import { ValueType, Workbook } from 'exceljs';
import { extractDocumentText, normalizeSpreadsheetNamespace } from './result-intake';
import type { ResultSuggestion } from './dto';

export type TflContext = {
  documents: { id: string; filename: string; text: string }[];
  limitation: string | null;
};
export type TflEvidence = { documentId: string; quote: string };
export type AiResultSuggestion = Omit<ResultSuggestion, 'placementBasisLabel'> & {
  tflEvidence?: TflEvidence[];
};

async function extractTflPdf(bytes: Buffer): Promise<string> {
  let readablePages = 0;
  // pdf-parse can swallow page errors. Count successfully read pages before using a mapping.
  // A Uint8Array also avoids Buffer.slice view semantics in its bundled PDF reader.
  const result = await require('pdf-parse')(new Uint8Array(bytes), {
    pagerender: async (page: any) => {
      const content = await page.getTextContent({ normalizeWhitespace: false });
      let lastY: number | undefined;
      let text = '';
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        if (text) text += lastY === item.transform[5] ? '\t' : '\n';
        text += item.str;
        lastY = item.transform[5];
      }
      if (text.trim()) readablePages++;
      return text;
    },
  });
  if (readablePages !== result.numpages) throw new Error('Not every TFL PDF page has readable text.');
  return result.text;
}

// Keep the complete mapping, including notes and single rows; result intake splits tables.
export async function extractTflText(filename: string, bytes: Buffer): Promise<string> {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension || !['pdf', 'docx', 'xlsx', 'txt'].includes(extension))
    throw new Error('Unsupported TFL format. Use text-based PDF, DOCX, XLSX or TXT.');
  let text: string;
  if (extension === 'xlsx') {
    const workbook = new Workbook();
    await workbook.xlsx.load(await normalizeSpreadsheetNamespace(bytes) as any);
    const lines: string[] = [];
    let cells = 0;
    workbook.eachSheet(sheet => {
      cells += sheet.rowCount * sheet.columnCount;
      if (cells > 100000) throw new Error('TFL workbook is too large.');
      lines.push(`Sheet: ${sheet.name}`);
      sheet.eachRow((row, number) => {
        const values = Array.from({ length: sheet.columnCount }, (_, index) => {
          const cell = row.getCell(index + 1);
          if ((cell.formula && cell.result === undefined) || cell.type === ValueType.Error)
            throw new Error('TFL contains an Excel error or a formula without a saved value.');
          return cell.text;
        });
        if (values.some(value => value.trim())) lines.push(`Row ${number}: ${values.join('\t')}`);
      });
    });
    if (!lines.some(line => line.startsWith('Row '))) throw new Error('TFL has no readable cells.');
    text = lines.join('\n');
  } else if (extension === 'pdf') {
    text = await extractTflPdf(bytes);
  } else {
    text = extension === 'txt'
      ? new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      : await extractDocumentText(extension, bytes);
  }
  if (!text.trim() || text.includes('\0')) throw new Error('TFL has no usable text.');
  if (text.length > 60000) throw new Error('TFL text is too large for AI suggestions.');
  return text;
}

// Labels are assigned by the server, never by the client or the language model.
export function withPlacementBasis(suggestion: AiResultSuggestion, tfl: TflContext | null): ResultSuggestion {
  const { tflEvidence = [], ...result } = suggestion;
  if (!tfl) return { ...result, placementBasisLabel: 'no TFL, based on content' };
  const supported = !tfl.limitation && result.reportSectionKey !== null && tflEvidence.length > 0 &&
    tflEvidence.every(evidence => evidence.quote.trim().length > 0 &&
      tfl.documents.some(document => document.id === evidence.documentId && document.text.includes(evidence.quote)));
  if (supported) return { ...result, placementBasisLabel: 'Using TFL mapping' };
  const limitation = tfl.limitation || (result.reportSectionKey === null ? result.limitation : null) ||
    'The attached TFL does not provide a verifiable mapping for this entire result. Select a section manually.';
  return { ...result, reportSectionKey: null, alternativeSectionKeys: [],
    limitation, placementBasisLabel: null };
}
