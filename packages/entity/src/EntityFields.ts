import { validate as validateUUID } from 'uuid';

import { EntityFieldDefinition } from './EntityFieldDefinition';

/**
 * {@link EntityFieldDefinition} for a column with a JS string type.
 */
export class StringField extends EntityFieldDefinition<string> {
  protected validateInputValueInternal(value: string): boolean {
    return typeof value === 'string';
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS string type.
 * Enforces that the string is a valid UUID.
 */
export class UUIDField extends StringField {
  protected override validateInputValueInternal(value: string): boolean {
    return validateUUID(value);
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS Date type.
 */
export class DateField extends EntityFieldDefinition<Date> {
  protected validateInputValueInternal(value: Date): boolean {
    return value instanceof Date;
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS boolean type.
 */
export class BooleanField extends EntityFieldDefinition<boolean> {
  protected validateInputValueInternal(value: boolean): boolean {
    return typeof value === 'boolean';
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS number type.
 * Enforces that the number is an integer.
 */
export class IntField extends EntityFieldDefinition<number> {
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value);
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS number type.
 * Enforces that the number is a float (which includes integers in JS).
 */
export class FloatField extends EntityFieldDefinition<number> {
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number';
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS string array type.
 * Enforces that every member of the string array is a string.
 */
export class StringArrayField extends EntityFieldDefinition<string[]> {
  protected validateInputValueInternal(value: string[]): boolean {
    return Array.isArray(value) && value.every((subValue) => typeof subValue === 'string');
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS JSON object type.
 */
export class JSONObjectField extends EntityFieldDefinition<object> {
  protected validateInputValueInternal(value: object): boolean {
    return typeof value === 'object' && !Array.isArray(value);
  }
}

/**
 * {@link EntityFieldDefinition} for a enum column with a JS string or number type.
 */
export class EnumField extends EntityFieldDefinition<string | number> {
  protected validateInputValueInternal(value: string | number): boolean {
    return typeof value === 'number' || typeof value === 'string';
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS JSON array type.
 */
export class JSONArrayField extends EntityFieldDefinition<any[]> {
  protected validateInputValueInternal(value: any[]): boolean {
    return Array.isArray(value);
  }
}

/**
 * {@link EntityFieldDefinition} for a column that may be a JS JSON array type.
 * Does not do any validation.
 */
export class MaybeJSONArrayField extends EntityFieldDefinition<any | any[]> {
  protected validateInputValueInternal(_value: any): boolean {
    return true;
  }
}
