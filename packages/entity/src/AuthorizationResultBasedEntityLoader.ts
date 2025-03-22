import { Result, result } from '@expo/results';
import invariant from 'invariant';
import nullthrows from 'nullthrows';

import { IEntityClass } from './Entity';
import EntityConfiguration from './EntityConfiguration';
import {
  FieldEqualityCondition,
  QuerySelectionModifiers,
  isSingleValueFieldEqualityCondition,
  QuerySelectionModifiersWithOrderByRaw,
} from './EntityDatabaseAdapter';
import EntityLoaderUtils from './EntityLoaderUtils';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityInvalidFieldValueError from './errors/EntityInvalidFieldValueError';
import EntityNotFoundError from './errors/EntityNotFoundError';
import EntityDataManager from './internal/EntityDataManager';
import { SingleFieldHolder, SingleFieldValueHolder } from './internal/SingleFieldHolder';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';
import { mapKeys, mapMap } from './utils/collections/maps';

/**
 * Authorization-result-based entity loader. All normal loads are batched,
 * cached, and authorized against the entity's EntityPrivacyPolicy. All loads through this
 * loader are are results (or null for some loader methods), where an unsuccessful result
 * means an authorization error or entity construction error occurred. Other errors are thrown.
 */
export default class AuthorizationResultBasedEntityLoader<
  TFields extends Record<string, any>,
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
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly queryContext: EntityQueryContext,
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly dataManager: EntityDataManager<TFields>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
    public readonly utils: EntityLoaderUtils<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns map from fieldValue to entity results that match the query for that fieldValue,
   *          where result errors can be UnauthorizedError
   */
  async loadManyByFieldEqualingManyAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Result<TEntity>[]>> {
    const { loadKey, loadValues } = this.validateFieldAndValuesAndConvertToHolders(
      fieldName,
      fieldValues,
    );

    const loadValuesToFieldObjects = await this.dataManager.loadManyEqualingAsync(
      this.queryContext,
      loadKey,
      loadValues,
    );

    const fieldValuesToFieldObjects = mapKeys(
      loadValuesToFieldObjects,
      (loadValue) => loadValue.fieldValue,
    );
    return await this.utils.constructAndAuthorizeEntitiesAsync(fieldValuesToFieldObjects);
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns array of entity results that match the query for fieldValue, where result error can be UnauthorizedError
   */
  async loadManyByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>,
  ): Promise<readonly Result<TEntity>[]> {
    const entityResults = await this.loadManyByFieldEqualingManyAsync(fieldName, [fieldValue]);
    const entityResultsForFieldValue = entityResults.get(fieldValue);
    invariant(
      entityResultsForFieldValue !== undefined,
      `${fieldValue} should be guaranteed to be present in returned map of entities`,
    );
    return entityResultsForFieldValue;
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns entity result where uniqueFieldName equals fieldValue, or null if no entity matches the condition.
   * @throws when multiple entities match the condition
   */
  async loadByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    uniqueFieldName: N,
    fieldValue: NonNullable<TFields[N]>,
  ): Promise<Result<TEntity> | null> {
    const entityResults = await this.loadManyByFieldEqualingAsync(uniqueFieldName, fieldValue);
    invariant(
      entityResults.length <= 1,
      `loadByFieldEqualing: Multiple entities of type ${this.entityClass.name} found for ${String(
        uniqueFieldName,
      )}=${fieldValue}`,
    );
    return entityResults[0] ?? null;
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns entity result for matching ID, where result error can be UnauthorizedError or EntityNotFoundError.
   */
  async loadByIDAsync(id: TID): Promise<Result<TEntity>> {
    const entityResults = await this.loadManyByIDsAsync([id]);
    // loadManyByIDsAsync is always populated for each id supplied
    return nullthrows(entityResults.get(id));
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns entity result for matching ID, or null if no entity exists for ID.
   */
  async loadByIDNullableAsync(id: TID): Promise<Result<TEntity> | null> {
    return await this.loadByFieldEqualingAsync(
      this.entityConfiguration.idField as TSelectedFields,
      id,
    );
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns map from ID to corresponding entity result, where result error can be UnauthorizedError or EntityNotFoundError.
   */
  async loadManyByIDsAsync(ids: readonly TID[]): Promise<ReadonlyMap<TID, Result<TEntity>>> {
    const entityResults = (await this.loadManyByFieldEqualingManyAsync(
      this.entityConfiguration.idField as TSelectedFields,
      ids,
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
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns map from ID to nullable corresponding entity result, where result error can be UnauthorizedError.
   */
  async loadManyByIDsNullableAsync(
    ids: readonly TID[],
  ): Promise<ReadonlyMap<TID, Result<TEntity> | null>> {
    const entityResults = (await this.loadManyByFieldEqualingManyAsync(
      this.entityConfiguration.idField as TSelectedFields,
      ids,
    )) as ReadonlyMap<TID, readonly Result<TEntity>[]>;
    return mapMap(entityResults, (entityResultsForId) => {
      return entityResultsForId[0] ?? null;
    });
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns the first entity results that matches the query, where result error can be
   *  UnauthorizedError
   */
  async loadFirstByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: Omit<QuerySelectionModifiers<TFields>, 'limit'> &
      Required<Pick<QuerySelectionModifiers<TFields>, 'orderBy'>>,
  ): Promise<Result<TEntity> | null> {
    const results = await this.loadManyByFieldEqualityConjunctionAsync(fieldEqualityOperands, {
      ...querySelectionModifiers,
      limit: 1,
    });
    return results[0] ?? null;
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {},
  ): Promise<readonly Result<TEntity>[]> {
    for (const fieldEqualityOperand of fieldEqualityOperands) {
      const fieldValues = isSingleValueFieldEqualityCondition(fieldEqualityOperand)
        ? [fieldEqualityOperand.fieldValue]
        : fieldEqualityOperand.fieldValues;
      this.validateFieldAndValues(fieldEqualityOperand.fieldName, fieldValues);
    }

    const fieldObjects = await this.dataManager.loadManyByFieldEqualityConjunctionAsync(
      this.queryContext,
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return await this.utils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   * @throws Error when rawWhereClause or bindings are invalid
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields> = {},
  ): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.dataManager.loadManyByRawWhereClauseAsync(
      this.queryContext,
      rawWhereClause,
      bindings,
      querySelectionModifiers,
    );
    return await this.utils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }

  private validateFieldAndValues<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly TFields[N][],
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

  private validateFieldAndValuesAndConvertToHolders<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): {
    loadKey: SingleFieldHolder<TFields, N>;
    loadValues: readonly SingleFieldValueHolder<TFields, N>[];
  } {
    this.validateFieldAndValues(fieldName, fieldValues);

    return {
      loadKey: new SingleFieldHolder<TFields, N>(fieldName),
      loadValues: fieldValues.map(
        (fieldValue) => new SingleFieldValueHolder<TFields, N>(fieldValue),
      ),
    };
  }
}
