import { IEntityClass } from './Entity';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

export enum EntityEdgeDeletionBehavior {
  /**
   * Default. Invalidate the cache for all entities that reference the entity
   * being deleted through this field, and transitively run deletions on those entities.
   * This is most useful when the database itself expresses foreign
   * keys and cascading deletes or set nulls and the entity framework just needs to
   * be kept consistent with the state of the database.
   */
  CASCADE_DELETE_INVALIDATE_CACHE,

  /**
   * Delete all entities that reference the entity being deleted through this field. This is very similar
   * to SQL `ON DELETE CASCADE` but is done in the Entity framework instead of at the underlying level.
   * This will also invalidate the cached referencing entities.
   */
  CASCADE_DELETE,

  /**
   * Set this field to null when the referenced entity is deleted. This is very similar
   * to SQL `ON DELETE SET NULL` but is done in the Entity framework instead of at the underlying level.
   * This will also invalidate the cached referencing entities.
   */
  SET_NULL,
}

/**
 * Defines an association between entities. An association is primarily used to define cascading deletion behavior.
 */
export interface EntityAssociationDefinition<
  TViewerContext extends ViewerContext,
  TAssociatedFields,
  TAssociatedID extends NonNullable<TAssociatedFields[TAssociatedSelectedFields]>,
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
  getAssociatedEntityClass: () => IEntityClass<
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
   * What action to perform on the current entity when the entity on the referencing end of
   * this edge is deleted.
   *
   * @remarks
   * The entity framework doesn't prescribe a one-size-fits-all solution for referential
   * integrity; instead it exposes mechanisms that supports both database foreign key constraints
   * and implicit entity-specified foreign keys. Choosing which approach to use often depends on
   * application requirements, and sometimes even a mix-and-match is the right choice.
   *
   * - If referential integrity is critical to your application, database foreign key constraints
   *   combined with {@link EntityEdgeDeletionBehavior.CASACDE_DELETE_INVALIDATE_CACHE} are recommended.
   * - If the database being used doesn't support foreign keys, then using the entity framework for referential
   *   integrity is recommended.
   */
  edgeDeletionBehavior?: EntityEdgeDeletionBehavior;
}

/**
 * Definition for a field referencing a column in the underlying database. Specifies things like
 * cache behavior and associations, and handles input validation.
 */
export abstract class EntityFieldDefinition<T> {
  readonly columnName: string;
  readonly cache: boolean;
  readonly association: EntityAssociationDefinition<any, any, any, any, any, any> | undefined;
  /**
   *
   * @param columnName - Column name in the database.
   * @param cache - Whether or not to cache loaded instances of the entity by this field. The column name is
   *              used to derive a cache key for the cache entry. If true, this column must be able uniquely
   *              identify the entity.
   * @param association - Defines the association behavior for an entity that this column references.
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

  /**
   * Validates input value for a field of this type. Null and undefined are considered valid by default. This is used for things like:
   * - EntityLoader.loadByFieldValue - to ensure the value being loaded by is a valid value
   * - EntityMutator.setField - to ensure the value being set is a valid value
   */
  public validateAndTransformInputValue(
    value: T | null | undefined
  ): { isValid: false } | { isValid: true; transformedValue: T | null | undefined } {
    if (value === null || value === undefined) {
      return { isValid: true, transformedValue: value };
    }

    return this.validateAndTransformInputValueInternal(value);
  }
  protected abstract validateAndTransformInputValueInternal(
    value: T
  ): { isValid: false } | { isValid: true; transformedValue: T };

  public transformInputValue(value: T): T {
    return value;
  }
}
