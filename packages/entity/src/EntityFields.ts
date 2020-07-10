import { IEntityClass } from './Entity';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

export enum EntityEdgeDeletionBehavior {
  /**
   * Default. Invalidate the cache for all entities that reference the entity
   * being deleted through this field. This is most useful when the database itself expresses foreign
   * keys and cascading deletes or set nulls and the entity framework just needs to
   * be kept consistent with the state of the database.
   */
  INVALIDATE_CACHE,

  /**
   * Delete all entities that reference the entity being deleted through this field. This is very similar
   * to SQL `ON DELETE CASCADE` but is done in the Entity framework instead of at the underlying level,
   * and should not be used in combination with database-schema-expressed foreign keys and deletion behavior.
   */
  CASCADE_DELETE,

  /**
   * Set this field to null when the referenced entity is deleted. This is very similar
   * to SQL `ON DELETE SET NULL` but is done in the Entity framework instead of at the underlying level,
   * and should not be used in combination with database-schema-expressed foreign keys and deletion behavior.
   */
  SET_NULL,
}

export interface EntityAssociationDefinition<
  TViewerContext extends ViewerContext,
  TAssociatedFields,
  TAssociatedID,
  TAssociatedEntity extends ReadonlyEntity<
    TAssociatedFields,
    TAssociatedID,
    TViewerContext,
    TAssociatedSelectedFields
  >,
  TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
    TAssociatedFields,
    TAssociatedID,
    TViewerContext,
    TAssociatedEntity,
    TAssociatedSelectedFields
  >,
  TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields
> {
  /**
   * Class of entity on the other end of this edge.
   */
  associatedEntityClass: IEntityClass<
    TAssociatedFields,
    TAssociatedID,
    TViewerContext,
    TAssociatedEntity,
    TAssociatedPrivacyPolicy,
    TAssociatedSelectedFields
  >;

  /**
   * Field by which to load the instance of associatedEntityClass. If not provided, the
   * associatedEntityClass instance is fetched by its ID.
   */
  associatedEntityLookupByField?: keyof TAssociatedFields;

  /**
   * What to do on the current entity when the entity on the other end of this edge is deleted.
   */
  edgeDeletionBehavior?: EntityEdgeDeletionBehavior;
}

export abstract class EntityFieldDefinition {
  readonly columnName: string;
  readonly cache: boolean;
  readonly association?: EntityAssociationDefinition<any, any, any, any, any, any>;
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
    association,
  }: {
    columnName: string;
    cache?: boolean;
    association?: EntityAssociationDefinition<any, any, any, any, any, any>;
  }) {
    this.columnName = columnName;
    this.cache = cache;
    this.association = association;
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
