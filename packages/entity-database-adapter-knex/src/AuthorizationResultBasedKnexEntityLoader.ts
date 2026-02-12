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
  OrderByOrdering,
} from './BasePostgresEntityDatabaseAdapter';
import { BaseSQLQueryBuilder } from './BaseSQLQueryBuilder';
import { SQLFragment } from './SQLOperator';
import { EntityKnexDataManager } from './internal/EntityKnexDataManager';

export interface EntityLoaderOrderByClause<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> {
  /**
   * The field name to order by.
   */
  fieldName: TSelectedFields;

  /**
   * The OrderByOrdering to order by.
   */
  order: OrderByOrdering;
}

/**
 * SQL modifiers that only affect the selection but not the projection.
 */
export interface EntityLoaderQuerySelectionModifiers<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> {
  /**
   * Order the entities by specified columns and orders.
   */
  orderBy?: readonly EntityLoaderOrderByClause<TFields, TSelectedFields>[];

  /**
   * Skip the specified number of entities queried before returning.
   */
  offset?: number;

  /**
   * Limit the number of entities returned.
   */
  limit?: number;
}

export interface EntityLoaderQuerySelectionModifiersWithOrderByRaw<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> extends EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> {
  /**
   * Order the entities by a raw SQL `ORDER BY` clause.
   */
  orderByRaw?: string;
}

export interface EntityLoaderQuerySelectionModifiersWithOrderByFragment<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> extends EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> {
  /**
   * Order the entities by a SQL fragment `ORDER BY` clause.
   */
  orderByFragment?: SQLFragment;
}

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
    private readonly constructionUtils: EntityConstructionUtils<
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
    querySelectionModifiers: Omit<
      EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields>,
      'limit'
    > &
      Required<Pick<EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields>, 'orderBy'>>,
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
    querySelectionModifiers: EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> = {},
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
    querySelectionModifiers: EntityLoaderQuerySelectionModifiersWithOrderByRaw<
      TFields,
      TSelectedFields
    > = {},
  ): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.knexDataManager.loadManyByRawWhereClauseAsync(
      this.queryContext,
      rawWhereClause,
      bindings,
      querySelectionModifiers,
    );
    return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }

  /**
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
   * @returns SQL query builder for building and executing SQL queries that when executed returns entity results where result error can be UnauthorizedError.
   */
  loadManyBySQL(
    fragment: SQLFragment,
    modifiers: EntityLoaderQuerySelectionModifiersWithOrderByFragment<
      TFields,
      TSelectedFields
    > = {},
  ): AuthorizationResultBasedSQLQueryBuilder<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new AuthorizationResultBasedSQLQueryBuilder(
      this.knexDataManager,
      this.constructionUtils,
      this.queryContext,
      fragment,
      modifiers,
    );
  }
}

/**
 * SQL query builder implementation for AuthorizationResultBasedKnexEntityLoader.
 */
export class AuthorizationResultBasedSQLQueryBuilder<
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
> extends BaseSQLQueryBuilder<TFields, TSelectedFields, Result<TEntity>> {
  constructor(
    private readonly knexDataManager: EntityKnexDataManager<TFields, TIDField>,
    private readonly constructionUtils: EntityConstructionUtils<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly queryContext: EntityQueryContext,
    sqlFragment: SQLFragment,
    modifiers: EntityLoaderQuerySelectionModifiersWithOrderByFragment<TFields, TSelectedFields>,
  ) {
    super(sqlFragment, modifiers);
  }

  /**
   * Execute the query and return results.
   */
  async executeInternalAsync(): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.knexDataManager.loadManyBySQLFragmentAsync(
      this.queryContext,
      this.getSQLFragment(),
      this.getModifiers(),
    );
    return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }
}
