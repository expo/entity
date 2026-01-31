import { EntityPrivacyPolicy, ReadonlyEntity, ViewerContext } from '@expo/entity';

import { AuthorizationResultBasedKnexEntityLoader } from './AuthorizationResultBasedKnexEntityLoader';
import {
  FieldEqualityCondition,
  QuerySelectionModifiers,
  QuerySelectionModifiersWithOrderByRaw,
} from './BasePostgresEntityDatabaseAdapter';

/**
 * Enforcing knex entity loader for non-data-loader-based load methods.
 * All loads through this loader will throw if the load is not successful.
 */
export class EnforcingKnexEntityLoader<
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
    private readonly knexEntityLoader: AuthorizationResultBasedKnexEntityLoader<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Load the first entity matching the conjunction of field equality operands and
   * query modifiers.
   *
   * This is a convenience method for {@link loadManyByFieldEqualityConjunctionAsync}. However, the
   * orderBy query modifier is required to ensure consistent results if more than one entity matches
   * the filters.
   *
   * @throws EntityNotAuthorizedError if viewer is not authorized to view the entity
   * @returns the first entity matching the filters, or null if none match
   */
  async loadFirstByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: Omit<QuerySelectionModifiers<TFields>, 'limit'> &
      Required<Pick<QuerySelectionModifiers<TFields>, 'orderBy'>>,
  ): Promise<TEntity | null> {
    const entityResult = await this.knexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return entityResult?.enforceValue() ?? null;
  }

  /**
   * Load entities matching the conjunction of field equality operands and
   * query modifiers.
   *
   * Typically this is used for complex queries that cannot be expressed through simpler
   * convenience methods such as {@link loadManyByFieldEqualingAsync}.
   *
   * @throws EntityNotAuthorizedError if viewer is not authorized to view the entity
   * @returns entities matching the filters
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields> = {},
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.knexEntityLoader.loadManyByFieldEqualityConjunctionAsync(
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return entityResults.map((result) => result.enforceValue());
  }

  /**
   * Load entities with a raw SQL WHERE clause.
   *
   * @example
   * Load entities with SQL function
   * ```typescript
   * const entitiesWithJsonKey = await ExampleEntity.loader(vc)
   *   .loadManyByRawWhereClauseAsync(
   *     "json_column->>'key_name' = ?",
   *     ['value'],
   *   );
   * ```
   *
   * @example
   * Load entities with tuple matching
   * ```typescript
   * const entities = await ExampleEntity.loader(vc)
   *   .loadManyByRawWhereClauseAsync(
   *     '(column_1, column_2) IN ((?, ?), (?, ?))',
   *     [value1, value2, value3, value4],
   *   );
   * ```
   * @param rawWhereClause - SQL WHERE clause. Interpolated values should be specified as ?-placeholders or :key_name
   * @param bindings - values to bind to the placeholders in the WHERE clause
   * @param querySelectionModifiers - limit, offset, and orderBy for the query. If orderBy is specified
   * as orderByRaw, specify as string orderBy SQL clause with uncheckd literal values or ?-placeholders
   * @returns entities matching the WHERE clause
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   * @throws Error when rawWhereClause or bindings are invalid
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields> = {},
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.knexEntityLoader.loadManyByRawWhereClauseAsync(
      rawWhereClause,
      bindings,
      querySelectionModifiers,
    );
    return entityResults.map((result) => result.enforceValue());
  }
}
