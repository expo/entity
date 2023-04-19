import {
  EntityTransactionalQueryContext,
  EntityNonTransactionalQueryContext,
  EntityNestedTransactionalQueryContext,
  TransactionConfig,
} from './EntityQueryContext';

/**
 * A query context provider vends transactional and non-transactional query contexts.
 */
export default abstract class EntityQueryContextProvider {
  /**
   * Vend a regular (non-transactional) entity query context.
   */
  public getQueryContext(): EntityNonTransactionalQueryContext {
    return new EntityNonTransactionalQueryContext(this.getQueryInterface(), this);
  }

  /**
   * Get the query interface for constructing a query context.
   */
  protected abstract getQueryInterface(): any;

  /**
   * Vend a transaction runner for use in runInTransactionAsync.
   */
  protected abstract createTransactionRunner<T>(
    transactionConfig?: TransactionConfig
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T>;

  protected abstract createNestedTransactionRunner<T>(
    outerQueryInterface: any,
    transactionConfig?: TransactionConfig
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T>;

  /**
   * Start a transaction and execute the provided transaction-scoped closure within the transaction.
   * @param transactionScope - async callback to execute within the transaction
   */
  async runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>,
    transactionConfig?: TransactionConfig
  ): Promise<T> {
    const [returnedValue, queryContext] = await this.createTransactionRunner<
      [T, EntityTransactionalQueryContext]
    >(transactionConfig)(async (queryInterface) => {
      const queryContext = new EntityTransactionalQueryContext(queryInterface, this);
      const result = await transactionScope(queryContext);
      await queryContext.runPreCommitCallbacksAsync();
      return [result, queryContext];
    });
    await queryContext.runPostCommitCallbacksAsync();
    return returnedValue;
  }

  /**
   * Start a nested transaction from the specified parent transaction and execure the
   * provided nested-transaction-scoped closure within the nested transaction.
   * @param outerQueryContext - the query context of the parent transaction
   * @param transactionScope - async callback to execute within the nested transaction
   */
  async runInNestedTransactionAsync<T>(
    outerQueryContext: EntityTransactionalQueryContext,
    transactionScope: (innerQueryContext: EntityNestedTransactionalQueryContext) => Promise<T>,
    transactionConfig?: TransactionConfig
  ): Promise<T> {
    const [returnedValue, innerQueryContext] = await this.createNestedTransactionRunner<
      [T, EntityNestedTransactionalQueryContext]
    >(
      outerQueryContext.getQueryInterface(),
      transactionConfig
    )(async (innerQueryInterface) => {
      const innerQueryContext = new EntityNestedTransactionalQueryContext(
        innerQueryInterface,
        outerQueryContext,
        this
      );
      const result = await transactionScope(innerQueryContext);
      await innerQueryContext.runPreCommitCallbacksAsync();
      return [result, innerQueryContext];
    });
    // post-commit callbacks are appended to parent transaction instead of run, but only after the transaction has succeeded
    innerQueryContext.transferPostCommitCallbacksToParent();
    return returnedValue;
  }
}
