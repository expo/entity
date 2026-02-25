import {
  EntityLoaderOrderByClause,
  EntityLoaderQuerySelectionModifiers,
} from './AuthorizationResultBasedKnexEntityLoader';
import { NullsOrdering, OrderByOrdering } from './BasePostgresEntityDatabaseAdapter';
import { SQLFragment } from './SQLOperator';

/**
 * Base SQL query builder that provides common functionality for building SQL queries.
 */
export abstract class BaseSQLQueryBuilder<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
  TResultType,
> {
  private executed = false;

  constructor(
    private readonly sqlFragment: SQLFragment,
    private readonly modifiers: {
      limit?: number;
      offset?: number;
      orderBy?: readonly EntityLoaderOrderByClause<TFields, TSelectedFields>[];
    },
  ) {}

  /**
   * Limit the number of results
   */
  limit(n: number): this {
    this.modifiers.limit = n;
    return this;
  }

  /**
   * Skip a number of results
   */
  offset(n: number): this {
    this.modifiers.offset = n;
    return this;
  }

  /**
   * Order by a field. Can be called multiple times to add multiple order bys.
   */
  orderBy(
    fieldName: TSelectedFields,
    order: OrderByOrdering = OrderByOrdering.ASCENDING,
    nulls: NullsOrdering | undefined = undefined,
  ): this {
    this.modifiers.orderBy = [...(this.modifiers.orderBy ?? []), { fieldName, order, nulls }];
    return this;
  }

  /**
   * Order by a SQL fragment expression.
   * Provides type-safe, parameterized ORDER BY clauses
   *
   * @example
   * ```ts
   * query.orderByFragment(
   *   sql`(data->>'createdAt')::timestamp`,
   *   OrderByOrdering.DESCENDING,
   * );
   * // Generates ORDER BY clause that orders by the createdAt field in the JSONB data column, cast to a timestamp, in descending order.
   * // Note that the SQL fragment is parameterized, so it is safe from SQL injection.
   * // The generated SQL would look like: ORDER BY (data->>'createdAt')::timestamp DESC
   * ```
   *
   * @param fragment - The SQL fragment to order by. Must not include the ASC/DESC keyword, as ordering direction is determined by the `order` parameter.
   * @param order - The ordering direction (ascending or descending). Defaults to ascending.
   */
  orderBySQL(
    fragment: SQLFragment,
    order: OrderByOrdering = OrderByOrdering.ASCENDING,
    nulls: NullsOrdering | undefined = undefined,
  ): this {
    this.modifiers.orderBy = [
      ...(this.modifiers.orderBy ?? []),
      { fieldFragment: fragment, order, nulls },
    ];
    return this;
  }

  /**
   * Get the current modifiers as QuerySelectionModifiersWithOrderByFragment<TFields>
   */
  protected getModifiers(): EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> {
    return this.modifiers;
  }

  /**
   * Get the SQL fragment
   */
  protected getSQLFragment(): SQLFragment {
    return this.sqlFragment;
  }

  /**
   * Execute the query and return results.
   * Implementation depends on the specific loader type.
   */
  public async executeAsync(): Promise<readonly TResultType[]> {
    if (this.executed) {
      throw new Error(
        'Query has already been executed. Create a new query builder to execute again.',
      );
    }
    this.executed = true;
    return await this.executeInternalAsync();
  }

  protected abstract executeInternalAsync(): Promise<readonly TResultType[]>;
}
