import { EntityFieldDefinition } from './EntityFieldDefinition';

// Use our own regex since the `uuid` package doesn't support validating UUIDv6/7/8 yet
const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

/**
 * EntityFieldDefinition for a column with a JS string type.
 */
export class StringField<TExplicitCache extends boolean = any> extends EntityFieldDefinition<
  string,
  TExplicitCache
> {
  protected validateInputValueInternal(value: string): boolean {
    return typeof value === 'string';
  }
}

/**
 * EntityFieldDefinition for a column with a JS string type.
 * Enforces that the string is a valid UUID.
 */
export class UUIDField<TExplicitCache extends boolean = any> extends StringField<TExplicitCache> {
  protected override validateInputValueInternal(value: string): boolean {
    return super.validateInputValueInternal(value) && UUID_REGEX.test(value);
  }
}

/**
 * EntityFieldDefinition for a column with a JS Date type.
 */
export class DateField<TExplicitCache extends boolean = any> extends EntityFieldDefinition<
  Date,
  TExplicitCache
> {
  protected validateInputValueInternal(value: Date): boolean {
    return value instanceof Date;
  }
}

/**
 * EntityFieldDefinition for a column with a JS boolean type.
 */
export class BooleanField<TExplicitCache extends boolean = any> extends EntityFieldDefinition<
  boolean,
  TExplicitCache
> {
  protected validateInputValueInternal(value: boolean): boolean {
    return typeof value === 'boolean';
  }
}

/**
 * EntityFieldDefinition for a column with a JS number type.
 * Enforces that the number is an integer.
 */
export class IntField<TExplicitCache extends boolean = any> extends EntityFieldDefinition<
  number,
  TExplicitCache
> {
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value);
  }
}

/**
 * EntityFieldDefinition for a column with a JS number type.
 * Enforces that the number is a float (which includes integers in JS).
 */
export class FloatField<TExplicitCache extends boolean = any> extends EntityFieldDefinition<
  number,
  TExplicitCache
> {
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number';
  }
}

/**
 * EntityFieldDefinition for a column with a JS string array type.
 * Enforces that every member of the string array is a string.
 */
export class StringArrayField<TExplicitCache extends boolean = any> extends EntityFieldDefinition<
  string[],
  TExplicitCache
> {
  protected validateInputValueInternal(value: string[]): boolean {
    return Array.isArray(value) && value.every((subValue) => typeof subValue === 'string');
  }
}

/**
 * EntityFieldDefinition for a column with a JS JSON object type.
 */
export class JSONObjectField<TExplicitCache extends boolean = any> extends EntityFieldDefinition<
  object,
  TExplicitCache
> {
  protected validateInputValueInternal(value: object): boolean {
    return typeof value === 'object' && !Array.isArray(value);
  }
}

/**
 * EntityFieldDefinition for a enum column with a JS string or number type.
 */
export class EnumField<TExplicitCache extends boolean = any> extends EntityFieldDefinition<
  string | number,
  TExplicitCache
> {
  protected validateInputValueInternal(value: string | number): boolean {
    return typeof value === 'number' || typeof value === 'string';
  }
}

/**
 * EntityFieldDefinition for a enum column with a strict typescript enum type.
 */
export class StrictEnumField<
  T extends object,
  TExplicitCache extends boolean = any,
> extends EnumField<TExplicitCache> {
  private readonly enum: T;
  constructor(
    options: ConstructorParameters<
      typeof EntityFieldDefinition<string | number, TExplicitCache>
    >[0] & { enum: T },
  ) {
    super(options);
    this.enum = options.enum;
  }

  protected override validateInputValueInternal(value: string | number): boolean {
    return super.validateInputValueInternal(value) && Object.values(this.enum).includes(value);
  }
}
