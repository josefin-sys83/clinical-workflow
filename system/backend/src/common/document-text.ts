import { BadRequestException } from '@nestjs/common';

/** Shared PDF/DOCX extraction for synopsis, result intake, and supporting files. */
export async function extractDocumentText(buffer: Buffer, filename: string, mimeType = ''): Promise<string> {
  const extension = filename.toLowerCase().split('.').pop();
  let text: string;
  if (extension === 'docx' || extension === 'doc' || mimeType.includes('word')) {
    text = (await require('mammoth').extractRawText({ buffer })).value;
  } else if (extension === 'pdf' || mimeType === 'application/pdf') {
    text = (await require('pdf-parse')(buffer)).text;
  } else if (extension === 'txt' || mimeType === 'text/plain') {
    text = buffer.toString('utf8');
  } else {
    throw new BadRequestException('Text extraction is supported for PDF, DOCX, and text documents.');
  }
  if (text.length > 2_000_000) throw new BadRequestException('Extracted text is too large; split the file.');
  if (!text.trim()) throw new BadRequestException('No readable text was found in this document.');
  return text;
}
