import {
  EntityNonTransactionalQueryContext,
  EntityTransactionalQueryContext,
} from './EntityQueryContext';

/**
 * A query context provider vends transactional and non-transactional query contexts.
 */
export default interface IEntityQueryContextProvider {
  /**
   * Vend a regular (non-transactional) entity query context.
   */
  getRegularEntityQueryContext(): EntityNonTransactionalQueryContext;

  /**
   * Start a transaction and execute the provided transaction-scoped closure within the transaction.
   * @param transactionScope - async callback to execute within the transaction
   */
  runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T>;
}
