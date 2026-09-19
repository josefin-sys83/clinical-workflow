import { BadRequestException } from '@nestjs/common';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../../common/upload-security';

export function validateFigureBytes(bytes: Buffer, mime: string) {
  const png =
    bytes.length >= 33 &&
    bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString('ascii', 12, 16) === 'IHDR';
  const jpeg =
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255 &&
    bytes[bytes.length - 2] === 255 &&
    bytes[bytes.length - 1] === 217;
  if (
    bytes.length > MAX_UPLOAD_FILE_SIZE_BYTES ||
    !(mime === 'image/png' ? png : mime === 'image/jpeg' && jpeg)
  )
    throw new BadRequestException(
      'Choose a valid PNG or JPEG figure up to 10 MB.',
    );
}

export function validateFigureContent(content: Record<string, unknown>) {
  if (!('image' in content)) return;
  const image = content.image as { dataUrl?: unknown; alt?: unknown } | null;
  if (
    !image ||
    typeof image.dataUrl !== 'string' ||
    image.dataUrl.length > 14_000_000
  )
    throw new BadRequestException(
      'Figure image must contain an embedded PNG or JPEG.',
    );
  const match =
    /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      image.dataUrl,
    );
  if (!match)
    throw new BadRequestException(
      'Figure image must contain an embedded PNG or JPEG.',
    );
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.toString('base64') !== match[2])
    throw new BadRequestException('Invalid figure image encoding.');
  validateFigureBytes(bytes, match[1]);
  if (
    image.alt !== undefined &&
    (typeof image.alt !== 'string' || image.alt.length > 2000)
  )
    throw new BadRequestException(
      'Figure alternative text must be at most 2000 characters.',
    );
}
