export abstract class EntityFieldDefinition {
  readonly columnName: string;
  readonly cache: boolean;
  /**
   *
   * @param columnName - Column name in the database.
   * @param cache - Whether or not to cache loaded instances of the entity by this field. The column name is
   *              used to derive a cache key for the cache entry. If true, this column must be able uniquely
   *              identify the entity.
   */
  constructor({ columnName, cache = false }: { columnName: string; cache?: boolean }) {
    this.columnName = columnName;
    this.cache = cache;
  }
}

export class StringField extends EntityFieldDefinition {}
export class UUIDField extends StringField {}
export class DateField extends EntityFieldDefinition {}
export class BooleanField extends EntityFieldDefinition {}
export class NumberField extends EntityFieldDefinition {}
export class StringArrayField extends EntityFieldDefinition {}
export class JSONObjectField extends EntityFieldDefinition {}
export class EnumField extends EntityFieldDefinition {}
export class JSONArrayField extends EntityFieldDefinition {}
export class MaybeJSONArrayField extends EntityFieldDefinition {}
