import {
  OrderByOrdering,
  QuerySelectionModifiersWithOrderByFragment,
} from './BasePostgresEntityDatabaseAdapter';
import { SQLFragment } from './SQLOperator';

/**
 * Base SQL query builder that provides common functionality for building SQL queries.
 */
export abstract class BaseSQLQueryBuilder<TFields extends Record<string, any>, TResultType> {
  private executed = false;

  constructor(
    private readonly sqlFragment: SQLFragment,
    private readonly modifiers: {
      limit?: number;
      offset?: number;
      orderBy?: { fieldName: keyof TFields; order: OrderByOrdering }[];
      orderByFragment?: SQLFragment;
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
  orderBy(fieldName: keyof TFields, order: OrderByOrdering = OrderByOrdering.ASCENDING): this {
    this.modifiers.orderBy = [...(this.modifiers.orderBy ?? []), { fieldName, order }];
    return this;
  }

  /**
   * Order by a SQL fragment expression.
   * Provides type-safe, parameterized ORDER BY clauses
   *
   * @example
   * ```ts
   * import { sql, raw } from '@expo/entity-database-adapter-knex';
   *
   * // Safe parameterized ordering
   * .orderBySQL(sql`CASE WHEN priority = ${1} THEN 0 ELSE 1 END, created_at DESC`)
   *
   * // Dynamic column ordering
   * const sortColumn = 'name';
   * .orderBySQL(sql`${raw(sortColumn)} DESC NULLS LAST`)
   *
   * // Complex expressions
   * .orderBySQL(sql`array_length(tags, 1) DESC, score * ${multiplier} ASC`)
   * ```
   */
  orderBySQL(fragment: SQLFragment): this {
    this.modifiers.orderByFragment = fragment;
    return this;
  }

  /**
   * Get the current modifiers as QuerySelectionModifiersWithOrderByFragment<TFields>
   */
  protected getModifiers(): QuerySelectionModifiersWithOrderByFragment<TFields> {
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
