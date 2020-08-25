import {
  EntityTransactionalQueryContext,
  EntityNonTransactionalQueryContext,
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
   * Vend a transaction runner for use in {@link runInTransactionAsync}.
   */
  protected abstract createTransactionRunner<T>(): (
    transactionScope: (queryInterface: any) => Promise<T>
  ) => Promise<T>;

  /**
   * Start a transaction and execute the provided transaction-scoped closure within the transaction.
   * @param transactionScope - async callback to execute within the transaction
   */
  async runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T> {
    const [returnedValue, queryContext] = await this.createTransactionRunner<
      [T, EntityTransactionalQueryContext]
    >()(async (queryInterface) => {
      const queryContext = new EntityTransactionalQueryContext(queryInterface);
      const result = await transactionScope(queryContext);
      return [result, queryContext];
    });
    await queryContext.runPostCommitCallbacksAsync();
    return returnedValue;
  }
}
