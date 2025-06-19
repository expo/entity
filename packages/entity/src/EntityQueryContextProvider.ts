import { randomUUID } from 'node:crypto';

import {
  EntityNestedTransactionalQueryContext,
  EntityNonTransactionalQueryContext,
  EntityTransactionalQueryContext,
  TransactionConfig,
  TransactionalDataLoaderMode,
} from './EntityQueryContext';

/**
 * A query context provider vends transactional and non-transactional query contexts.
 */
export abstract class EntityQueryContextProvider {
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
   * @returns true if the transactional dataloader should be disabled for all transactions.
   */
  protected defaultTransactionalDataLoaderMode(): TransactionalDataLoaderMode {
    return TransactionalDataLoaderMode.ENABLED;
  }

  /**
   * Vend a transaction runner for use in runInTransactionAsync.
   */
  protected abstract createTransactionRunner<T>(
    transactionConfig?: TransactionConfig,
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T>;

  protected abstract createNestedTransactionRunner<T>(
    outerQueryInterface: any,
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T>;

  /**
   * Start a transaction and execute the provided transaction-scoped closure within the transaction.
   * @param transactionScope - async callback to execute within the transaction
   */
  async runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>,
    transactionConfig?: TransactionConfig,
  ): Promise<T> {
    const [returnedValue, queryContext] = await this.createTransactionRunner<
      [T, EntityTransactionalQueryContext]
    >(transactionConfig)(async (queryInterface) => {
      const queryContext = new EntityTransactionalQueryContext(
        queryInterface,
        this,
        randomUUID(),
        transactionConfig?.transactionalDataLoaderMode ?? this.defaultTransactionalDataLoaderMode(),
      );
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
  ): Promise<T> {
    const [returnedValue, innerQueryContext] = await this.createNestedTransactionRunner<
      [T, EntityNestedTransactionalQueryContext]
    >(outerQueryContext.getQueryInterface())(async (innerQueryInterface) => {
      const innerQueryContext = new EntityNestedTransactionalQueryContext(
        innerQueryInterface,
        outerQueryContext,
        this,
        randomUUID(),
        outerQueryContext.transactionalDataLoaderMode,
      );
      const result = await transactionScope(innerQueryContext);
      await innerQueryContext.runPreCommitCallbacksAsync();
      return [result, innerQueryContext];
    });
    // behavior of this call differs for nested transaction query contexts from regular transaction query contexts
    await innerQueryContext.runPostCommitCallbacksAsync();
    return returnedValue;
  }
}
