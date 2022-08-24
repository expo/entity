import { Result, asyncResult, result } from '@expo/results';
import invariant from 'invariant';

import EnforcingEntityLoader from './EnforcingEntityLoader';
import { IEntityClass } from './Entity';
import EntityConfiguration from './EntityConfiguration';
import {
  FieldEqualityCondition,
  QuerySelectionModifiers,
  isSingleValueFieldEqualityCondition,
  QuerySelectionModifiersWithOrderByRaw,
} from './EntityDatabaseAdapter';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityInvalidFieldValueError from './errors/EntityInvalidFieldValueError';
import EntityNotFoundError from './errors/EntityNotFoundError';
import EntityDataManager from './internal/EntityDataManager';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';
import { mapMap, mapMapAsync } from './utils/collections/maps';

/**
 * The primary interface for loading entities. All normal loads are batched,
 * cached, and authorized against the entity's EntityPrivacyPolicy.
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
  constructor(
    private readonly viewerContext: TViewerContext,
    private readonly queryContext: EntityQueryContext,
    private readonly privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext,
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly privacyPolicy: TPrivacyPolicy,
    private readonly dataManager: EntityDataManager<TFields>,
    protected readonly metricsAdapter: IEntityMetricsAdapter
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
    this.validateFieldValues(fieldName, fieldValues);

    const fieldValuesToFieldObjects = await this.dataManager.loadManyByFieldEqualingAsync(
      this.queryContext,
      fieldName,
      fieldValues
    );

    return await this.constructAndAuthorizeEntitiesAsync(fieldValuesToFieldObjects);
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
  ): Promise<Result<TEntity> | null> {
    const entityResults = await this.loadManyByFieldEqualingAsync(uniqueFieldName, fieldValue);
    invariant(
      entityResults.length <= 1,
      `loadByFieldEqualing: Multiple entities of type ${this.entityClass.name} found for ${String(
        uniqueFieldName
      )}=${fieldValue}`
    );
    return entityResults[0] ?? null;
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
      return result(
        new EntityNotFoundError(this.entityClass, this.entityConfiguration.idField, id)
      );
    }
    return entityResult;
  }

  /**
   * Load an entity by a specified ID, or return null if non-existent.
   * @param id - ID of the entity
   * @returns entity result for matching ID, or null if no entity exists for ID.
   */
  async loadByIDNullableAsync(id: TID): Promise<Result<TEntity> | null> {
    return await this.loadByFieldEqualingAsync(
      this.entityConfiguration.idField as TSelectedFields,
      id
    );
  }

  /**
   * Loads many entities for a list of IDs.
   * @param viewerContext - viewer context of loading user
   * @param ids - IDs of the entities to load
   * @returns map from ID to corresponding entity result, where result error can be UnauthorizedError or EntityNotFoundError.
   */
  async loadManyByIDsAsync(ids: readonly TID[]): Promise<ReadonlyMap<TID, Result<TEntity>>> {
    const entityResults = (await this.loadManyByFieldEqualingManyAsync(
      this.entityConfiguration.idField as TSelectedFields,
      ids
    )) as ReadonlyMap<TID, readonly Result<TEntity>[]>;
    return mapMap(entityResults, (entityResultsForId, id) => {
      const entityResult = entityResultsForId[0];
      return (
        entityResult ??
        result(new EntityNotFoundError(this.entityClass, this.entityConfiguration.idField, id))
      );
    });
  }

  /**
   * Loads many entities matching the selection constructed from the conjunction of specified operands.
   * Entities loaded using this method are not batched or cached.
   *
   * @example
   * fieldEqualityOperands:
   * `[{fieldName: 'hello', fieldValue: 1}, {fieldName: 'world', fieldValues: [2, 3]}]`
   * Entities returned with a SQL EntityDatabaseAdapter:
   * `WHERE hello = 1 AND world = ANY({2, 3})`
   *
   * @param fieldEqualityOperands - list of field equality selection operand specifications
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {}
  ): Promise<readonly Result<TEntity>[]> {
    for (const fieldEqualityOperand of fieldEqualityOperands) {
      const fieldValues = isSingleValueFieldEqualityCondition(fieldEqualityOperand)
        ? [fieldEqualityOperand.fieldValue]
        : fieldEqualityOperand.fieldValues;
      this.validateFieldValues(fieldEqualityOperand.fieldName, fieldValues);
    }

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
            this.privacyPolicyEvaluationContext,
            uncheckedEntityResult.value,
            this.metricsAdapter
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
   * http://knexjs.org/#Builder-whereRaw
   * http://knexjs.org/#Raw-Bindings
   *
   * @param rawWhereClause - parameterized SQL WHERE clause with positional binding placeholders or named binding placeholders
   * @param bindings - array of positional bindings or object of named bindings
   * @param querySelectionModifiers - limit, offset, orderBy, and orderByRaw for the query
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   * @throws Error when rawWhereClause or bindings are invalid
   *
   * @deprecated prefer caching loaders
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields> = {}
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
            this.privacyPolicyEvaluationContext,
            uncheckedEntityResult.value,
            this.metricsAdapter
          )
        );
      })
    );
  }

  /**
   * Invalidate all caches for an entity's fields. Exposed primarily for internal use by EntityMutator.
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

  private tryConstructEntities(fieldsObjects: readonly TFields[]): readonly Result<TEntity>[] {
    return fieldsObjects.map((fieldsObject) => {
      try {
        return result(new this.entityClass(this.viewerContext, fieldsObject));
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e;
        }
        return result(e);
      }
    });
  }

  /**
   * Construct and authorize entities from fields map, returning error results for entities that fail
   * to construct or fail to authorize.
   *
   * @param map - map from an arbitrary key type to an array of entity field objects
   */
  public async constructAndAuthorizeEntitiesAsync<K>(
    map: ReadonlyMap<K, readonly Readonly<TFields>[]>
  ): Promise<ReadonlyMap<K, readonly Result<TEntity>[]>> {
    const uncheckedEntityResultsMap = mapMap(map, (fieldObjects) =>
      this.tryConstructEntities(fieldObjects)
    );
    return await mapMapAsync(uncheckedEntityResultsMap, async (uncheckedEntityResults) => {
      return await Promise.all(
        uncheckedEntityResults.map(async (uncheckedEntityResult) => {
          if (!uncheckedEntityResult.ok) {
            return uncheckedEntityResult;
          }
          return await asyncResult(
            this.privacyPolicy.authorizeReadAsync(
              this.viewerContext,
              this.queryContext,
              this.privacyPolicyEvaluationContext,
              uncheckedEntityResult.value,
              this.metricsAdapter
            )
          );
        })
      );
    });
  }

  private validateFieldValues<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly TFields[N][]
  ): void {
    const fieldDefinition = this.entityConfiguration.schema.get(fieldName);
    invariant(fieldDefinition, `must have field definition for field = ${String(fieldName)}`);
    for (const fieldValue of fieldValues) {
      const isInputValid = fieldDefinition.validateInputValue(fieldValue);
      if (!isInputValid) {
        throw new EntityInvalidFieldValueError(this.entityClass, fieldName, fieldValue);
      }
    }
  }
}
