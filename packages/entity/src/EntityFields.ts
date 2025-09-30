import {
  EntityFieldDefinition,
  EntityFieldDefinitionOptions,
  EntityFieldDefinitionOptionsExplicitCache,
} from './EntityFieldDefinition';

// Use our own regex since the `uuid` package doesn't support validating UUIDv6/7/8 yet
const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;

/**
 * EntityFieldDefinition for a column with a JS string type.
 */
export class StringField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  string,
  TRequireExplicitCache
> {
  protected validateInputValueInternal(value: string): boolean {
    return typeof value === 'string';
  }
}

/**
 * EntityFieldDefinition for a column with a JS string type.
 * Enforces that the string is a valid UUID and that it is lowercase. Entity requires UUIDs to be lowercase since most
 * databases (e.g. Postgres) treat UUIDs as case-insensitive, which can lead to unexpected entity load results if mixed-case
 * UUIDs are used.
 */
export class UUIDField<
  TRequireExplicitCache extends boolean,
> extends StringField<TRequireExplicitCache> {
  protected override validateInputValueInternal(value: string): boolean {
    return super.validateInputValueInternal(value) && UUID_REGEX.test(value);
  }
}

/**
 * EntityFieldDefinition for a column with a JS Date type.
 */
export class DateField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  Date,
  TRequireExplicitCache
> {
  protected validateInputValueInternal(value: Date): boolean {
    return value instanceof Date;
  }
}

/**
 * EntityFieldDefinition for a column with a JS boolean type.
 */
export class BooleanField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  boolean,
  TRequireExplicitCache
> {
  protected validateInputValueInternal(value: boolean): boolean {
    return typeof value === 'boolean';
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
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value);
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
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number';
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
  protected validateInputValueInternal(value: string[]): boolean {
    return Array.isArray(value) && value.every((subValue) => typeof subValue === 'string');
  }
}

/**
 * EntityFieldDefinition for a column with a JS JSON object type.
 */
export class JSONObjectField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  object,
  TRequireExplicitCache
> {
  protected validateInputValueInternal(value: object): boolean {
    return typeof value === 'object' && !Array.isArray(value);
  }
}

/**
 * EntityFieldDefinition for a enum column with a JS string or number type.
 */
export class EnumField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  string | number,
  TRequireExplicitCache
> {
  protected validateInputValueInternal(value: string | number): boolean {
    return typeof value === 'number' || typeof value === 'string';
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

  protected override validateInputValueInternal(value: string | number): boolean {
    return super.validateInputValueInternal(value) && Object.values(this.enum).includes(value);
  }
}

/**
 * EntityFieldDefinition for a column with a JS Buffer type.
 */
export class BufferField<TRequireExplicitCache extends boolean> extends EntityFieldDefinition<
  Buffer,
  TRequireExplicitCache
> {
  protected validateInputValueInternal(value: Buffer): boolean {
    return Buffer.isBuffer(value);
  }
}
