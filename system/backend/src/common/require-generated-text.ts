import { InternalServerErrorException } from '@nestjs/common';
import { sanitizeSectionHtml } from './sanitize-section-html';


export function requireGeneratedText(value: unknown, title: string): string {
  const content = sanitizeSectionHtml(typeof value === 'string' ? value : '').trim();
  if (!content.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').trim()) {
    throw new InternalServerErrorException(`AI returned no text for "${title}". Please retry generation.`);
  }
  return content;
}
