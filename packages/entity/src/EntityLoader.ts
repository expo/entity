import { IEntityClass } from './Entity';
import EntityConfiguration from './EntityConfiguration';
import { FieldEqualityCondition, QuerySelectionModifiers } from './EntityDatabaseAdapter';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import EntityResultLoader from './EntityResultLoader';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityDataManager from './internal/EntityDataManager';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';
import { mapMap } from './utils/collections/maps';

/**
 * The primary interface for loading entities. All normal loads are batched,
 * cached, and authorized against the entity's {@link EntityPrivacyPolicy}.
 */
export default class EntityLoader<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
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
  /**
   * Result-based view on an entity loader. All loads through this loader will wrap their results in Result.
   */
  public readonly resultLoader: EntityResultLoader<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;

  constructor(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext,
    entityConfiguration: EntityConfiguration<TFields>,
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    privacyPolicy: TPrivacyPolicy,
    private readonly dataManager: EntityDataManager<TFields>,
    protected readonly metricsAdapter: IEntityMetricsAdapter
  ) {
    this.resultLoader = new EntityResultLoader(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      entityConfiguration,
      entityClass,
      privacyPolicy,
      dataManager,
      metricsAdapter
    );
  }

  /**
   * Load many entities where fieldName is one of fieldValues.
   * @param fieldName - entity field being queried
   * @param fieldValues - fieldName field values being queried
   * @returns map from fieldValue to entities that match the query for that fieldValue
   */
  async loadManyByFieldEqualingManyAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly TEntity[]>> {
    const fieldValuesToResults = await this.resultLoader.loadManyByFieldEqualingManyAsync(
      fieldName,
      fieldValues
    );
    return mapMap(fieldValuesToResults, (results) =>
      results.map((result) => result.enforceValue())
    );
  }

  /**
   * Load many entities where fieldName equals fieldValue.
   * @param fieldName - entity field being queried
   * @param fieldValue - fieldName field value being queried
   * @returns array of entities that match the query for fieldValue
   */
  async loadManyByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.resultLoader.loadManyByFieldEqualingAsync(
      fieldName,
      fieldValue
    );
    return entityResults.map((result) => result.enforceValue());
  }

  /**
   * Load an entity where fieldName equals fieldValue, or null if no entity exists.
   * @param uniqueFieldName - entity field being queried
   * @param fieldValue - uniqueFieldName field value being queried
   * @returns entity where uniqueFieldName equals fieldValue, or null if no entity matches the condition.
   * @throws when multiple entities match the condition
   */
  async loadByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    uniqueFieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): Promise<TEntity | null> {
    const entityResult = await this.resultLoader.loadByFieldEqualingAsync(
      uniqueFieldName,
      fieldValue
    );
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Loads an entity by a specified ID.
   * @param id - ID of the entity
   * @returns entity for matching ID
   */
  async loadByIDAsync(id: TID): Promise<TEntity> {
    const entityResult = await this.resultLoader.loadByIDAsync(id);
    return entityResult.enforceValue();
  }

  /**
   * Load an entity by a specified ID, or return null if non-existent.
   * @param id - ID of the entity
   * @returns entity for matching ID, or null if no entity exists for ID.
   */
  async loadByIDNullableAsync(id: TID): Promise<TEntity | null> {
    const entityResult = await this.resultLoader.loadByIDNullableAsync(id);
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Loads many entities for a list of IDs.
   * @param viewerContext - viewer context of loading user
   * @param ids - IDs of the entities to load
   * @returns map from ID to corresponding entity
   */
  async loadManyByIDsAsync(ids: readonly TID[]): Promise<ReadonlyMap<TID, TEntity>> {
    const entityResults = await this.resultLoader.loadManyByIDsAsync(ids);
    return mapMap(entityResults, (result) => result.enforceValue());
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
   * @returns array of entities that match the query
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {}
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.resultLoader.loadManyByFieldEqualityConjunctionAsync(
      fieldEqualityOperands,
      querySelectionModifiers
    );
    return entityResults.map((result) => result.enforceValue());
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
   * @returns array of entities that match the query
   * @throws Error when rawWhereClause or bindings are invalid
   *
   * @deprecated prefer caching loaders
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {}
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.resultLoader.loadManyByRawWhereClauseAsync(
      rawWhereClause,
      bindings,
      querySelectionModifiers
    );
    return entityResults.map((result) => result.enforceValue());
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
}
