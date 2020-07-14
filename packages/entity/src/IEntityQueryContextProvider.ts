import {
  EntityTransactionalQueryContext,
  EntityNonTransactionalQueryContext,
} from './EntityQueryContext';

/**
 * A query context provider vends transactional and non-transactional query contexts.
 */
export default interface IEntityQueryContextProvider {
  /**
   * Vend an entity query context.
   */
  getQueryContext(): EntityNonTransactionalQueryContext;

  /**
   * Start a transaction and execute the provided transaction-scoped closure within the transaction.
   * @param transactionScope - async callback to execute within the transaction
   */
  runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T>;
}
