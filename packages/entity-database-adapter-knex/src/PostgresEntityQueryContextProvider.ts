import {
  IEntityQueryContextProvider,
  EntityNonTransactionalQueryContext,
  EntityTransactionalQueryContext,
} from '@expo/entity';
import Knex from 'knex';

/**
 * Query context provider for knex (postgres).
 */
export default class PostgresEntityQueryContextProvider implements IEntityQueryContextProvider {
  constructor(private readonly knexInstance: Knex) {}

  getRegularEntityQueryContext(): EntityNonTransactionalQueryContext {
    return new EntityNonTransactionalQueryContext(this.knexInstance);
  }

  async runInTransactionAsync<T>(
    transactionScope: (queryContext: EntityTransactionalQueryContext) => Promise<T>
  ): Promise<T> {
    return await this.knexInstance.transaction(async (trx) => {
      return await transactionScope(new EntityTransactionalQueryContext(trx));
    });
  }
}
