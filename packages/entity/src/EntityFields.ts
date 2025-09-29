import {
  EntityFieldDefinition,
  EntityFieldDefinitionOptions,
  EntityFieldDefinitionOptionsExplicitCache,
} from './EntityFieldDefinition';

// Use our own regex since the `uuid` package doesn't support validating UUIDv6/7/8 yet
const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

/**
 * EntityFieldDefinition for a column with a JS string type.
 */
export class StringField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  string,
  TRequireExplicitCache
> {
  protected override validateNormalizedInputValueInternal(value: string): boolean {
    return typeof value === 'string';
  }

  protected override normalizeInputValueInternal(value: string): string {
    return value;
  }
}

/**
 * EntityFieldDefinition for a column with a JS string type.
 * Enforces that the string is a valid UUID.
 */
export class UUIDField<
  TRequireExplicitCache extends boolean,
> extends StringField<TRequireExplicitCache> {
  protected override validateNormalizedInputValueInternal(value: string): boolean {
    return super.validateNormalizedInputValueInternal(value) && UUID_REGEX.test(value);
  }

  protected override normalizeInputValueInternal(value: string): string {
    // normalize UUIDs to lowercase as defined by RFC 4122
    return value.toLowerCase();
  }
}

/**
 * EntityFieldDefinition for a column with a JS Date type.
 */
export class DateField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  Date,
  TRequireExplicitCache
> {
  protected validateNormalizedInputValueInternal(value: Date): boolean {
    return value instanceof Date;
  }

  protected normalizeInputValueInternal(value: Date): Date {
    return value;
  }
}

/**
 * EntityFieldDefinition for a column with a JS boolean type.
 */
export class BooleanField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  boolean,
  TRequireExplicitCache
> {
  protected validateNormalizedInputValueInternal(value: boolean): boolean {
    return typeof value === 'boolean';
  }

  protected override normalizeInputValueInternal(value: boolean): boolean {
    return value;
  }
}

/**
 * EntityFieldDefinition for a column with a JS number type.
 * Enforces that the number is an integer.
 */
export class IntField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  number,
  TRequireExplicitCache
> {
  protected validateNormalizedInputValueInternal(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value);
  }

  protected override normalizeInputValueInternal(value: number): number {
    return value;
  }
}

/**
 * EntityFieldDefinition for a column with a JS number type.
 * Enforces that the number is a float (which includes integers in JS).
 */
export class FloatField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  number,
  TRequireExplicitCache
> {
  protected validateNormalizedInputValueInternal(value: number): boolean {
    return typeof value === 'number';
  }

  protected override normalizeInputValueInternal(value: number): number {
    return value;
  }
}

/**
 * EntityFieldDefinition for a column with a JS string array type.
 * Enforces that every member of the string array is a string.
 */
export class StringArrayField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  string[],
  TRequireExplicitCache
> {
  protected validateNormalizedInputValueInternal(value: string[]): boolean {
    return Array.isArray(value) && value.every((subValue) => typeof subValue === 'string');
  }

  protected override normalizeInputValueInternal(value: string[]): string[] {
    return value;
  }
}

/**
 * EntityFieldDefinition for a column with a JS JSON object type.
 */
export class JSONObjectField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  object,
  TRequireExplicitCache
> {
  protected validateNormalizedInputValueInternal(value: object): boolean {
    return typeof value === 'object' && !Array.isArray(value);
  }

  protected override normalizeInputValueInternal(value: object): object {
    return value;
  }
}

/**
 * EntityFieldDefinition for a enum column with a JS string or number type.
 */
export class EnumField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  string | number,
  TRequireExplicitCache
> {
  protected validateNormalizedInputValueInternal(value: string | number): boolean {
    return typeof value === 'number' || typeof value === 'string';
  }

  protected override normalizeInputValueInternal(value: string | number): string | number {
    return value;
  }
}

/**
 * EntityFieldDefinition for a enum column with a strict typescript enum type.
 * The strict version checks that the value of the field adheres to a particular typescript enum
 */
export class StrictEnumField<
  T extends object,
  TRequireExplicitCache extends boolean,
> extends EnumField<TRequireExplicitCache> {
  private readonly enum: T;
  constructor(
    options: TRequireExplicitCache extends true
      ? EntityFieldDefinitionOptionsExplicitCache & { enum: T }
      : EntityFieldDefinitionOptions & { enum: T },
  ) {
    super(options);
    this.enum = options.enum;
  }

  protected override validateNormalizedInputValueInternal(value: string | number): boolean {
    return (
      super.validateNormalizedInputValueInternal(value) && Object.values(this.enum).includes(value)
    );
  }

  protected override normalizeInputValueInternal(value: string | number): string | number {
    return value;
  }
}

/**
 * EntityFieldDefinition for a column with a JS Buffer type.
 */
export class BufferField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  Buffer,
  TRequireExplicitCache
> {
  protected validateNormalizedInputValueInternal(value: Buffer): boolean {
    return Buffer.isBuffer(value);
  }

  protected override normalizeInputValueInternal(value: Buffer): Buffer {
    return value;
  }
}
