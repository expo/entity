import {
  EntityConstructionUtils,
  EntityPrivacyPolicy,
  EntityQueryContext,
  ReadonlyEntity,
  ViewerContext,
  IEntityMetricsAdapter,
} from '@expo/entity';
import { Result } from '@expo/results';

import {
  FieldEqualityCondition,
  isSingleValueFieldEqualityCondition,
  QuerySelectionModifiers,
  QuerySelectionModifiersWithOrderByRaw,
} from './BasePostgresEntityDatabaseAdapter';
import { EntityKnexDataManager } from './internal/EntityKnexDataManager';

/**
 * Authorization-result-based knex entity loader for non-data-loader-based load methods.
 * All loads through this loader are results (or null for some loader methods), where an
 * unsuccessful result means an authorization error or entity construction error occurred.
 * Other errors are thrown.
 */
export class AuthorizationResultBasedKnexEntityLoader<
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
    private readonly knexDataManager: EntityKnexDataManager<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
    public readonly constructionUtils: EntityConstructionUtils<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
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
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
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
      this.constructionUtils.validateFieldAndValues(fieldEqualityOperand.fieldName, fieldValues);
    }

    const fieldObjects = await this.knexDataManager.loadManyByFieldEqualityConjunctionAsync(
      this.queryContext,
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }

  /**
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   * @throws Error when rawWhereClause or bindings are invalid
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields> = {},
  ): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.knexDataManager.loadManyByRawWhereClauseAsync(
      this.queryContext,
      rawWhereClause,
      bindings,
      querySelectionModifiers,
    );
    return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }
}
