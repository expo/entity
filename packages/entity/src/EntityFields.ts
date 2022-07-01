import { validate as validateUUID } from 'uuid';

import { EntityFieldDefinition } from './EntityFieldDefinition';

/**
 * {@link EntityFieldDefinition} for a column with a JS string type.
 */
export class StringField extends EntityFieldDefinition<string> {
  protected validateAndTransformInputValueInternal(
    value: string
  ): { isValid: false } | { isValid: true; transformedValue: string } {
    return typeof value === 'string'
      ? { isValid: true, transformedValue: value }
      : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS string type in which
 * stored values are lower-cased.
 */
export class LowercaseStringField extends StringField {
  protected override validateAndTransformInputValueInternal(
    value: string
  ): { isValid: false } | { isValid: true; transformedValue: string } {
    const superValue = super.validateAndTransformInputValueInternal(value);
    if (superValue.isValid) {
      return { isValid: true, transformedValue: superValue.transformedValue.toLowerCase() };
    }
    return { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS string type.
 * Enforces that the string is a valid UUID.
 */
export class UUIDField extends StringField {
  public override validateAndTransformInputValueInternal(
    value: string
  ): { isValid: false } | { isValid: true; transformedValue: string } {
    const superValue = super.validateAndTransformInputValueInternal(value);
    if (superValue.isValid && validateUUID(superValue.transformedValue)) {
      return { isValid: true, transformedValue: superValue.transformedValue };
    }
    return { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS Date type.
 */
export class DateField extends EntityFieldDefinition<Date> {
  protected validateAndTransformInputValueInternal(
    value: Date
  ): { isValid: false } | { isValid: true; transformedValue: Date } {
    return value instanceof Date ? { isValid: true, transformedValue: value } : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS boolean type.
 */
export class BooleanField extends EntityFieldDefinition<boolean> {
  protected validateAndTransformInputValueInternal(
    value: boolean
  ): { isValid: false } | { isValid: true; transformedValue: boolean } {
    return typeof value === 'boolean'
      ? { isValid: true, transformedValue: value }
      : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS number type.
 * Enforces that the number is an integer.
 */
export class IntField extends EntityFieldDefinition<number> {
  protected validateAndTransformInputValueInternal(
    value: number
  ): { isValid: false } | { isValid: true; transformedValue: number } {
    return typeof value === 'number' && Number.isInteger(value)
      ? { isValid: true, transformedValue: value }
      : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS number type.
 * Enforces that the number is a float (which includes integers in JS).
 */
export class FloatField extends EntityFieldDefinition<number> {
  protected validateAndTransformInputValueInternal(
    value: number
  ): { isValid: false } | { isValid: true; transformedValue: number } {
    return typeof value === 'number'
      ? { isValid: true, transformedValue: value }
      : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS string array type.
 * Enforces that every member of the string array is a string.
 */
export class StringArrayField extends EntityFieldDefinition<string[]> {
  protected validateAndTransformInputValueInternal(
    value: string[]
  ): { isValid: false } | { isValid: true; transformedValue: string[] } {
    return Array.isArray(value) && value.every((subValue) => typeof subValue === 'string')
      ? { isValid: true, transformedValue: value }
      : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS JSON object type.
 */
export class JSONObjectField extends EntityFieldDefinition<object> {
  protected validateAndTransformInputValueInternal(
    value: object
  ): { isValid: false } | { isValid: true; transformedValue: object } {
    return typeof value === 'object' && !Array.isArray(value)
      ? { isValid: true, transformedValue: value }
      : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a enum column with a JS string or number type.
 */
export class EnumField extends EntityFieldDefinition<string | number> {
  protected validateAndTransformInputValueInternal(
    value: string | number
  ): { isValid: false } | { isValid: true; transformedValue: string | number } {
    return typeof value === 'number' || typeof value === 'string'
      ? { isValid: true, transformedValue: value }
      : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column with a JS JSON array type.
 */
export class JSONArrayField extends EntityFieldDefinition<any[]> {
  protected validateAndTransformInputValueInternal(
    value: any[]
  ): { isValid: false } | { isValid: true; transformedValue: any[] } {
    return Array.isArray(value) ? { isValid: true, transformedValue: value } : { isValid: false };
  }
}

/**
 * {@link EntityFieldDefinition} for a column that may be a JS JSON array type.
 * Does not do any validation.
 */
export class MaybeJSONArrayField extends EntityFieldDefinition<any | any[]> {
  protected validateAndTransformInputValueInternal(
    value: any
  ): { isValid: false } | { isValid: true; transformedValue: any } {
    return { isValid: true, transformedValue: value };
  }
}
