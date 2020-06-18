export interface FieldValidator<T> {
  /**
   * Validation to apply for this field when an entity is read from the database.
   * Returning false will invalidate the entity load, making it as if the entry
   * didn't exist.
   */
  read?: (value: T) => boolean;
}

export abstract class EntityFieldDefinition<T> {
  readonly columnName: string;
  readonly cache: boolean;
  readonly validator: FieldValidator<T>;
  /**
   *
   * @param columnName - Column name in the database.
   * @param cache - Whether or not to cache loaded instances of the entity by this field. The column name is
   *              used to derive a cache key for the cache entry. If true, this column must be able uniquely
   *              identify the entity.
   */
  constructor({
    columnName,
    cache = false,
    validator = {},
  }: {
    columnName: string;
    cache?: boolean;
    validator?: FieldValidator<T>;
  }) {
    this.columnName = columnName;
    this.cache = cache;
    this.validator = validator;
  }
}

export class StringField extends EntityFieldDefinition<string> {}
export class UUIDField extends StringField {}
export class DateField extends EntityFieldDefinition<Date> {}
export class BooleanField extends EntityFieldDefinition<boolean> {}
export class NumberField extends EntityFieldDefinition<number> {}
export class StringArrayField extends EntityFieldDefinition<string[]> {}
export class JSONObjectField<T extends object> extends EntityFieldDefinition<T> {}
export class EnumField<T> extends EntityFieldDefinition<T> {}
export class JSONArrayField<T> extends EntityFieldDefinition<T[]> {}
export class MaybeJSONArrayField<TArray, TNotArray> extends EntityFieldDefinition<
  TArray[] | TNotArray
> {}
