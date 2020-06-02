import { FieldEqualityCondition, QuerySelectionModifiers } from './EntityDatabaseAdapter';
import EntityLoader from './EntityLoader';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import { mapMap } from './utils/collections/maps';

/**
 * Enforcing view on an entity loader. All loads through this loader will throw
 * if the loads are not successful.
 */
export default class EnforcingEntityLoader<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>,
  TPrivacyPolicy extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity>
> {
  constructor(
    private readonly entityLoader: EntityLoader<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy
    >
  ) {}

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws {@link EntityNotAuthorizedError} when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByFieldEqualingManyAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly TEntity[]>> {
    const fieldValuesToResults = await this.entityLoader.loadManyByFieldEqualingManyAsync(
      fieldName,
      fieldValues
    );
    return mapMap(fieldValuesToResults, (results) =>
      results.map((result) => result.enforceValue())
    );
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws {@link EntityNotAuthorizedError} when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByFieldEqualingAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.entityLoader.loadManyByFieldEqualingAsync(
      fieldName,
      fieldValue
    );
    return entityResults.map((result) => result.enforceValue());
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws {@link EntityNotAuthorizedError} when viewer is not authorized to view the returned entity
   * @throws when multiple entities are found matching the condition
   */
  async loadByFieldEqualingAsync<N extends keyof TFields>(
    uniqueFieldName: N,
    fieldValue: NonNullable<TFields[N]>
  ): Promise<TEntity | null> {
    const entityResult = await this.entityLoader.loadByFieldEqualingAsync(
      uniqueFieldName,
      fieldValue
    );
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws {@link EntityNotAuthorizedError} when viewer is not authorized to view the returned entity
   */
  async loadByIDAsync(id: TID): Promise<TEntity> {
    const entityResult = await this.entityLoader.loadByIDAsync(id);
    return entityResult.enforceValue();
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws {@link EntityNotAuthorizedError} when viewer is not authorized to view the returned entity
   * @throws when multiple entities are found matching the condition
   */
  async loadByIDNullableAsync(id: TID): Promise<TEntity | null> {
    const entityResult = await this.entityLoader.loadByIDNullableAsync(id);
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws {@link EntityNotAuthorizedError} when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByIDsAsync(ids: readonly TID[]): Promise<ReadonlyMap<TID, TEntity>> {
    const entityResults = await this.entityLoader.loadManyByIDsAsync(ids);
    return mapMap(entityResults, (result) => result.enforceValue());
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws {@link EntityNotAuthorizedError} when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {}
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.entityLoader.loadManyByFieldEqualityConjunctionAsync(
      fieldEqualityOperands,
      querySelectionModifiers
    );
    return entityResults.map((result) => result.enforceValue());
  }

  /**
   * Enforcing version of entity loader method by the same name.
   * @throws {@link EntityNotAuthorizedError} when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {}
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.entityLoader.loadManyByRawWhereClauseAsync(
      rawWhereClause,
      bindings,
      querySelectionModifiers
    );
    return entityResults.map((result) => result.enforceValue());
  }
}
