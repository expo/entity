import AuthorizationResultBasedEntityLoader from './AuthorizationResultBasedEntityLoader';
import {
  FieldEqualityCondition,
  QuerySelectionModifiers,
  QuerySelectionModifiersWithOrderByRaw,
} from './EntityDatabaseAdapter';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import { mapMap } from './utils/collections/maps';

/**
 * Enforcing entity loader. All normal loads are batched,
 * cached, and authorized against the entity's EntityPrivacyPolicy. All loads
 * through this loader will throw if the load is not successful.
 */
export default class EnforcingEntityLoader<
  TFields extends object,
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
    private readonly entityLoader: AuthorizationResultBasedEntityLoader<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Enforcing version of entity loader method by the same name.
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
   * Enforcing version of entity loader method by the same name.
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
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   * @throws when multiple entities are found matching the condition
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
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   */
  async loadByIDAsync(id: TID): Promise<TEntity> {
    const entityResult = await this.entityLoader.loadByIDAsync(id);
    return entityResult.enforceValue();
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   * @throws when multiple entities are found matching the condition
   */
  async loadByIDNullableAsync(id: TID): Promise<TEntity | null> {
    const entityResult = await this.entityLoader.loadByIDNullableAsync(id);
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByIDsAsync(ids: readonly TID[]): Promise<ReadonlyMap<TID, TEntity>> {
    const entityResults = await this.entityLoader.loadManyByIDsAsync(ids);
    return mapMap(entityResults, (result) => result.enforceValue());
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByIDsNullableAsync(ids: readonly TID[]): Promise<ReadonlyMap<TID, TEntity | null>> {
    const entityResults = await this.entityLoader.loadManyByIDsNullableAsync(ids);
    return mapMap(entityResults, (result) => result?.enforceValue() ?? null);
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadFirstByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: Omit<QuerySelectionModifiers<TFields>, 'limit'> &
      Required<Pick<QuerySelectionModifiers<TFields>, 'orderBy'>>,
  ): Promise<TEntity | null> {
    const entityResult = await this.entityLoader.loadFirstByFieldEqualityConjunctionAsync(
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   */
  async loadFirstByFieldEqualingAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>,
  ): Promise<TEntity | null> {
    const entityResult = await this.entityLoader.loadFirstByFieldEqualingAsync(
      fieldName,
      fieldValue,
    );
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {},
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.entityLoader.loadManyByFieldEqualityConjunctionAsync(
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return entityResults.map((result) => result.enforceValue());
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields> = {},
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.entityLoader.loadManyByRawWhereClauseAsync(
      rawWhereClause,
      bindings,
      querySelectionModifiers,
    );
    return entityResults.map((result) => result.enforceValue());
  }
}
