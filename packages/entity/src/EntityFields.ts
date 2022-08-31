import { validate as validateUUID } from 'uuid';

import { EntityFieldDefinition } from './EntityFieldDefinition';

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
    return validateUUID(value);
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
