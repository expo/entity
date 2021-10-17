import { validate as validateUUID } from 'uuid';

import { EntityFieldDefinition } from './EntityFieldDefinition';

export class StringField extends EntityFieldDefinition<string> {
  protected validateInputValueInternal(value: string): boolean {
    return typeof value === 'string';
  }
}
export class UUIDField extends StringField {
  protected override validateInputValueInternal(value: string): boolean {
    return validateUUID(value);
  }
}
export class DateField extends EntityFieldDefinition<Date> {
  protected validateInputValueInternal(value: Date): boolean {
    return value instanceof Date;
  }
}
export class BooleanField extends EntityFieldDefinition<boolean> {
  protected validateInputValueInternal(value: boolean): boolean {
    return typeof value === 'boolean';
  }
}

export class IntField extends EntityFieldDefinition<number> {
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number' && Number.isInteger(value);
  }
}

export class FloatField extends EntityFieldDefinition<number> {
  protected validateInputValueInternal(value: number): boolean {
    return typeof value === 'number';
  }
}

export class StringArrayField extends EntityFieldDefinition<string[]> {
  protected validateInputValueInternal(value: string[]): boolean {
    return Array.isArray(value) && value.every((subValue) => typeof subValue === 'string');
  }
}
export class JSONObjectField extends EntityFieldDefinition<object> {
  protected validateInputValueInternal(value: object): boolean {
    return typeof value === 'object' && !Array.isArray(value);
  }
}
export class EnumField extends EntityFieldDefinition<string | number> {
  protected validateInputValueInternal(value: string | number): boolean {
    return typeof value === 'number' || typeof value === 'string';
  }
}
export class EnumArrayField extends EntityFieldDefinition<string | number[]> {
  protected validateInputValueInternal(value: string | number[]): boolean {
    return (
      Array.isArray(value) &&
      value.every((subValue) => typeof subValue === 'number' || typeof subValue === 'string')
    );
  }
}
export class JSONArrayField extends EntityFieldDefinition<any[]> {
  protected validateInputValueInternal(value: any[]): boolean {
    return Array.isArray(value);
  }
}
export class MaybeJSONArrayField extends EntityFieldDefinition<any | any[]> {
  protected validateInputValueInternal(_value: any): boolean {
    return true;
  }
}
