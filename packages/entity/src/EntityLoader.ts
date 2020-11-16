import { Result, asyncResult, result } from '@expo/results';
import invariant from 'invariant';

import EnforcingEntityLoader from './EnforcingEntityLoader';
import { IEntityClass } from './Entity';
import { FieldEqualityCondition, QuerySelectionModifiers } from './EntityDatabaseAdapter';
import { EntityNotFoundError } from './EntityErrors';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityDataManager from './internal/EntityDataManager';
import { mapMap, mapMapAsync } from './utils/collections/maps';

/**
 * The primary interface for loading entities. All normal loads are batched,
 * cached, and authorized against the entity's {@link EntityPrivacyPolicy}.
 */
export default class EntityLoader<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields
> {
  constructor(
    private readonly viewerContext: TViewerContext,
    private readonly queryContext: EntityQueryContext,
    private readonly idField: keyof Pick<TFields, TSelectedFields>,
    private readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly privacyPolicy: TPrivacyPolicy,
    private readonly dataManager: EntityDataManager<TFields>
  ) {}

  /**
   * Enforcing view on this entity loader. All loads through this view are
   * guaranteed to be the values of successful results (or null for some loader methods),
   * and will throw otherwise.
   */
  enforcing(): EnforcingEntityLoader<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityLoader(this);
  }

  /**
   * Load many entities where fieldName is one of fieldValues.
   * @param fieldName - entity field being queried
   * @param fieldValues - fieldName field values being queried
   * @returns map from fieldValue to entity results that match the query for that fieldValue,
   *          where result errors can be UnauthorizedError
   */
  async loadManyByFieldEqualingManyAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Result<TEntity>[]>> {
    const fieldValuesToFieldObjects = await this.dataManager.loadManyByFieldEqualingAsync(
      this.queryContext,
      fieldName,
      fieldValues
    );
    const fieldValuesToUncheckedEntityResults = mapMap(fieldValuesToFieldObjects, (fieldObjects) =>
      this.tryConstructEntities(fieldObjects)
    );

    return await mapMapAsync(
      fieldValuesToUncheckedEntityResults,
      async (uncheckedEntityResults) => {
        return await Promise.all(
          uncheckedEntityResults.map(async (uncheckedEntityResult) => {
            if (!uncheckedEntityResult.ok) {
              return uncheckedEntityResult;
            }
            return await asyncResult(
              this.privacyPolicy.authorizeReadAsync(
                this.viewerContext,
                this.queryContext,
                uncheckedEntityResult.value
              )
            );
          })
        );
      }
    );
  }

  /**
   * Load many entities where fieldName equals fieldValue.
   * @param fieldName - entity field being queried
   * @param fieldValue - fieldName field value being queried
   * @returns array of entity results that match the query for fieldValue, where result error can be UnauthorizedError
   */
  async loadManyByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): Promise<readonly Result<TEntity>[]> {
    const entityResults = await this.loadManyByFieldEqualingManyAsync(fieldName, [fieldValue]);
    const entityResultsForFieldValue = entityResults.get(fieldValue);
    invariant(
      entityResultsForFieldValue !== undefined,
      `${fieldValue} should be guaranteed to be present in returned map of entities`
    );
    return entityResultsForFieldValue!;
  }

  /**
   * Load an entity where fieldName equals fieldValue, or null if no entity exists.
   * @param uniqueFieldName - entity field being queried
   * @param fieldValue - uniqueFieldName field value being queried
   * @returns entity result where uniqueFieldName equals fieldValue, or null if no entity matches the condition.
   * @throws when multiple entities match the condition
   */
  async loadByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    uniqueFieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): Promise<Result<TEntity | null>> {
    const entityResults = await this.loadManyByFieldEqualingAsync(uniqueFieldName, fieldValue);
    invariant(
      entityResults.length <= 1,
      `loadByFieldEqualing: Multiple entities of type ${this.entityClass.name} found for ${uniqueFieldName}=${fieldValue}`
    );
    return entityResults[0] ?? result(null);
  }

  /**
   * Loads an entity by a specified ID.
   * @param id - ID of the entity
   * @returns entity result for matching ID, where result error can be UnauthorizedError or EntityNotFoundError.
   */
  async loadByIDAsync(id: TID): Promise<Result<TEntity>> {
    const entityResults = await this.loadManyByIDsAsync([id]);
    const entityResult = entityResults.get(id);
    if (entityResult === undefined) {
      return result(new EntityNotFoundError(this.entityClass, this.idField, id as any));
    }
    return entityResult;
  }

  /**
   * Load an entity by a specified ID, or return null if non-existent.
   * @param id - ID of the entity
   * @returns entity result for matching ID, or null if no entity exists for ID.
   */
  async loadByIDNullableAsync(id: TID): Promise<Result<TEntity | null>> {
    return await this.loadByFieldEqualingAsync(this.idField, id as any);
  }

  /**
   * Loads many entities for a list of IDs.
   * @param viewerContext - viewer context of loading user
   * @param ids - IDs of the entities to load
   * @returns map from ID to corresponding entity result, where result error can be UnauthorizedError or EntityNotFoundError.
   */
  async loadManyByIDsAsync(ids: readonly TID[]): Promise<ReadonlyMap<TID, Result<TEntity>>> {
    const entityResults = ((await this.loadManyByFieldEqualingManyAsync(
      this.idField,
      ids as any
    )) as any) as ReadonlyMap<TID, readonly Result<TEntity>[]>;
    return mapMap(entityResults, (entityResultsForId, id) => {
      const entityResult = entityResultsForId[0];
      return (
        entityResult ?? result(new EntityNotFoundError(this.entityClass, this.idField, id as any))
      );
    });
  }

  /**
   * Loads many entities matching the conjunction of WHERE clauses constructed from specified operands.
   * Entities loaded using this method are not batched or cached.
   *
   * @example
   * fieldEqualityOperands:
   * `[{fieldName: 'hello', fieldValue: 1}, {fieldName: 'world', fieldValues: [2, 3]}]`
   * Entities returned:
   * `WHERE hello = 1 AND world = ANY({2, 3})`
   *
   * @param fieldEqualityOperands - list of field equality WHERE clause operand specifications
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {}
  ): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.dataManager.loadManyByFieldEqualityConjunctionAsync(
      this.queryContext,
      fieldEqualityOperands,
      querySelectionModifiers
    );
    const uncheckedEntityResults = this.tryConstructEntities(fieldObjects);
    return await Promise.all(
      uncheckedEntityResults.map(async (uncheckedEntityResult) => {
        if (!uncheckedEntityResult.ok) {
          return uncheckedEntityResult;
        }
        return await asyncResult(
          this.privacyPolicy.authorizeReadAsync(
            this.viewerContext,
            this.queryContext,
            uncheckedEntityResult.value
          )
        );
      })
    );
  }

  /**
   * Loads many entities matching the raw WHERE clause. Corresponds to the knex `whereRaw` argument format.
   *
   * @remarks
   * Important notes:
   * - Fields in clause are database column names instead of transformed entity field names.
   * - Entities loaded using this method are not batched or cached.
   * - Not all database adapters implement the ability to execute this method of fetching entities.
   *
   * @example
   * rawWhereClause: `id = ?`
   * bindings: `[1]`
   * Entites returned `WHERE id = 1`
   *
   * {@link http://knexjs.org/#Builder-whereRaw}
   * {@link http://knexjs.org/#Raw-Bindings}
   *
   * @param rawWhereClause - parameterized SQL WHERE clause with positional binding placeholders or named binding placeholders
   * @param bindings - array of positional bindings or object of named bindings
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   * @throws Error when rawWhereClause or bindings are invalid
   *
   * @deprecated prefer caching loaders
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {}
  ): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.dataManager.loadManyByRawWhereClauseAsync(
      this.queryContext,
      rawWhereClause,
      bindings,
      querySelectionModifiers
    );
    const uncheckedEntityResults = this.tryConstructEntities(fieldObjects);
    return await Promise.all(
      uncheckedEntityResults.map(async (uncheckedEntityResult) => {
        if (!uncheckedEntityResult.ok) {
          return uncheckedEntityResult;
        }
        return await asyncResult(
          this.privacyPolicy.authorizeReadAsync(
            this.viewerContext,
            this.queryContext,
            uncheckedEntityResult.value
          )
        );
      })
    );
  }

  /**
   * Invalidate all caches for an entity's fields. Exposed primarily for internal use by {@link EntityMutator}.
   * @param objectFields - entity data object to be invalidated
   */
  async invalidateFieldsAsync(objectFields: Readonly<TFields>): Promise<void> {
    await this.dataManager.invalidateObjectFieldsAsync(objectFields);
  }

  /**
   * Invalidate all caches for an entity. One potential use case would be to keep the entity
   * framework in sync with changes made to data outside of the framework.
   * @param entity - entity to be invalidated
   */
  async invalidateEntityAsync(entity: TEntity): Promise<void> {
    await this.invalidateFieldsAsync(entity.getAllDatabaseFields());
  }

  /**
   * Wrap entity construction in try/catch and return Results. Used to prevent constructor errors
   * thrown for one entity instantiation from interfering with other entity instantiatons of the same query.
   * @param fieldsObjects - array of entity data objects to construct entities
   */
  private tryConstructEntities(fieldsObjects: readonly TFields[]): readonly Result<TEntity>[] {
    return fieldsObjects.map((fieldsObject) => {
      try {
        return result(new this.entityClass(this.viewerContext, fieldsObject));
      } catch (e) {
        return result(e);
      }
    });
  }
}
