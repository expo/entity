import { Result, result } from '@expo/results';
import invariant from 'invariant';
import nullthrows from 'nullthrows';

import { IEntityClass } from './Entity';
import {
  EntityCompositeField,
  EntityCompositeFieldValue,
  EntityConfiguration,
} from './EntityConfiguration';
import { EntityLoaderUtils } from './EntityLoaderUtils';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';
import { EntityNotFoundError } from './errors/EntityNotFoundError';
import { CompositeFieldHolder, CompositeFieldValueHolder } from './internal/CompositeFieldHolder';
import { CompositeFieldValueMap } from './internal/CompositeFieldValueMap';
import { EntityDataManager } from './internal/EntityDataManager';
import { SingleFieldHolder, SingleFieldValueHolder } from './internal/SingleFieldHolder';
import { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter';
import { mapKeys, mapMap } from './utils/collections/maps';
import { areSetsEqual } from './utils/collections/sets';

/**
 * Authorization-result-based entity loader. All normal loads are batched,
 * cached, and authorized against the entity's EntityPrivacyPolicy. All loads through this
 * loader are are results (or null for some loader methods), where an unsuccessful result
 * means an authorization error or entity construction error occurred. Other errors are thrown.
 */
export class AuthorizationResultBasedEntityLoader<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly queryContext: EntityQueryContext,
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly dataManager: EntityDataManager<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
    public readonly utils: EntityLoaderUtils<
      TFields,
      TIDField,
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
   * @returns map from compositeField to entity results that match the query for that compositeField,
   *          where result errors can be UnauthorizedError
   */
  async loadManyByCompositeFieldEqualingManyAsync<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    compositeField: N,
    compositeFieldValues: readonly EntityCompositeFieldValue<Pick<TFields, TSelectedFields>, N>[],
  ): Promise<ReadonlyMap<EntityCompositeFieldValue<TFields, N>, readonly Result<TEntity>[]>> {
    const { compositeFieldHolder, compositeFieldValueHolders } =
      this.validateCompositeFieldAndValuesAndConvertToHolders(compositeField, compositeFieldValues);

    const compositeFieldValuesToFieldObjects = await this.dataManager.loadManyEqualingAsync(
      this.queryContext,
      compositeFieldHolder,
      compositeFieldValueHolders,
    );

    return await this.constructAndAuthorizeEntitiesFromCompositeFieldValueHolderMapAsync(
      compositeFieldValuesToFieldObjects,
    );
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
   * @returns array of entity results that match the query for compositeFieldValue, where result error can be UnauthorizedError
   */
  async loadManyByCompositeFieldEqualingAsync<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    compositeField: N,
    compositeFieldValue: EntityCompositeFieldValue<Pick<TFields, TSelectedFields>, N>,
  ): Promise<readonly Result<TEntity>[]> {
    const entityResults = await this.loadManyByCompositeFieldEqualingManyAsync(compositeField, [
      compositeFieldValue,
    ]);
    const entityResultForCompositeFieldValue = entityResults.get(compositeFieldValue);
    invariant(
      entityResultForCompositeFieldValue !== undefined,
      `${compositeFieldValue} should be guaranteed to be present in returned map of entities`,
    );
    return entityResultForCompositeFieldValue;
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
   * @returns entity result where uniqueFieldName equals fieldValue, where result error can be UnauthorizedError.
   */
  async loadByCompositeFieldEqualingAsync<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    compositeField: N,
    compositeFieldValue: EntityCompositeFieldValue<Pick<TFields, TSelectedFields>, N>,
  ): Promise<Result<TEntity> | null> {
    const entityResults = await this.loadManyByCompositeFieldEqualingAsync(
      compositeField,
      compositeFieldValue,
    );
    invariant(
      entityResults.length <= 1,
      `loadByCompositeFieldEqualing: Multiple entities of type ${this.entityClass.name} found for composite field (${compositeField.join(',')})=${JSON.stringify(compositeFieldValue)}`,
    );
    return entityResults[0] ?? null;
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns entity result for matching ID, where result error can be UnauthorizedError or EntityNotFoundError.
   */
  async loadByIDAsync(id: TFields[TIDField]): Promise<Result<TEntity>> {
    const entityResults = await this.loadManyByIDsAsync([id]);
    // loadManyByIDsAsync is always populated for each id supplied
    return nullthrows(entityResults.get(id));
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns entity result for matching ID, or null if no entity exists for ID.
   */
  async loadByIDNullableAsync(id: TFields[TIDField]): Promise<Result<TEntity> | null> {
    return await this.loadByFieldEqualingAsync(
      this.entityConfiguration.idField as TSelectedFields,
      id,
    );
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns map from ID to corresponding entity result, where result error can be UnauthorizedError or EntityNotFoundError.
   */
  async loadManyByIDsAsync(
    ids: readonly TFields[TIDField][],
  ): Promise<ReadonlyMap<TFields[TIDField], Result<TEntity>>> {
    const entityResults = (await this.loadManyByFieldEqualingManyAsync(
      this.entityConfiguration.idField as TSelectedFields,
      ids,
    )) as ReadonlyMap<TFields[TIDField], readonly Result<TEntity>[]>;
    return mapMap(entityResults, (entityResultsForId, id) => {
      const entityResult = entityResultsForId[0];
      return (
        entityResult ??
        result(
          new EntityNotFoundError({
            entityClass: this.entityClass,
            fieldName: this.entityConfiguration.idField,
            fieldValue: id,
          }),
        )
      );
    });
  }

  /**
   * Authorization-result-based version of the EnforcingEntityLoader method by the same name.
   * @returns map from ID to nullable corresponding entity result, where result error can be UnauthorizedError.
   */
  async loadManyByIDsNullableAsync(
    ids: readonly TFields[TIDField][],
  ): Promise<ReadonlyMap<TFields[TIDField], Result<TEntity> | null>> {
    const entityResults = (await this.loadManyByFieldEqualingManyAsync(
      this.entityConfiguration.idField as TSelectedFields,
      ids,
    )) as ReadonlyMap<TFields[TIDField], readonly Result<TEntity>[]>;
    return mapMap(entityResults, (entityResultsForId) => {
      return entityResultsForId[0] ?? null;
    });
  }

  private validateFieldAndValuesAndConvertToHolders<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): {
    loadKey: SingleFieldHolder<TFields, TIDField, N>;
    loadValues: readonly SingleFieldValueHolder<TFields, N>[];
  } {
    this.utils.validateFieldAndValues(fieldName, fieldValues);

    return {
      loadKey: new SingleFieldHolder<TFields, TIDField, N>(fieldName),
      loadValues: fieldValues.map(
        (fieldValue) => new SingleFieldValueHolder<TFields, N>(fieldValue),
      ),
    };
  }

  private validateCompositeFieldAndValuesAndConvertToHolders<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    compositeField: N,
    compositeFieldValues: readonly EntityCompositeFieldValue<TFields, N>[],
  ): {
    compositeFieldHolder: CompositeFieldHolder<TFields, TIDField>;
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[];
  } {
    // validate that the composite field input is defined in the entity configuration
    const compositeFieldHolder =
      this.entityConfiguration.compositeFieldInfo.getCompositeFieldHolderForCompositeField(
        compositeField,
      );
    invariant(
      compositeFieldHolder,
      `must have composite field definition for composite field = ${String(compositeField)}`,
    );

    const cacheableCompositeFieldFieldsSet = compositeFieldHolder.getFieldSet();

    const compositeFieldValueHolders = compositeFieldValues.map(
      (compositeFieldValue) => new CompositeFieldValueHolder(compositeFieldValue),
    );

    // validate that the composite field values are valid
    for (const compositeFieldValueHolder of compositeFieldValueHolders) {
      invariant(
        areSetsEqual(cacheableCompositeFieldFieldsSet, compositeFieldValueHolder.getFieldSet()),
        `composite field values must contain exactly the fields defined in the composite field definition: ${compositeField}`,
      );
      for (const field of compositeField) {
        const fieldValue = compositeFieldValueHolder.compositeFieldValue[field];
        this.utils.validateFieldAndValues(field, [fieldValue]);
      }
    }

    return {
      compositeFieldHolder,
      compositeFieldValueHolders,
    };
  }

  private async constructAndAuthorizeEntitiesFromCompositeFieldValueHolderMapAsync<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    map: ReadonlyMap<CompositeFieldValueHolder<TFields, N>, readonly Readonly<TFields>[]>,
  ): Promise<ReadonlyMap<EntityCompositeFieldValue<TFields, N>, readonly Result<TEntity>[]>> {
    return new CompositeFieldValueMap(
      await Promise.all(
        Array.from(map.entries()).map(async ([compositeFieldValueHolder, fieldObjects]) => {
          return [
            compositeFieldValueHolder,
            await this.utils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects),
          ];
        }),
      ),
    );
  }
}
