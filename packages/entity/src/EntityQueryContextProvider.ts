import {
  EntityTransactionalQueryContext,
  EntityNonTransactionalQueryContext,
  EntityNestedTransactionalQueryContext,
  TransactionConfig,
} from './EntityQueryContext';

/**
 * A query context provider vends transactional and non-transactional query contexts.
 */
export default abstract class EntityQueryContextProvider<
  TQueryInterface = any,
  TTransactionalQueryInterface extends TQueryInterface = any,
> {
  private queryContextCounter: number = 1;

  /**
   * Vend a regular (non-transactional) entity query context.
   */
  public getQueryContext(): EntityNonTransactionalQueryContext<
    TQueryInterface,
    TTransactionalQueryInterface
  > {
    return new EntityNonTransactionalQueryContext(this.getQueryInterface(), this);
  }

  /**
   * Get the query interface for constructing a query context.
   */
  protected abstract getQueryInterface(): TQueryInterface;

  /**
   * @returns true if the query interface is a transaction that is already completed.
   */
  public abstract isQueryInterfaceTransactionAndCompleted(queryInterface: TQueryInterface): boolean;

  /**
   * @returns true if the transactional dataloader should be disabled for all transactions.
   */
  protected shouldDisableTransactionalDataloaderForAllTransactions(): boolean {
    return false;
  }

  /**
   * Vend a transaction runner for use in runInTransactionAsync.
   */
  protected abstract createTransactionRunner<T>(
    transactionConfig?: TransactionConfig,
  ): (transactionScope: (queryInterface: TTransactionalQueryInterface) => Promise<T>) => Promise<T>;

  protected abstract createNestedTransactionRunner<T>(
    outerQueryInterface: TTransactionalQueryInterface,
  ): (transactionScope: (queryInterface: TTransactionalQueryInterface) => Promise<T>) => Promise<T>;

  /**
   * Start a transaction and execute the provided transaction-scoped closure within the transaction.
   * @param transactionScope - async callback to execute within the transaction
   */
  async runInTransactionAsync<T>(
    transactionScope: (
      queryContext: EntityTransactionalQueryContext<TQueryInterface, TTransactionalQueryInterface>,
    ) => Promise<T>,
    transactionConfig?: TransactionConfig,
  ): Promise<T> {
    const [returnedValue, queryContext] = await this.createTransactionRunner<
      [T, EntityTransactionalQueryContext<TQueryInterface, TTransactionalQueryInterface>]
    >(transactionConfig)(async (queryInterface) => {
      const queryContext = new EntityTransactionalQueryContext<
        TQueryInterface,
        TTransactionalQueryInterface
      >(
        queryInterface,
        this,
        String(this.queryContextCounter++),
        transactionConfig?.disableTransactionalDataloader ??
          this.shouldDisableTransactionalDataloaderForAllTransactions(),
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
    outerQueryContext: EntityTransactionalQueryContext<
      TQueryInterface,
      TTransactionalQueryInterface
    >,
    transactionScope: (
      innerQueryContext: EntityNestedTransactionalQueryContext<
        TQueryInterface,
        TTransactionalQueryInterface
      >,
    ) => Promise<T>,
  ): Promise<T> {
    const [returnedValue, innerQueryContext] = await this.createNestedTransactionRunner<
      [T, EntityNestedTransactionalQueryContext<TQueryInterface, TTransactionalQueryInterface>]
    >(outerQueryContext.getQueryInterface())(async (innerQueryInterface) => {
      const innerQueryContext = new EntityNestedTransactionalQueryContext(
        innerQueryInterface,
        outerQueryContext,
        this,
        String(this.queryContextCounter++),
        outerQueryContext.shouldDisableTransactionalDataloader,
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
