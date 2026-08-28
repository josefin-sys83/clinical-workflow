import { BadRequestException } from '@nestjs/common';
import contentDisposition from 'content-disposition';

export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const PROTOCOL_UPLOAD_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function extensionOf(filename: string): string {
  const match = /\.[^./\\]+$/.exec(filename || '');
  return match ? match[0].toLowerCase() : '';
}

// Multer fileFilter factory: rejects anything outside an explicit extension + MIME-type
// allowlist, rather than trusting the client-supplied mimetype/extension alone (either
// on its own can be spoofed by the uploader).
export function createDocumentFileFilter(allowedExtensions: string[], allowedMimeTypes: string[]) {
  return (_req: unknown, file: { originalname?: string; mimetype?: string }, callback: (error: Error | null, acceptFile: boolean) => void) => {
    const ext = extensionOf(file.originalname || '');
    if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype || '')) {
      callback(new BadRequestException(`Unsupported file type. Allowed file types: ${allowedExtensions.join(', ')}`), false);
      return;
    }
    callback(null, true);
  };
}

export const SYNOPSIS_UPLOAD_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
export const SYNOPSIS_UPLOAD_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const ADDENDUM_UPLOAD_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt'];
export const ADDENDUM_UPLOAD_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/plain',
];

// Kept separate from the addendum constants intentionally. The two features
// currently accept the same formats, but can evolve without changing each other.
export const PROTOCOL_UPLOAD_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.txt'];
export const PROTOCOL_UPLOAD_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/plain',
];

export const SYNOPSIS_UPLOAD_OPTIONS = {
  fileFilter: createDocumentFileFilter(SYNOPSIS_UPLOAD_ALLOWED_EXTENSIONS, SYNOPSIS_UPLOAD_ALLOWED_MIME_TYPES),
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
};

export const ADDENDUM_UPLOAD_OPTIONS = {
  fileFilter: createDocumentFileFilter(ADDENDUM_UPLOAD_ALLOWED_EXTENSIONS, ADDENDUM_UPLOAD_ALLOWED_MIME_TYPES),
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
};

export const PROTOCOL_UPLOAD_OPTIONS = {
  fileFilter: createDocumentFileFilter(PROTOCOL_UPLOAD_ALLOWED_EXTENSIONS, PROTOCOL_UPLOAD_ALLOWED_MIME_TYPES),
  limits: { fileSize: PROTOCOL_UPLOAD_MAX_FILE_SIZE_BYTES },
};

// Used when serving a previously-uploaded file back to the browser. Never trusts the
// stored/client-supplied mimetype for deciding how the browser should handle the response —
// only a real .pdf is ever served inline as application/pdf; everything else is forced to
// application/octet-stream + attachment so a script-bearing file can never be rendered as a
// page by the browser, regardless of what content-type it claims to be. The filename itself
// is passed through the `content-disposition` package, which RFC 6266-encodes it safely
// (rather than hand-interpolating it into the header, which allowed quote/parameter
// injection — see the synopsis-file endpoint fix).
export function getSafeDownloadHeaders(fileName: string): { contentType: string; contentDisposition: string } {
  const ext = extensionOf(fileName);
  const isPdf = ext === '.pdf';
  return {
    contentType: isPdf ? 'application/pdf' : 'application/octet-stream',
    contentDisposition: contentDisposition(fileName, { type: isPdf ? 'inline' : 'attachment' }),
  };
}
