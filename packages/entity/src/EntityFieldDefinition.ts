import { IEntityClass } from './Entity';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

export enum EntityEdgeDeletionBehavior {
  /**
   * Invalidate the cache for all entities that reference the entity
   * being deleted through this field, and transitively run deletions on those entities.
   * This is most useful when the database itself expresses foreign
   * keys and cascading deletes and the entity framework just needs to
   * be kept consistent with the state of the database.
   */
  CASCADE_DELETE_INVALIDATE_CACHE_ONLY,

  /**
   * Invalidate the cache for all entities that reference the entity
   * being deleted through this field. This is most useful when the database itself expresses
   * foreign keys and cascading "SET NULL"s and the entity framework just needs to be
   * kept consistent with the state of the database.
   */
  SET_NULL_INVALIDATE_CACHE_ONLY,

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

export enum EntityEdgeDeletionAuthorizationInferenceBehavior {
  /**
   * Authorization to delete (when CASCADE_DELETE_INVALIDATE_CACHE_ONLY or CASCADE_DELETE) or update
   * (when SET_NULL_INVALIDATE_CACHE_ONLY or SET_NULL) all entities at the ends of edges of this type
   * cannot be inferred from authorization of any single entity at the end of an edge of this type.
   *
   * To evaluate canViewerDeleteAsync for the source entity, canViewerDeleteAsync must be called on all
   * entities at the ends of all edges of this type.
   */
  NONE,

  /**
   * Authorization to delete (when CASCADE_DELETE_INVALIDATE_CACHE_ONLY or CASCADE_DELETE) or update
   * (when SET_NULL_INVALIDATE_CACHE_ONLY or SET_NULL) all entities at the ends of edges of this type
   * may be inferred from authorization of any single entity at the end of an edge of this type.
   *
   * To evaluate canViewerDeleteAsync for the source entity, canViewerDeleteAsync must only be called on
   * a single entity at the end of one edge of this type chosen at random.
   *
   * This should only be the case when the entity at the other end of this edge can be implicitly
   * deleted/updated by virtue of the source entity deletion being authorized and a single authorization check
   * on one edge of this type.
   *
   * Note that this is not used during actual deletions, only as an optimistic optimization during execution
   * of canViewerDeleteAsync. Each entity being deleted will still check deletion privacy during actual deletion.
   */
  ONE_IMPLIES_ALL,
}

/**
 * Defines an association between entities. An association is primarily used to define cascading deletion behavior.
 */
export interface EntityAssociationDefinition<
  TViewerContext extends ViewerContext,
  TAssociatedFields extends object,
  TAssociatedIDField extends keyof NonNullable<Pick<TAssociatedFields, TAssociatedSelectedFields>>,
  TAssociatedEntity extends ReadonlyEntity<
    TAssociatedFields,
    TAssociatedIDField,
    TViewerContext,
    TAssociatedSelectedFields
  >,
  TAssociatedPrivacyPolicy extends EntityPrivacyPolicy<
    TAssociatedFields,
    TAssociatedIDField,
    TViewerContext,
    TAssociatedEntity,
    TAssociatedSelectedFields
  >,
  TAssociatedSelectedFields extends keyof TAssociatedFields = keyof TAssociatedFields,
> {
  /**
   * Class of entity on the other end of this edge.
   */
  associatedEntityClass: IEntityClass<
    TAssociatedFields,
    TAssociatedIDField,
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
   * What action to perform on the entity at the other end of this edge when the entity on the source end of
   * this edge is deleted.
   *
   * @remarks
   * The entity framework doesn't prescribe a one-size-fits-all solution for referential
   * integrity; instead it exposes mechanisms that support both database foreign key constraints
   * and implicit entity-specified foreign keys. Choosing which approach to use often depends on
   * application requirements, and sometimes even a mix-and-match is the right choice.
   *
   * - If referential integrity is critical to your application, database foreign key constraints
   *   combined with EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY or
   *   EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY are recommended.
   * - If the database being used doesn't support foreign keys, then using the entity framework for referential
   *   integrity is recommended.
   */
  edgeDeletionBehavior: EntityEdgeDeletionBehavior;

  /**
   * Optimization setting for evaluation of this edge in canViewerDeleteAsync. Can be used to optimize permission checks
   * for edge cascading deletions based on application-specific design of the entity association. Not used during actual deletions.
   *
   * Defaults to EntityEdgeDeletionAuthorizationInferenceBehavior.NONE.
   */
  edgeDeletionAuthorizationInferenceBehavior?: EntityEdgeDeletionAuthorizationInferenceBehavior;
}

/**
 * Options for EntityFieldDefinition
 */
export interface EntityFieldDefinitionOptions {
  /**
   * Column name in the database.
   */
  columnName: string;

  /**
   * Whether or not to cache loaded instances of the entity by this field. The column name is
   * used to derive a cache key for the cache entry. If true, this column must be able uniquely
   * identify the entity and the database must have a unique constraint on the column.
   */
  cache?: boolean;

  /**
   * Defines the association behavior for an entity that this column references.
   */
  association?: EntityAssociationDefinition<any, any, any, any, any, any>;
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
   * @param options - options for this field definition
   */
  constructor(options: EntityFieldDefinitionOptions) {
    this.columnName = options.columnName;
    this.cache = options.cache ?? false;
    this.association = options.association;
  }

  /**
   * Validates input value for a field of this type. Null and undefined are considered valid by default. This is used for things like:
   * - EntityLoader.loadByFieldValue - to ensure the value being loaded by is a valid value
   * - EntityMutator.setField - to ensure the value being set is a valid value
   */
  public validateInputValue(value: T | null | undefined): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    return this.validateInputValueInternal(value);
  }
  protected abstract validateInputValueInternal(value: T): boolean;
}
