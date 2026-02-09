import { AuthorizationResultBasedEntityLoader } from './AuthorizationResultBasedEntityLoader';
import { EntityCompositeField, EntityCompositeFieldValue } from './EntityConfiguration';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';
import { CompositeFieldValueHolder } from './internal/CompositeFieldHolder';
import { CompositeFieldValueMap } from './internal/CompositeFieldValueMap';
import { mapMap } from './utils/collections/maps';

/**
 * Enforcing entity loader. All normal loads are batched,
 * cached, and authorized against the entity's EntityPrivacyPolicy. All loads
 * through this loader will throw if the load is not successful.
 */
export class EnforcingEntityLoader<
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
    private readonly entityLoader: AuthorizationResultBasedEntityLoader<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Load many entities where fieldName is one of fieldValues.
   * @param fieldName - entity field being queried
   * @param fieldValues - fieldName field values being queried
   * @returns map from fieldValue to entities that match the query for that fieldValue
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByFieldEqualingManyAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly TEntity[]>> {
    const fieldValuesToResults = await this.entityLoader.loadManyByFieldEqualingManyAsync(
      fieldName,
      fieldValues,
    );
    return mapMap(fieldValuesToResults, (results) =>
      results.map((result) => result.enforceValue()),
    );
  }

  /**
   * Load many entities where compositeField is one of compositeFieldValues.
   * @param compositeField - composite field being queried
   * @param compositeFieldValues - compositeField values being queried
   * @returns map from compositeFieldValue to entities that match the query for that compositeFieldValue
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByCompositeFieldEqualingManyAsync<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    compositeField: N,
    compositeFieldValues: readonly EntityCompositeFieldValue<Pick<TFields, TSelectedFields>, N>[],
  ): Promise<ReadonlyMap<EntityCompositeFieldValue<TFields, N>, readonly TEntity[]>> {
    const compositeFieldValuesToResults =
      await this.entityLoader.loadManyByCompositeFieldEqualingManyAsync(
        compositeField,
        compositeFieldValues,
      );

    return new CompositeFieldValueMap(
      Array.from(compositeFieldValuesToResults.entries()).map(([compositeFieldValue, results]) => {
        return [
          new CompositeFieldValueHolder(compositeFieldValue),
          results.map((result) => result.enforceValue()),
        ];
      }),
    );
  }

  /**
   * Load many entities where fieldName equals fieldValue.
   * @param fieldName - entity field being queried
   * @param fieldValue - fieldName field value being queried
   * @returns array of entities that match the query for fieldValue
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>,
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.entityLoader.loadManyByFieldEqualingAsync(
      fieldName,
      fieldValue,
    );
    return entityResults.map((result) => result.enforceValue());
  }

  /**
   * Load many entities where compositeField equals compositeFieldValue.
   * @param compositeField - composite field being queried
   * @param compositeFieldValue - compositeField value being queried
   * @returns array of entities that match the query for compositeFieldValue
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByCompositeFieldEqualingAsync<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    compositeField: N,
    compositeFieldValue: EntityCompositeFieldValue<Pick<TFields, TSelectedFields>, N>,
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.entityLoader.loadManyByCompositeFieldEqualingAsync(
      compositeField,
      compositeFieldValue,
    );
    return entityResults.map((result) => result.enforceValue());
  }

  /**
   * Load an entity where fieldName equals fieldValue, or null if no entity exists.
   * @param uniqueFieldName - entity field being queried
   * @param fieldValue - uniqueFieldName field value being queried
   * @returns entity where uniqueFieldName equals fieldValue, or null if no entity matches the condition.
   * @throws when multiple entities match the condition
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   */
  async loadByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    uniqueFieldName: N,
    fieldValue: NonNullable<TFields[N]>,
  ): Promise<TEntity | null> {
    const entityResult = await this.entityLoader.loadByFieldEqualingAsync(
      uniqueFieldName,
      fieldValue,
    );
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Load an entity where compositeField equals compositeFieldValue, or null if no entity exists.
   * @param compositeField - composite field being queried
   * @param compositeFieldValue - compositeField value being queried
   * @returns entity where compositeField equals compositeFieldValue, or null if no entity matches the condition.
   * @throws when multiple entities match the condition
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   */
  async loadByCompositeFieldEqualingAsync<
    N extends EntityCompositeField<Pick<TFields, TSelectedFields>>,
  >(
    compositeField: N,
    compositeFieldValue: EntityCompositeFieldValue<Pick<TFields, TSelectedFields>, N>,
  ): Promise<TEntity | null> {
    const entityResult = await this.entityLoader.loadByCompositeFieldEqualingAsync(
      compositeField,
      compositeFieldValue,
    );
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Loads an entity by a specified ID.
   * @param id - ID of the entity
   * @returns entity matching ID
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   * @throws EntityNotFoundError when no entity exists for ID
   */
  async loadByIDAsync(id: TFields[TIDField]): Promise<TEntity> {
    const entityResult = await this.entityLoader.loadByIDAsync(id);
    return entityResult.enforceValue();
  }

  /**
   * Load an entity by a specified ID, or return null if non-existent.
   * @param id - ID of the entity
   * @returns entity for matching ID, or null if no entity exists for ID.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   * @throws when multiple entities are found matching the condition
   */
  async loadByIDNullableAsync(id: TFields[TIDField]): Promise<TEntity | null> {
    const entityResult = await this.entityLoader.loadByIDNullableAsync(id);
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Loads many entities for a list of IDs.
   * @param ids - IDs of the entities to load
   * @returns map from ID to corresponding entity result, where result error can be UnauthorizedError or EntityNotFoundError.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   * @throws EntityNotFoundError when no entity exists for one or more of the IDs
   */
  async loadManyByIDsAsync(
    ids: readonly TFields[TIDField][],
  ): Promise<ReadonlyMap<TFields[TIDField], TEntity>> {
    const entityResults = await this.entityLoader.loadManyByIDsAsync(ids);
    return mapMap(entityResults, (result) => result.enforceValue());
  }

  /**
   * Loads many entities for a list of IDs, returning null for any IDs that are non-existent.
   * @param ids - IDs of the entities to load
   * @returns map from ID to nullable corresponding entity
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByIDsNullableAsync(
    ids: readonly TFields[TIDField][],
  ): Promise<ReadonlyMap<TFields[TIDField], TEntity | null>> {
    const entityResults = await this.entityLoader.loadManyByIDsNullableAsync(ids);
    return mapMap(entityResults, (result) => result?.enforceValue() ?? null);
  }
}
