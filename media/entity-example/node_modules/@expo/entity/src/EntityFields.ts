import { EntityFieldDefinition } from './EntityFieldDefinition';

// Use our own regex since the `uuid` package doesn't support validating UUIDv6/7/8 yet
const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

/**
 * EntityFieldDefinition for a column with a JS string type.
 */
export class StringField extends EntityFieldDefinition<string> {
  protected validateInputValueInternal(value: string): boolean {
    return typeof value === 'string';
  }
}

/**
 * EntityFieldDefinition for a column with a JS string type.
 * Enforces that the string is a valid UUID.
 */
export class UUIDField extends StringField {
  protected override validateInputValueInternal(value: string): boolean {
    return super.validateInputValueInternal(value) && UUID_REGEX.test(value);
  }
}

/**
 * EntityFieldDefinition for a column with a JS Date type.
 */
export class DateField extends EntityFieldDefinition<Date> {
  protected validateInputValueInternal(value: Date): boolean {
    return value instanceof Date;
  }
}

/**
 * EntityFieldDefinition for a column with a JS boolean type.
 */
export class BooleanField extends EntityFieldDefinition<boolean> {
  protected validateInputValueInternal(value: boolean): boolean {
    return typeof value === 'boolean';
  }
}

/**
 * EntityFieldDefinition for a column with a JS number type.
 * Enforces that the number is an integer.
 */
export class IntField extends EntityFieldDefinition<number> {
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value);
  }
}

/**
 * EntityFieldDefinition for a column with a JS number type.
 * Enforces that the number is a float (which includes integers in JS).
 */
export class FloatField extends EntityFieldDefinition<number> {
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number';
  }
}

/**
 * EntityFieldDefinition for a column with a JS string array type.
 * Enforces that every member of the string array is a string.
 */
export class StringArrayField extends EntityFieldDefinition<string[]> {
  protected validateInputValueInternal(value: string[]): boolean {
    return Array.isArray(value) && value.every((subValue) => typeof subValue === 'string');
  }
}

/**
 * EntityFieldDefinition for a column with a JS JSON object type.
 */
export class JSONObjectField extends EntityFieldDefinition<object> {
  protected validateInputValueInternal(value: object): boolean {
    return typeof value === 'object' && !Array.isArray(value);
  }
}

/**
 * EntityFieldDefinition for a enum column with a JS string or number type.
 */
export class EnumField extends EntityFieldDefinition<string | number> {
  protected validateInputValueInternal(value: string | number): boolean {
    return typeof value === 'number' || typeof value === 'string';
  }
}

/**
 * EntityFieldDefinition for a enum column with a strict typescript enum type.
 */
export class StrictEnumField<T extends object> extends EnumField {
  private readonly enum: T;
  constructor(options: ConstructorParameters<typeof EnumField>[0] & { enum: T }) {
    super(options);
    this.enum = options.enum;
  }

  protected override validateInputValueInternal(value: string | number): boolean {
    return super.validateInputValueInternal(value) && Object.values(this.enum).includes(value);
  }
}
