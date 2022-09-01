import { EntityFieldDefinition } from '@expo/entity';

/**
 * EntityFieldDefinition for a Postres column with a JS JSON array type.
 */
export class JSONArrayField extends EntityFieldDefinition<any[]> {
  protected validateInputValueInternal(value: any[]): boolean {
    return Array.isArray(value);
  }
}

/**
 * EntityFieldDefinition for a Postgres column that may be a JS JSON array type.
 * Does not do any validation.
 */
export class MaybeJSONArrayField extends EntityFieldDefinition<any | any[]> {
  protected validateInputValueInternal(_value: any): boolean {
    return true;
  }
}

/**
 * EntityFieldDefinition for a Postgres BIGINT column.
 */
export class BigIntField extends EntityFieldDefinition<string> {
  protected validateInputValueInternal(value: string): boolean {
    return typeof value === 'string';
  }
}
