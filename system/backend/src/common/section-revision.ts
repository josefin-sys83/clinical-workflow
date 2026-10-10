import { BadRequestException, ConflictException } from '@nestjs/common';

export type SectionSnapshot = { content: string; revision: number; updated_at?: Date | string };

/** Call while holding the owning project's write lock, before writing any content. */
export function assertSectionRevision(sectionId: string, expected: unknown, current?: SectionSnapshot) {
  if (!Number.isInteger(expected) || (expected as number) < 0) {
    throw new BadRequestException('A non-negative expectedRevision is required when saving section content.');
  }
  if (expected !== (current?.revision ?? 0)) {
    throw new ConflictException({
      statusCode: 409,
      code: 'SECTION_REVISION_CONFLICT',
      message: 'This section has changed since you opened it. Your changes have been kept.',
      sectionId,
      expectedRevision: expected,
      current: current ? {
        content: current.content,
        revision: current.revision,
        updatedAt: current.updated_at instanceof Date ? current.updated_at.toISOString() : current.updated_at,
      } : null,
    });
  }
}
