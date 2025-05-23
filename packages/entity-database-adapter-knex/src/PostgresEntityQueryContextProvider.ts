import {
  EntityQueryContextProvider,
  TransactionConfig,
  TransactionIsolationLevel,
} from '@expo/entity';
import { Knex } from 'knex';

/**
 * Query context provider for knex (postgres).
 */
export default class PostgresEntityQueryContextProvider extends EntityQueryContextProvider<
  Knex,
  Knex.Transaction
> {
  constructor(private readonly knexInstance: Knex) {
    super();
  }

  protected getQueryInterface(): Knex {
    return this.knexInstance;
  }

  public isQueryInterfaceTransactionAndCompleted(queryInterface: Knex): boolean {
    return (
      (queryInterface.isTransaction && (queryInterface as Knex.Transaction).isCompleted()) ?? false
    );
  }

  protected createTransactionRunner<T>(
    transactionConfig?: TransactionConfig,
  ): (transactionScope: (trx: Knex.Transaction) => Promise<T>) => Promise<T> {
    return (transactionScope) =>
      this.knexInstance.transaction(
        transactionScope,
        transactionConfig
          ? PostgresEntityQueryContextProvider.convertTransactionConfig(transactionConfig)
          : undefined,
      );
  }

  protected createNestedTransactionRunner<T>(
    outerQueryInterface: Knex.Transaction,
  ): (transactionScope: (queryInterface: Knex.Transaction) => Promise<T>) => Promise<T> {
    return (transactionScope) => outerQueryInterface.transaction(transactionScope);
  }

  private static convertTransactionConfig(
    transactionConfig: TransactionConfig,
  ): Knex.TransactionConfig {
    const convertIsolationLevel = (
      isolationLevel: TransactionIsolationLevel,
    ): Knex.IsolationLevels => {
      switch (isolationLevel) {
        case TransactionIsolationLevel.READ_COMMITTED:
          return 'read committed';
        case TransactionIsolationLevel.REPEATABLE_READ:
          return 'repeatable read';
        case TransactionIsolationLevel.SERIALIZABLE:
          return 'serializable';
      }
    };

    return {
      ...(transactionConfig.isolationLevel
        ? { isolationLevel: convertIsolationLevel(transactionConfig.isolationLevel) }
        : {}),
    };
  }
}
