import { registerDecorator, ValidationOptions } from 'class-validator';

// Postgres text/jsonb columns cannot store a literal null byte at all — writing one
// previously reached the database and surfaced as an unhandled 500. This rejects it up front
// with a clean 400 instead, recursing into arrays/objects so it also covers the open-ended
// `data` project blob (protocol/report sections, synopsis, scope, etc.), not just flat string
// fields. Built via fromCharCode rather than a literal escape to avoid an actual null byte
// sitting in this source file.
const NULL_BYTE = String.fromCharCode(0);

function hasNullByte(value: unknown): boolean {
  if (typeof value === 'string') return value.indexOf(NULL_BYTE) !== -1;
  if (Array.isArray(value)) return value.some(hasNullByte);
  if (value && typeof value === 'object') return Object.values(value).some(hasNullByte);
  return false;
}

export function NoNullBytes(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noNullBytes',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return !hasNullByte(value);
        },
        defaultMessage() {
          return `${propertyName} must not contain null byte characters`;
        },
      },
    });
  };
}
