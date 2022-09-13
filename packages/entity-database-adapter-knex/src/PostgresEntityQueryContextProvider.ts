import { EntityQueryContextProvider } from '@expo/entity';
import { Knex } from 'knex';

/**
 * Query context provider for knex (postgres).
 */
export default class PostgresEntityQueryContextProvider extends EntityQueryContextProvider {
  constructor(private readonly knexInstance: Knex) {
    super();
  }

  protected getQueryInterface(): any {
    return this.knexInstance;
  }

  protected createTransactionRunner<T>(): (
    transactionScope: (trx: any) => Promise<T>
  ) => Promise<T> {
    return (transactionScope) => this.knexInstance.transaction(transactionScope);
  }

  protected createNestedTransactionRunner<T>(
    outerQueryInterface: any
  ): (transactionScope: (queryInterface: any) => Promise<T>) => Promise<T> {
    return (transactionScope) => (outerQueryInterface as Knex).transaction(transactionScope);
  }
}
